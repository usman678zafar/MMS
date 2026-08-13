"use server";

import crypto from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { staff, studentAttendance, studentFees, studentProgresses, students } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { s3Client } from "@/lib/r2";
import { attendanceSchema, feeSchema, objectId, parsePagination, progressSchema, studentNotesSchema, studentSchema } from "@/lib/validation";

const MAX_STUDENT_DOCUMENT_SIZE = 5 * 1024 * 1024;
const STUDENT_DOCUMENT_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

const hasValidDocumentSignature = (type, buffer) => {
  if (type === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return type === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
};

const studentValues = (data) => ({
  name: data.name,
  fatherName: data.father_name,
  religiousClass: data.religious_class,
  contemporaryClass: data.contemporary_class || "None",
  admissionDate: new Date(data.admission_date),
  phone: data.phone,
  address: data.address,
  gender: data.gender,
  monthlyFee: data.monthly_fee,
  teacherId: data.teacher_id ? objectId(data.teacher_id, "teacher id") : null,
  feeStatus: data.fee_status,
  isActive: data.is_active,
});

const dateAtMidnight = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid attendance date");
  date.setHours(0, 0, 0, 0);
  return date;
};

export async function addStudent(studentData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_CREATE);
    const parsed = studentSchema.parse(studentData);
    const now = new Date();
    const currentProgress = { type: parsed.progress_type, para: parsed.progress_para, surah: parsed.progress_surah, ayat: null, last_updated: now.toISOString() };
    const row = await db.transaction(async (tx) => {
      const [student] = await tx.insert(students).values({ ...studentValues(parsed), currentProgress }).returning();
      await tx.insert(studentProgresses).values({ studentId: student.id, teacherId: student.teacherId, type: currentProgress.type, para: currentProgress.para, surah: currentProgress.surah, ayat: null, notes: "Initial enrollment progress", date: now });
      return student;
    });
    return { success: true, data: serializeRow(row) };
  } catch (error) { console.error("addStudent Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateStudent(id, studentData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const [row] = await db.update(students).set({ ...studentValues(studentSchema.parse(studentData)), updatedAt: new Date() }).where(eq(students.id, objectId(id, "student id"))).returning();
    return row ? { success: true, data: serializeRow(row) } : { success: false, error: "Student not found" };
  } catch (error) { console.error("updateStudent Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getStudents(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", status = "", educationClass = "All") {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(students.name, `%${term}%`), ilike(students.fatherName, `%${term}%`), ilike(students.phone, `%${term}%`), ilike(students.address, `%${term}%`)));
    if (["active", "inactive"].includes(status)) filters.push(eq(students.isActive, status === "active"));
    if (educationClass && educationClass !== "All") filters.push(or(eq(students.religiousClass, String(educationClass).slice(0, 50)), eq(students.contemporaryClass, String(educationClass).slice(0, 50))));
    const where = filters.length ? and(...filters) : undefined;
    const [[summary], rows] = await Promise.all([
      db.select({ value: count() }).from(students).where(where),
      db.select({ student: students, teacherName: staff.name }).from(students).leftJoin(staff, eq(staff.id, students.teacherId)).where(where).orderBy(desc(students.createdAt)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    const data = rows.map(({ student, teacherName }) => ({ ...student, teacherName }));
    return formatPaginatedResponse(serializeRows(data), summary.value, pagination.page, pagination.pageSize);
  } catch (error) { console.error("getStudents Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateStudentStatus(id, is_active) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const [row] = await db.update(students).set({ isActive: Boolean(is_active), updatedAt: new Date() }).where(eq(students.id, objectId(id, "student id"))).returning({ id: students.id });
    return row ? { success: true } : { success: false, error: "Student not found" };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteStudent(id) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_DELETE);
    const studentId = objectId(id, "student id");
    const [student] = await db.select({ documents: students.documents, profilePhoto: students.profilePhoto }).from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return { success: false, error: "Student not found" };
    await db.delete(students).where(eq(students.id, studentId));
    if (process.env.R2_BUCKET_NAME) {
      const documents = Array.isArray(student.documents) ? student.documents : [];
      const keys = [student.profilePhoto?.key, ...documents.map((item) => item.key)].filter(Boolean);
      await Promise.allSettled(keys.map((key) => s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))));
    }
    return { success: true };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function updateStudentProgress(studentId, progressData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = progressSchema.parse(progressData);
    const id = objectId(studentId, "student id");
    await db.transaction(async (tx) => {
      const [student] = await tx.select().from(students).where(eq(students.id, id)).limit(1);
      if (!student) throw new Error("Student not found");
      const currentProgress = { type: parsed.type, para: parsed.para, surah_number: parsed.surahNumber || null, surah: parsed.surah, ayat: parsed.ayat || null, last_updated: new Date().toISOString() };
      await tx.update(students).set({ currentProgress, updatedAt: new Date() }).where(eq(students.id, id));
      await tx.insert(studentProgresses).values({ studentId: id, teacherId: student.teacherId, type: parsed.type, para: parsed.para, surahNumber: parsed.surahNumber || null, surah: parsed.surah, ayat: parsed.ayat || null, notes: parsed.notes, date: parsed.month && parsed.year ? new Date(`${parsed.month} 1, ${parsed.year}`) : new Date() });
    });
    return { success: true };
  } catch (error) { console.error("updateStudentProgress Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateFeeStatus(id, fee_status) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!["Paid", "Unpaid"].includes(fee_status)) throw new Error("Invalid fee status");
    const [row] = await db.update(students).set({ feeStatus: fee_status, updatedAt: new Date() }).where(eq(students.id, objectId(id, "student id"))).returning({ id: students.id });
    return row ? { success: true } : { success: false, error: "Student not found" };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function getStudentProgressHistory(studentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const rows = await db.select().from(studentProgresses).where(eq(studentProgresses.studentId, objectId(studentId, "student id"))).orderBy(desc(studentProgresses.date));
    return { success: true, data: serializeRows(rows) };
  } catch (error) { console.error("getStudentProgressHistory Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function recordFeePayment(studentId, feeData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = feeSchema.parse(feeData);
    const id = objectId(studentId, "student id");
    await db.transaction(async (tx) => {
      const [student] = await tx.select({ id: students.id }).from(students).where(eq(students.id, id)).limit(1);
      if (!student) throw new Error("Student not found");
      const values = { studentId: id, amount: parsed.amount, month: parsed.month, year: parsed.year, notes: parsed.notes, date: new Date(), updatedAt: new Date() };
      await tx.insert(studentFees).values(values).onConflictDoUpdate({ target: [studentFees.studentId, studentFees.month, studentFees.year], set: values });
      await tx.update(students).set({ feeStatus: "Paid", lastFeePaid: new Date(), updatedAt: new Date() }).where(eq(students.id, id));
    });
    return { success: true };
  } catch (error) { console.error("recordFeePayment Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteFeePayment(studentId, month, year) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const id = objectId(studentId, "student id");
    const period = feeSchema.pick({ month: true, year: true }).parse({ month, year });
    await db.transaction(async (tx) => {
      await tx.delete(studentFees).where(and(eq(studentFees.studentId, id), eq(studentFees.month, period.month), eq(studentFees.year, period.year)));
      const [row] = await tx.update(students).set({ feeStatus: "Unpaid", updatedAt: new Date() }).where(eq(students.id, id)).returning({ id: students.id });
      if (!row) throw new Error("Student not found");
    });
    return { success: true };
  } catch (error) { console.error("deleteFeePayment Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteBulkFeePayments(studentIds, month, year) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!Array.isArray(studentIds) || !studentIds.length || studentIds.length > 500) throw new Error("Invalid student list");
    const ids = studentIds.map((id) => objectId(id, "student id"));
    const period = feeSchema.pick({ month: true, year: true }).parse({ month, year });
    await db.transaction(async (tx) => {
      await tx.delete(studentFees).where(and(inArray(studentFees.studentId, ids), eq(studentFees.month, period.month), eq(studentFees.year, period.year)));
      await tx.update(students).set({ feeStatus: "Unpaid", updatedAt: new Date() }).where(inArray(students.id, ids));
    });
    return { success: true };
  } catch (error) { console.error("deleteBulkFeePayments Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getStudentFeeHistory(studentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const rows = await db.select().from(studentFees).where(eq(studentFees.studentId, objectId(studentId, "student id"))).orderBy(desc(studentFees.date));
    return { success: true, data: serializeRows(rows) };
  } catch (error) { console.error("getStudentFeeHistory Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function recordAttendance(attendanceRecords, dateString = null) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length > 1000) throw new Error("Invalid attendance records");
    const date = dateAtMidnight(dateString || new Date());
    const records = attendanceRecords.map((record) => {
      const parsed = attendanceSchema.parse(record);
      return { studentId: objectId(parsed.student_id, "student id"), status: parsed.status, date, notes: parsed.notes };
    });
    await db.transaction(async (tx) => {
      const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);
      await tx.delete(studentAttendance).where(and(gte(studentAttendance.date, date), lt(studentAttendance.date, nextDay)));
      if (records.length) await tx.insert(studentAttendance).values(records);
    });
    return { success: true };
  } catch (error) { console.error("recordAttendance Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getAttendanceByDate(dateString) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const date = dateAtMidnight(dateString); const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);
    const rows = await db.select().from(studentAttendance).where(and(gte(studentAttendance.date, date), lt(studentAttendance.date, nextDay)));
    return { success: true, data: serializeRows(rows) };
  } catch (error) { console.error("getAttendanceByDate Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

async function attendanceStats(studentId) {
  const rows = await db.select({ status: studentAttendance.status, value: count() }).from(studentAttendance).where(eq(studentAttendance.studentId, studentId)).groupBy(studentAttendance.status);
  return rows.reduce((result, row) => ({ ...result, [row.status.toLowerCase()]: row.value }), { present: 0, absent: 0, late: 0, leave: 0 });
}

export async function getStudentAttendanceReport(studentId) {
  try { await requirePermission(PERMISSIONS.STUDENTS_VIEW); return { success: true, data: await attendanceStats(objectId(studentId, "student id")) }; }
  catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteProgressHistory(entryId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const [row] = await db.delete(studentProgresses).where(eq(studentProgresses.id, objectId(entryId, "progress id"))).returning({ id: studentProgresses.id });
    return row ? { success: true } : { success: false, error: "Progress record not found" };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function getMonthlyFeeStatus(month, year) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const period = feeSchema.pick({ month: true, year: true }).parse({ month, year });
    const rows = await db.select({ studentId: studentFees.studentId }).from(studentFees).where(and(eq(studentFees.month, period.month), eq(studentFees.year, period.year)));
    return { success: true, data: Object.fromEntries(rows.map((row) => [row.studentId, true])) };
  } catch (error) { console.error("getMonthlyFeeStatus Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function recordBulkFeePayments(paymentsData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!Array.isArray(paymentsData) || !paymentsData.length || paymentsData.length > 500) throw new Error("Invalid payment list");
    const records = paymentsData.map((data) => { const parsed = feeSchema.parse(data); return { studentId: objectId(data.studentId, "student id"), amount: parsed.amount, month: parsed.month, year: parsed.year, notes: parsed.notes, date: new Date(), updatedAt: new Date() }; });
    const ids = [...new Set(records.map((item) => item.studentId))];
    await db.transaction(async (tx) => {
      const found = await tx.select({ id: students.id }).from(students).where(inArray(students.id, ids));
      if (found.length !== ids.length) throw new Error("One or more students were not found");
      for (const record of records) await tx.insert(studentFees).values(record).onConflictDoUpdate({ target: [studentFees.studentId, studentFees.month, studentFees.year], set: record });
      await tx.update(students).set({ feeStatus: "Paid", lastFeePaid: new Date(), updatedAt: new Date() }).where(inArray(students.id, ids));
    });
    return { success: true };
  } catch (error) { console.error("recordBulkFeePayments Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getStudentProfile(studentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const id = objectId(studentId, "student id");
    const [studentRows, progress, fees, attendance, stats] = await Promise.all([
      db.select({ student: students, teacherName: staff.name, teacherPhone: staff.phone }).from(students).leftJoin(staff, eq(staff.id, students.teacherId)).where(eq(students.id, id)).limit(1),
      db.select().from(studentProgresses).where(eq(studentProgresses.studentId, id)).orderBy(desc(studentProgresses.date), desc(studentProgresses.createdAt)).limit(100),
      db.select().from(studentFees).where(eq(studentFees.studentId, id)).orderBy(desc(studentFees.date), desc(studentFees.year)).limit(120),
      db.select().from(studentAttendance).where(eq(studentAttendance.studentId, id)).orderBy(desc(studentAttendance.date)).limit(365),
      attendanceStats(id),
    ]);
    if (!studentRows[0]) return { success: false, error: "Student not found" };
    const student = {
      ...studentRows[0].student,
      documents: Array.isArray(studentRows[0].student.documents) ? studentRows[0].student.documents : [],
      teacherName: studentRows[0].teacherName,
      teacherPhone: studentRows[0].teacherPhone,
    };
    const totalAttendance = Object.values(stats).reduce((sum, value) => sum + value, 0);
    const paidTotal = fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    return { success: true, data: { student: serializeRow(student), progress: serializeRows(progress), fees: serializeRows(fees), attendance: serializeRows(attendance), summary: { attendance: stats, attendanceRate: totalAttendance ? Math.round(((stats.present + stats.late) / totalAttendance) * 100) : 0, totalAttendance, paidTotal, paidMonths: fees.length, currentDue: student.feeStatus === "Unpaid" ? Number(student.monthlyFee || 0) : 0 } } };
  } catch (error) { console.error("getStudentProfile Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function recordStudentAttendance(studentId, status, dateString, notes = "") {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = attendanceSchema.parse({ student_id: studentId, status, notes });
    const values = { studentId: objectId(parsed.student_id, "student id"), status: parsed.status, date: dateAtMidnight(dateString), notes: parsed.notes, updatedAt: new Date() };
    await db.insert(studentAttendance).values(values).onConflictDoUpdate({ target: [studentAttendance.studentId, studentAttendance.date], set: values });
    return { success: true };
  } catch (error) { console.error("recordStudentAttendance Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateStudentNotes(studentId, notes) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = studentNotesSchema.parse({ notes });
    const [row] = await db.update(students).set({ profileNotes: parsed.notes, updatedAt: new Date() }).where(eq(students.id, objectId(studentId, "student id"))).returning({ id: students.id });
    return row ? { success: true } : { success: false, error: "Student not found" };
  } catch (error) { console.error("updateStudentNotes Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function uploadStudentDocument(studentId, formData) {
  let uploadedKey;
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("A document is required");
    if (file.size > MAX_STUDENT_DOCUMENT_SIZE) throw new Error("Documents must be 5 MB or smaller");
    const extension = STUDENT_DOCUMENT_TYPES[file.type];
    if (!extension) throw new Error("Only PDF, JPEG, PNG, and WebP documents are allowed");
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) throw new Error("Document storage is not configured");
    const id = objectId(studentId, "student id");
    const [student] = await db.select({ documents: students.documents }).from(students).where(eq(students.id, id)).limit(1);
    if (!student) throw new Error("Student not found");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidDocumentSignature(file.type, buffer)) throw new Error("The document contents do not match its file type");
    const documentId = crypto.randomUUID(); uploadedKey = `student-documents/${studentId}/${documentId}.${extension}`;
    await s3Client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: uploadedKey, Body: buffer, ContentType: file.type }));
    const document = { id: documentId, name: String(file.name || "Student document").slice(0, 200), url: `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${uploadedKey}`, key: uploadedKey, type: file.type, size: file.size, uploaded_at: new Date().toISOString() };
    const documents = Array.isArray(student.documents) ? student.documents : [];
    await db.update(students).set({ documents: [...documents, document], updatedAt: new Date() }).where(eq(students.id, id));
    return { success: true, data: document };
  } catch (error) {
    if (uploadedKey && process.env.R2_BUCKET_NAME) await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: uploadedKey })).catch(() => undefined);
    console.error("uploadStudentDocument Error:", error); return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteStudentDocument(studentId, documentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (typeof documentId !== "string" || !/^[0-9a-f-]{36}$/i.test(documentId)) throw new Error("Invalid document id");
    const id = objectId(studentId, "student id");
    const [student] = await db.select({ documents: students.documents }).from(students).where(eq(students.id, id)).limit(1);
    const documents = Array.isArray(student?.documents) ? student.documents : [];
    const document = documents.find((item) => item.id === documentId);
    if (!document) throw new Error("Document not found");
    await db.update(students).set({ documents: documents.filter((item) => item.id !== documentId), updatedAt: new Date() }).where(eq(students.id, id));
    if (document.key && process.env.R2_BUCKET_NAME) await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: document.key }));
    return { success: true };
  } catch (error) { console.error("deleteStudentDocument Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function uploadStudentPhoto(studentId, formData) {
  let uploadedKey;
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("A profile photo is required");
    if (file.size > 3 * 1024 * 1024) throw new Error("Profile photos must be 3 MB or smaller");
    const extension = STUDENT_DOCUMENT_TYPES[file.type];
    if (!extension || file.type === "application/pdf") throw new Error("Only JPEG, PNG, and WebP profile photos are allowed");
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) throw new Error("Photo storage is not configured");
    const id = objectId(studentId, "student id");
    const [student] = await db.select({ profilePhoto: students.profilePhoto }).from(students).where(eq(students.id, id)).limit(1);
    if (!student) throw new Error("Student not found");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidDocumentSignature(file.type, buffer)) throw new Error("The photo contents do not match its file type");
    uploadedKey = `student-photos/${studentId}/${crypto.randomUUID()}.${extension}`;
    await s3Client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: uploadedKey, Body: buffer, ContentType: file.type }));
    const photo = { url: `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${uploadedKey}`, key: uploadedKey, uploaded_at: new Date().toISOString() };
    await db.update(students).set({ profilePhoto: photo, updatedAt: new Date() }).where(eq(students.id, id));
    if (student.profilePhoto?.key) await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: student.profilePhoto.key })).catch(() => undefined);
    return { success: true, data: photo };
  } catch (error) {
    if (uploadedKey && process.env.R2_BUCKET_NAME) await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: uploadedKey })).catch(() => undefined);
    console.error("uploadStudentPhoto Error:", error); return { success: false, error: getErrorMessage(error) };
  }
}

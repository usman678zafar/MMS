"use server";
import mongoose from "mongoose";
import {
  formatPaginatedResponse,
  PAGINATION_DEFAULTS,
} from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  attendanceSchema,
  escapeRegex,
  feeSchema,
  objectId,
  parsePagination,
  progressSchema,
  studentSchema,
} from "@/lib/validation";

export async function addStudent(studentData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_CREATE);
    const parsed = studentSchema.parse(studentData);
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    const data = {
      ...parsed,
      admission_date: new Date(parsed.admission_date),
      teacher_id: parsed.teacher_id
        ? objectId(parsed.teacher_id, "teacher id")
        : null,
      fee_status: parsed.fee_status,
      current_progress: {
        type: parsed.progress_type,
        para: parsed.progress_para,
        surah: parsed.progress_surah,
        ayat: null,
        last_updated: new Date(),
      },
      created_at: new Date(),
    };

    const history = db.collection("studentprogresses");
    const session = await mongoose.connection.getClient().startSession();
    let sId;
    try {
      await session.withTransaction(async () => {
        const result = await collection.insertOne(data, { session });
        sId = result.insertedId;
        await history.insertOne(
          {
            student_id: sId,
            teacher_id: data.teacher_id,
            type: data.current_progress.type,
            para: data.current_progress.para,
            surah: data.current_progress.surah,
            ayat: data.current_progress.ayat,
            notes: "Initial enrollment progress",
            date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return {
      success: true,
      data: serializeDocument({ ...data, id: sId.toString() }),
    };
  } catch (error) {
    console.error("addStudent Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStudent(id, studentData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = studentSchema.parse(studentData);
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    const updateData = {
      ...parsed,
      admission_date: new Date(parsed.admission_date),
      teacher_id: parsed.teacher_id
        ? objectId(parsed.teacher_id, "teacher id")
        : null,
      updated_at: new Date(),
    };

    const result = await collection.updateOne(
      { _id: objectId(id, "student id") },
      { $set: updateData },
    );
    return result.matchedCount === 1
      ? { success: true, data: serializeDocument(updateData) }
      : { success: false, error: "Student not found" };
  } catch (error) {
    console.error("updateStudent Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudents(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  status = "",
  educationClass = "All",
) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    // Build query
    const filterConditions = [];

    const safeSearch = escapeRegex(search);
    if (safeSearch) {
      filterConditions.push({
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { father_name: { $regex: safeSearch, $options: "i" } },
          { phone: { $regex: safeSearch, $options: "i" } },
          { address: { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    if (status === "active" || status === "inactive") {
      filterConditions.push({ is_active: status === "active" });
    }

    if (educationClass && educationClass !== "All") {
      filterConditions.push({
        $or: [
          { religious_class: escapeRegex(educationClass) },
          { contemporary_class: escapeRegex(educationClass) },
          { class: escapeRegex(educationClass) },
        ],
      });
    }

    const query = filterConditions.length > 0 ? { $and: filterConditions } : {};

    // Get total count
    const totalItems = await collection.countDocuments(query);

    // Get paginated data with teacher join
    const skip = (pagination.page - 1) * pagination.pageSize;
    const limit = pagination.pageSize;

    const data = await collection
      .aggregate([
        { $match: query },
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "staff",
            localField: "teacher_id",
            foreignField: "_id",
            as: "teacher",
          },
        },
        {
          $addFields: {
            teacher_name: { $arrayElemAt: ["$teacher.name", 0] },
            id: { $toString: "$_id" },
          },
        },
        { $project: { teacher: 0 } },
      ])
      .toArray();

    return formatPaginatedResponse(
      serializeDocuments(data),
      totalItems,
      pagination.page,
      pagination.pageSize,
    );
  } catch (error) {
    console.error("getStudents Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStudentStatus(id, is_active) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    const result = await collection.updateOne(
      { _id: objectId(id, "student id") },
      { $set: { is_active: Boolean(is_active), updated_at: new Date() } },
    );
    return result.matchedCount === 1
      ? { success: true }
      : { success: false, error: "Student not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteStudent(id) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_DELETE);
    const db = mongoose.connection.db;
    const studentId = objectId(id, "student id");
    const session = await mongoose.connection.getClient().startSession();
    let deleted = 0;
    try {
      await session.withTransaction(async () => {
        const result = await db
          .collection("students")
          .deleteOne({ _id: studentId }, { session });
        deleted = result.deletedCount;
        if (deleted !== 1) throw new Error("Student not found");
        await Promise.all([
          db.collection("studentfees").deleteMany({ student_id: studentId }, { session }),
          db.collection("studentattendance").deleteMany({ student_id: studentId }, { session }),
          db.collection("studentprogresses").deleteMany({ student_id: studentId }, { session }),
        ]);
      });
    } finally {
      await session.endSession();
    }
    return deleted === 1 ? { success: true } : { success: false, error: "Student not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateStudentProgress(studentId, progressData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = progressSchema.parse(progressData);
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const history = db.collection("studentprogresses");
    const sId = objectId(studentId, "student id");
    const session = await mongoose.connection.getClient().startSession();
    try {
      await session.withTransaction(async () => {
        const student = await students.findOne({ _id: sId }, { session });
        if (!student) throw new Error("Student not found");
        const currentProgress = {
          type: parsed.type,
          para: parsed.para,
          surah_number: parsed.surahNumber || null,
          surah: parsed.surah,
          ayat: parsed.ayat || null,
          last_updated: new Date(),
        };
        await students.updateOne(
          { _id: sId },
          { $set: { current_progress: currentProgress, updated_at: new Date() } },
          { session },
        );
        await history.insertOne(
          {
            student_id: sId,
            teacher_id: student.teacher_id,
            ...currentProgress,
            notes: parsed.notes,
            date:
              parsed.month && parsed.year
                ? new Date(`${parsed.month} 1, ${parsed.year}`)
                : new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return { success: true };
  } catch (error) {
    console.error("updateStudentProgress Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateFeeStatus(id, fee_status) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!["Paid", "Unpaid"].includes(fee_status)) {
      throw new Error("Invalid fee status");
    }
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    const result = await collection.updateOne(
      { _id: objectId(id, "student id") },
      { $set: { fee_status, updated_at: new Date() } },
    );
    return result.matchedCount === 1
      ? { success: true }
      : { success: false, error: "Student not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getStudentProgressHistory(studentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const db = mongoose.connection.db;
    const collection = db.collection("studentprogresses");

    const history = await collection
      .find({
        student_id: objectId(studentId, "student id"),
      })
      .sort({ date: -1 })
      .toArray();

    return {
      success: true,
      data: serializeDocuments(history),
    };
  } catch (error) {
    console.error("getStudentProgressHistory Error:", error);
    return { success: false, error: error.message };
  }
}

export async function recordFeePayment(studentId, feeData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const parsed = feeSchema.parse(feeData);
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");
    const sId = objectId(studentId, "student id");
    const payment = {
      student_id: sId,
      ...parsed,
      date: new Date(),
      updated_at: new Date(),
    };
    const session = await mongoose.connection.getClient().startSession();
    try {
      await session.withTransaction(async () => {
        if (!(await students.findOne({ _id: sId }, { session }))) {
          throw new Error("Student not found");
        }
        await fees.updateOne(
          { student_id: sId, month: parsed.month, year: parsed.year },
          { $set: payment, $setOnInsert: { created_at: new Date() } },
          { upsert: true, session },
        );
        await students.updateOne(
          { _id: sId },
          {
            $set: {
              fee_status: "Paid",
              last_fee_paid: new Date(),
              updated_at: new Date(),
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return { success: true };
  } catch (error) {
    console.error("recordFeePayment Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFeePayment(studentId, month, year) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    const sId = objectId(studentId, "student id");
    const parsedPeriod = feeSchema.pick({ month: true, year: true }).parse({ month, year });
    const session = await mongoose.connection.getClient().startSession();
    try {
      await session.withTransaction(async () => {
        await fees.deleteMany(
          { student_id: sId, month: parsedPeriod.month, year: parsedPeriod.year },
          { session },
        );
        const result = await students.updateOne(
          { _id: sId },
          { $set: { fee_status: "Unpaid", updated_at: new Date() } },
          { session },
        );
        if (result.matchedCount !== 1) throw new Error("Student not found");
      });
    } finally {
      await session.endSession();
    }
    return { success: true };
  } catch (error) {
    console.error("deleteFeePayment Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBulkFeePayments(studentIds, month, year) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    if (!Array.isArray(studentIds) || studentIds.length > 500) {
      throw new Error("Invalid student list");
    }
    const objectIds = studentIds.map((id) => objectId(id, "student id"));
    const parsedPeriod = feeSchema.pick({ month: true, year: true }).parse({ month, year });
    const session = await mongoose.connection.getClient().startSession();
    try {
      await session.withTransaction(async () => {
        await fees.deleteMany(
          {
            student_id: { $in: objectIds },
            month: parsedPeriod.month,
            year: parsedPeriod.year,
          },
          { session },
        );
        await students.updateMany(
          { _id: { $in: objectIds } },
          { $set: { fee_status: "Unpaid", updated_at: new Date() } },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    return { success: true };
  } catch (error) {
    console.error("deleteBulkFeePayments Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentFeeHistory(studentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const db = mongoose.connection.db;
    const collection = db.collection("studentfees");

    const history = await collection
      .find({
        student_id: objectId(studentId, "student id"),
      })
      .sort({ date: -1 })
      .toArray();

    return {
      success: true,
      data: serializeDocuments(history),
    };
  } catch (error) {
    console.error("getStudentFeeHistory Error:", error);
    return { success: false, error: error.message };
  }
}

export async function recordAttendance(attendanceRecords, dateString = null) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length > 1000) {
      throw new Error("Invalid attendance records");
    }
    const db = mongoose.connection.db;
    const collection = db.collection("studentattendance");

    const recordDate = dateString ? new Date(dateString) : new Date();
    if (Number.isNaN(recordDate.getTime())) throw new Error("Invalid attendance date");
    recordDate.setHours(0, 0, 0, 0);
    const records = attendanceRecords.map((record) => {
      const parsed = attendanceSchema.parse(record);
      return {
      student_id: objectId(parsed.student_id, "student id"),
      status: parsed.status,
      date: recordDate,
      notes: parsed.notes,
      created_at: new Date(),
    };
    });
    const session = await mongoose.connection.getClient().startSession();
    try {
      await session.withTransaction(async () => {
        await collection.deleteMany({ date: recordDate }, { session });
        if (records.length > 0) await collection.insertMany(records, { session });
      });
    } finally {
      await session.endSession();
    }
    return { success: true };
  } catch (error) {
    console.error("recordAttendance Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAttendanceByDate(dateString) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const db = mongoose.connection.db;
    const collection = db.collection("studentattendance");

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) throw new Error("Invalid attendance date");
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const attendance = await collection
      .find({
        date: { $gte: date, $lt: nextDay },
      })
      .toArray();

    return { success: true, data: serializeDocuments(attendance) };
  } catch (error) {
    console.error("getAttendanceByDate Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentAttendanceReport(studentId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const db = mongoose.connection.db;
    const collection = db.collection("studentattendance");

    const sId = objectId(studentId, "student id");

    const stats = await collection
      .aggregate([
        { $match: { student_id: sId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    const formattedStats = stats.reduce(
      (acc, curr) => {
        acc[curr._id.toLowerCase()] = curr.count;
        return acc;
      },
      { present: 0, absent: 0, late: 0, leave: 0 },
    );

    return { success: true, data: formattedStats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteProgressHistory(entryId) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    const db = mongoose.connection.db;
    const collection = db.collection("studentprogresses");
    const result = await collection.deleteOne({
      _id: objectId(entryId, "progress id"),
    });
    return result.deletedCount === 1
      ? { success: true }
      : { success: false, error: "Progress record not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getMonthlyFeeStatus(month, year) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const db = mongoose.connection.db;
    const collection = db.collection("studentfees");

    const parsedPeriod = feeSchema.pick({ month: true, year: true }).parse({ month, year });
    const payments = await collection
      .find({
        month: parsedPeriod.month,
        year: parsedPeriod.year,
      })
      .toArray();

    // Return a map of student_id -> true if paid
    const statusMap = payments.reduce((acc, p) => {
      acc[p.student_id.toString()] = true;
      return acc;
    }, {});

    return { success: true, data: statusMap };
  } catch (error) {
    console.error("getMonthlyFeeStatus Error:", error);
    return { success: false, error: error.message };
  }
}

export async function recordBulkFeePayments(paymentsData) {
  try {
    await requirePermission(PERMISSIONS.STUDENTS_UPDATE);
    if (!Array.isArray(paymentsData) || paymentsData.length > 500) {
      throw new Error("Invalid payment list");
    }
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    const feeRecords = paymentsData.map((data) => {
      const parsed = feeSchema.parse(data);
      return {
      student_id: objectId(data.studentId, "student id"),
      ...parsed,
      date: new Date(),
      created_at: new Date(),
    };
    });

    if (feeRecords.length > 0) {
      const studentIds = feeRecords.map((r) => r.student_id);
      const session = await mongoose.connection.getClient().startSession();
      try {
        await session.withTransaction(async () => {
          const studentCount = await students.countDocuments(
            { _id: { $in: studentIds } },
            { session },
          );
          if (studentCount !== new Set(studentIds.map(String)).size) {
            throw new Error("One or more students were not found");
          }
          await fees.bulkWrite(
            feeRecords.map((record) => ({
              updateOne: {
                filter: {
                  student_id: record.student_id,
                  month: record.month,
                  year: record.year,
                },
                update: { $set: record },
                upsert: true,
              },
            })),
            { session },
          );
          await students.updateMany(
            { _id: { $in: studentIds } },
            {
              $set: {
                fee_status: "Paid",
                last_fee_paid: new Date(),
                updated_at: new Date(),
              },
            },
            { session },
          );
        });
      } finally {
        await session.endSession();
      }
    }
    return { success: true };
  } catch (error) {
    console.error("recordBulkFeePayments Error:", error);
    return { success: false, error: error.message };
  }
}

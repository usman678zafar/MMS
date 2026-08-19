import { NextResponse } from "next/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { staff, students } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import {
  buildStudentsCsv,
  buildStudentsWorkbook,
  makeStudentExportRecord,
} from "@/lib/student-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMATS = new Set(["json", "csv", "xlsx"]);
const MAX_EXPORT_ROWS = 5000;

const safeFilter = (value, maxLength = 100) => String(value || "").trim().slice(0, maxLength);

export async function GET(request) {
  try {
    const currentUser = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
    const { searchParams } = new URL(request.url);
    const format = safeFilter(searchParams.get("format"), 10).toLowerCase() || "xlsx";
    if (!FORMATS.has(format)) {
      return NextResponse.json({ success: false, error: "Unsupported export format" }, { status: 400 });
    }

    const search = safeFilter(searchParams.get("search"));
    const status = safeFilter(searchParams.get("status"), 10);
    const educationClass = safeFilter(searchParams.get("educationClass"), 50);
    const filters = [];
    if (search) {
      filters.push(or(
        ilike(students.name, `%${search}%`),
        ilike(students.fatherName, `%${search}%`),
        ilike(students.phone, `%${search}%`),
        ilike(students.address, `%${search}%`),
      ));
    }
    if (["active", "inactive"].includes(status)) {
      filters.push(eq(students.isActive, status === "active"));
    }
    if (educationClass && educationClass !== "All") {
      filters.push(or(
        eq(students.religiousClass, educationClass),
        eq(students.contemporaryClass, educationClass),
      ));
    }

    const rows = await db
      .select({
        id: students.id,
        name: students.name,
        fatherName: students.fatherName,
        gender: students.gender,
        religiousClass: students.religiousClass,
        contemporaryClass: students.contemporaryClass,
        admissionDate: students.admissionDate,
        phone: students.phone,
        address: students.address,
        isActive: students.isActive,
        monthlyFee: students.monthlyFee,
        feeStatus: students.feeStatus,
        lastFeePaid: students.lastFeePaid,
        currentProgress: students.currentProgress,
        profilePhoto: students.profilePhoto,
        createdAt: students.createdAt,
        religiousTeacherName: staff.name,
      })
      .from(students)
      .leftJoin(staff, eq(staff.id, students.teacherId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(students.name), asc(students.createdAt))
      .limit(MAX_EXPORT_ROWS + 1);

    if (rows.length > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        { success: false, error: `Exports are limited to ${MAX_EXPORT_ROWS.toLocaleString()} students` },
        { status: 413 },
      );
    }

    const includeFees = hasPermission(currentUser.role, PERMISSIONS.FEES_VIEW, currentUser.permissions);
    const includeProgress = hasPermission(currentUser.role, PERMISSIONS.PROGRESS_VIEW, currentUser.permissions);
    const records = rows.map((row) => makeStudentExportRecord(row, { includeFees, includeProgress }));
    const exportedAt = new Date();
    const dateStamp = exportedAt.toISOString().slice(0, 10);
    const filename = `students-${dateStamp}.${format}`;
    const headers = {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    };

    if (format === "json") {
      const publicRecords = records.map(({ profilePhoto: _profilePhoto, ...record }) => record);
      return new Response(JSON.stringify({
        export: {
          title: "Student Directory",
          generatedAt: exportedAt.toISOString(),
          count: records.length,
          filters: { search, status, educationClass },
        },
        students: publicRecords,
      }, null, 2), {
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    if (format === "csv") {
      return new Response(buildStudentsCsv(records, includeFees), {
        headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
      });
    }

    const workbook = await buildStudentsWorkbook(records, { includeFees, exportedAt });
    return new Response(workbook, {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("Student export error:", error);
    return NextResponse.json({ success: false, error: "Unable to export student data" }, { status: 500 });
  }
}

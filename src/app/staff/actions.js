"use server";

import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { objectId, parsePagination, staffSchema } from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

const refreshStaffViews = () => { revalidatePath("/staff"); revalidatePath("/students"); };
const staffValues = (data) => ({ name: data.name, role: data.role, monthlySalary: data.monthly_salary, phone: data.phone, joiningDate: new Date(data.joining_date) });

export async function addStaffMember(staffData) {
  try {
    await requirePermission(PERMISSIONS.STAFF_CREATE);
    const [row] = await db.insert(staff).values({ ...staffValues(staffSchema.parse(staffData)), isActive: true }).returning();
    refreshStaffViews(); return { success: true, data: serializeRow(row) };
  } catch (error) { console.error("addStaffMember Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateStaffMember(id, staffData) {
  try {
    await requirePermission(PERMISSIONS.STAFF_UPDATE);
    const [row] = await db.update(staff).set({ ...staffValues(staffSchema.parse(staffData)), updatedAt: new Date() }).where(eq(staff.id, objectId(id, "staff id"))).returning();
    if (!row) return { success: false, error: "Staff member not found" };
    refreshStaffViews(); return { success: true, data: serializeRow(row) };
  } catch (error) { console.error("updateStaffMember Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteStaffMember(id) {
  try {
    await requirePermission(PERMISSIONS.STAFF_DELETE);
    const [row] = await db.delete(staff).where(eq(staff.id, objectId(id, "staff id"))).returning({ id: staff.id });
    if (!row) return { success: false, error: "Staff member not found" };
    refreshStaffViews(); return { success: true };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function getStaff(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", status = "") {
  try {
    await requirePermission(PERMISSIONS.STAFF_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(staff.name, `%${term}%`), ilike(staff.role, `%${term}%`), ilike(staff.phone, `%${term}%`)));
    if (["active", "inactive"].includes(status)) filters.push(eq(staff.isActive, status === "active"));
    const where = filters.length ? and(...filters) : undefined;
    const [[summary], rows] = await Promise.all([
      db.select({ value: count() }).from(staff).where(where),
      db.select().from(staff).where(where).orderBy(asc(staff.createdAt)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    return formatPaginatedResponse(serializeRows(rows), summary.value, pagination.page, pagination.pageSize);
  } catch (error) { console.error("getStaff Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getAllTeachers() {
  try {
    await requirePermission(PERMISSIONS.STAFF_VIEW);
    const rows = await db.select({ id: staff.id, name: staff.name }).from(staff).where(and(eq(staff.isActive, true), or(ilike(staff.role, "%teacher%"), ilike(staff.role, "%qari%")))).orderBy(asc(staff.name));
    return { success: true, data: rows };
  } catch (error) { console.error("getAllTeachers Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

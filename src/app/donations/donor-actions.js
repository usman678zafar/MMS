"use server";

import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { donorSchema, objectId, parsePagination } from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

const donorValues = (data) => ({
  name: data.name,
  email: data.email,
  phone: data.phone,
  address: data.address,
  isActive: data.is_active,
});

export async function addDonor(donorData) {
  try {
    await requirePermission(PERMISSIONS.DONORS_CREATE);
    const [row] = await db.insert(donors).values(donorValues(donorSchema.parse(donorData))).returning();
    return { success: true, data: serializeRow(row) };
  } catch (error) { console.error("addDonor Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateDonor(id, donorData) {
  try {
    await requirePermission(PERMISSIONS.DONORS_UPDATE);
    const [row] = await db.update(donors).set({ ...donorValues(donorSchema.parse(donorData)), updatedAt: new Date() }).where(eq(donors.id, objectId(id, "donor id"))).returning();
    return row ? { success: true, data: serializeRow(row) } : { success: false, error: "Donor not found" };
  } catch (error) { console.error("updateDonor Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getAllDonors(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", status = "") {
  try {
    await requirePermission(PERMISSIONS.DONORS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(donors.name, `%${term}%`), ilike(donors.email, `%${term}%`), ilike(donors.phone, `%${term}%`), ilike(donors.address, `%${term}%`)));
    if (["active", "inactive"].includes(status)) filters.push(eq(donors.isActive, status === "active"));
    const where = filters.length ? and(...filters) : undefined;
    const [[summary], rows] = await Promise.all([
      db.select({ value: count() }).from(donors).where(where),
      db.select().from(donors).where(where).orderBy(asc(donors.name)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    return formatPaginatedResponse(serializeRows(rows), summary.value, pagination.page, pagination.pageSize);
  } catch (error) { console.error("getAllDonors Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteDonor(id) {
  try {
    await requirePermission(PERMISSIONS.DONORS_DELETE);
    const donorId = objectId(id, "donor id");
    const [related] = await db.select({ value: count() }).from(donations).where(eq(donations.donorId, donorId));
    if (related.value) return { success: false, error: "This donor has donations and cannot be deleted" };
    const [row] = await db.delete(donors).where(eq(donors.id, donorId)).returning({ id: donors.id });
    return row ? { success: true } : { success: false, error: "Donor not found" };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

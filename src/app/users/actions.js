"use server";

import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, ROLES } from "@/lib/rbac";
import { objectId, parsePagination, userCreateSchema, userUpdateSchema } from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

const publicColumns = { id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, createdAt: users.createdAt, updatedAt: users.updatedAt };

export async function getUsers(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", role = "") {
  try {
    await requirePermission(PERMISSIONS.USERS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(users.name, `%${term}%`), ilike(users.email, `%${term}%`), ilike(users.role, `%${term}%`)));
    if (Object.values(ROLES).includes(role)) filters.push(eq(users.role, role));
    const where = filters.length ? and(...filters) : undefined;
    const [[summary], rows] = await Promise.all([
      db.select({ value: count() }).from(users).where(where),
      db.select(publicColumns).from(users).where(where).orderBy(desc(users.createdAt)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    return formatPaginatedResponse(serializeRows(rows), summary.value, pagination.page, pagination.pageSize);
  } catch (error) { console.error("getUsers Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function addUser(userData) {
  try {
    await requirePermission(PERMISSIONS.USERS_CREATE);
    const data = userCreateSchema.parse(userData);
    const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = lower(${data.email})`).limit(1);
    if (existing) return { success: false, error: "User with this email already exists" };
    const [user] = await db.insert(users).values({ ...data, password: await bcrypt.hash(data.password, 12) }).returning(publicColumns);
    return { success: true, user: serializeRow(user) };
  } catch (error) { console.error("addUser Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateUser(userId, userData) {
  try {
    await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = objectId(userId, "user id");
    const data = userUpdateSchema.parse(userData);
    const [emailOwner] = await db.select({ id: users.id }).from(users).where(and(sql`lower(${users.email}) = lower(${data.email})`, ne(users.id, id))).limit(1);
    if (emailOwner) return { success: false, error: "User with this email already exists" };
    const update = { name: data.name, email: data.email, role: data.role, updatedAt: new Date() };
    if (data.password) update.password = await bcrypt.hash(data.password, 12);
    const [user] = await db.update(users).set(update).where(eq(users.id, id)).returning(publicColumns);
    if (!user) return { success: false, error: "User not found" };
    if (data.password) await db.delete(sessions).where(eq(sessions.userId, id));
    return { success: true, user: serializeRow(user) };
  } catch (error) { console.error("updateUser Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

async function lastActiveSuperAdmin(user) {
  if (user.role !== ROLES.SUPER_ADMIN || !user.isActive) return false;
  const [summary] = await db.select({ value: count() }).from(users).where(and(eq(users.role, ROLES.SUPER_ADMIN), eq(users.isActive, true)));
  return summary.value <= 1;
}

export async function deleteUser(userId) {
  try {
    const current = await requirePermission(PERMISSIONS.USERS_DELETE);
    const id = objectId(userId, "user id");
    if (current.id === id) return { success: false, error: "You cannot delete your own account" };
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) return { success: false, error: "User not found" };
    if (await lastActiveSuperAdmin(user)) return { success: false, error: "The last active super admin cannot be deleted" };
    await db.delete(users).where(eq(users.id, id));
    return { success: true };
  } catch (error) { console.error("deleteUser Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function toggleUserStatus(userId) {
  try {
    const current = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = objectId(userId, "user id");
    if (current.id === id) return { success: false, error: "You cannot disable your own account" };
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return { success: false, error: "User not found" };
    if (await lastActiveSuperAdmin(existing)) return { success: false, error: "The last active super admin cannot be disabled" };
    const next = !existing.isActive;
    const [user] = await db.update(users).set({ isActive: next, updatedAt: new Date() }).where(eq(users.id, id)).returning(publicColumns);
    if (!next) await db.delete(sessions).where(eq(sessions.userId, id));
    return { success: true, user: serializeRow(user) };
  } catch (error) { console.error("toggleUserStatus Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

"use server";

import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { canAccessRole, getEffectivePermissions, PERMISSION_GROUPS, PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "@/lib/rbac";
import { objectId, parsePagination, userCreateSchema, userUpdateSchema } from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

const publicColumns = { id: users.id, name: users.name, email: users.email, role: users.role, permissions: users.permissions, isActive: users.isActive, createdAt: users.createdAt, updatedAt: users.updatedAt };

const normalizePermissions = (currentUser, role, requestedPermissions, preservedPermissions = []) => {
  if (role === ROLES.SUPER_ADMIN) return null;

  const requested = Array.isArray(requestedPermissions)
    ? requestedPermissions
    : ROLE_PERMISSIONS[role] || [];
  const normalized = new Set(requested);

  for (const group of PERMISSION_GROUPS) {
    if (group.manage.some((permission) => normalized.has(permission))) {
      group.view.forEach((permission) => normalized.add(permission));
    }
    if (group.requiresStudents && [...group.view, ...group.manage].some((permission) => normalized.has(permission))) {
      normalized.add(PERMISSIONS.STUDENTS_VIEW);
    }
  }

  const allowed = new Set(getEffectivePermissions(currentUser.role, currentUser.permissions));
  if (Array.isArray(preservedPermissions)) {
    preservedPermissions.forEach((permission) => allowed.add(permission));
  }
  if (currentUser.role !== ROLES.SUPER_ADMIN && [...normalized].some((permission) => !allowed.has(permission))) {
    throw new Error("You cannot grant permissions you do not have");
  }

  return Object.values(PERMISSIONS).filter((permission) => normalized.has(permission));
};

const permissionsEqual = (left, right) => {
  if (left === null && right === null) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return left.length === right.length && left.every((permission) => right.includes(permission));
};

export async function getUsers(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", role = "") {
  try {
    const current = await requirePermission(PERMISSIONS.USERS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const allowedRoles = Object.values(ROLES).filter((candidate) => canAccessRole(current.role, candidate));
    const filters = [inArray(users.role, allowedRoles)];
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
    const current = await requirePermission(PERMISSIONS.USERS_CREATE);
    const data = userCreateSchema.parse(userData);
    if (!canAccessRole(current.role, data.role) || (data.role === ROLES.SUPER_ADMIN && current.role !== ROLES.SUPER_ADMIN)) {
      return { success: false, error: "You cannot create a user with this role" };
    }
    const permissions = normalizePermissions(current, data.role, data.permissions);
    const [existing] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = lower(${data.email})`).limit(1);
    if (existing) return { success: false, error: "User with this email already exists" };
    const [user] = await db.insert(users).values({ ...data, permissions, password: await bcrypt.hash(data.password, 12) }).returning(publicColumns);
    return { success: true, user: serializeRow(user) };
  } catch (error) { console.error("addUser Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateUser(userId, userData) {
  try {
    const current = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = objectId(userId, "user id");
    const data = userUpdateSchema.parse(userData);
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return { success: false, error: "User not found" };
    if (!canAccessRole(current.role, existing.role)) return { success: false, error: "You cannot manage this user" };
    if (!canAccessRole(current.role, data.role) || (data.role === ROLES.SUPER_ADMIN && current.role !== ROLES.SUPER_ADMIN)) {
      return { success: false, error: "You cannot assign this role" };
    }
    const permissions = normalizePermissions(
      current,
      data.role,
      data.permissions,
      data.role === existing.role ? existing.permissions : [],
    );
    if (current.id === id && (data.role !== existing.role || !permissionsEqual(permissions, existing.permissions))) {
      return { success: false, error: "You cannot change your own role or permissions" };
    }
    if (await lastActiveSuperAdmin(existing) && data.role !== ROLES.SUPER_ADMIN) {
      return { success: false, error: "The last active super admin cannot be demoted" };
    }
    const [emailOwner] = await db.select({ id: users.id }).from(users).where(and(sql`lower(${users.email}) = lower(${data.email})`, ne(users.id, id))).limit(1);
    if (emailOwner) return { success: false, error: "User with this email already exists" };
    const update = { name: data.name, email: data.email, role: data.role, permissions, updatedAt: new Date() };
    if (data.password) update.password = await bcrypt.hash(data.password, 12);
    const [user] = await db.update(users).set(update).where(eq(users.id, id)).returning(publicColumns);
    if (!user) return { success: false, error: "User not found" };
    const accessChanged = data.role !== existing.role || !permissionsEqual(permissions, existing.permissions);
    if (data.password || accessChanged) await db.delete(sessions).where(eq(sessions.userId, id));
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
    if (!canAccessRole(current.role, user.role)) return { success: false, error: "You cannot manage this user" };
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
    if (!canAccessRole(current.role, existing.role)) return { success: false, error: "You cannot manage this user" };
    if (await lastActiveSuperAdmin(existing)) return { success: false, error: "The last active super admin cannot be disabled" };
    const next = !existing.isActive;
    const [user] = await db.update(users).set({ isActive: next, updatedAt: new Date() }).where(eq(users.id, id)).returning(publicColumns);
    if (!next) await db.delete(sessions).where(eq(sessions.userId, id));
    return { success: true, user: serializeRow(user) };
  } catch (error) { console.error("toggleUserStatus Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

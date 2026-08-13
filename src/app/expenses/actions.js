"use server";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { expenseSchema, objectId, parsePagination } from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

export async function addExpense(expenseData) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_CREATE);
    const parsed = expenseSchema.parse(expenseData);
    const [row] = await db.insert(expenses).values({ ...parsed, date: new Date(parsed.date) }).returning();
    return { success: true, data: serializeRow(row) };
  } catch (error) { console.error("addExpense Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateExpense(id, expenseData) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_UPDATE);
    const parsed = expenseSchema.parse(expenseData);
    const [row] = await db.update(expenses).set({ ...parsed, date: new Date(parsed.date), updatedAt: new Date() }).where(eq(expenses.id, objectId(id, "expense id"))).returning();
    return row ? { success: true, data: serializeRow(row) } : { success: false, error: "Expense not found" };
  } catch (error) { console.error("updateExpense Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteExpense(id) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_DELETE);
    const [row] = await db.delete(expenses).where(eq(expenses.id, objectId(id, "expense id"))).returning({ id: expenses.id });
    return row ? { success: true } : { success: false, error: "Expense not found" };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function getExpenses(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", category = "") {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(expenses.description, `%${term}%`), ilike(expenses.category, `%${term}%`)));
    if (category) filters.push(eq(expenses.category, String(category).slice(0, 50)));
    const where = filters.length ? and(...filters) : undefined;
    const [[summary], rows] = await Promise.all([
      db.select({ value: count() }).from(expenses).where(where),
      db.select().from(expenses).where(where).orderBy(desc(expenses.date)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    return formatPaginatedResponse(serializeRows(rows), summary.value, pagination.page, pagination.pageSize);
  } catch (error) { console.error("getExpenses Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

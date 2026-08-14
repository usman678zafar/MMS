"use server";

import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, expenses, inventory, staff, students } from "@/db/schema";
import { getErrorMessage, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

const total = (column) => sql`coalesce(sum(${column}), 0)::float8`;

export async function getDashboardStats() {
  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    const can = (permission) => hasPermission(user.role, permission, user.permissions);
    const [[donation], [expense], [staffTotal], [inventoryTotal], [studentTotal], [pending]] = await Promise.all([
      can(PERMISSIONS.DONATIONS_VIEW) ? db.select({ value: total(donations.amount) }).from(donations) : [{ value: 0 }],
      can(PERMISSIONS.EXPENSES_VIEW) ? db.select({ value: total(expenses.amount) }).from(expenses) : [{ value: 0 }],
      can(PERMISSIONS.STAFF_VIEW) ? db.select({ value: count() }).from(staff).where(eq(staff.isActive, true)) : [{ value: 0 }],
      can(PERMISSIONS.INVENTORY_VIEW) ? db.select({ value: count() }).from(inventory) : [{ value: 0 }],
      can(PERMISSIONS.STUDENTS_VIEW) ? db.select({ value: count() }).from(students).where(eq(students.isActive, true)) : [{ value: 0 }],
      can(PERMISSIONS.FEES_VIEW) ? db.select({ value: count() }).from(students).where(and(eq(students.isActive, true), eq(students.feeStatus, "Unpaid"))) : [{ value: 0 }],
    ]);
    return { success: true, totalDonations: Number(donation.value), totalExpenses: Number(expense.value), activeStaff: staffTotal.value, inventoryCount: inventoryTotal.value, studentCount: studentTotal.value, pendingFees: pending.value };
  } catch (error) { console.error("getDashboardStats Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getFinancialData() {
  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    const canDonations = hasPermission(user.role, PERMISSIONS.DONATIONS_VIEW, user.permissions);
    const canExpenses = hasPermission(user.role, PERMISSIONS.EXPENSES_VIEW, user.permissions);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const month = (column) => sql`date_trunc('month', ${column})`;
    const [donationRows, expenseRows] = await Promise.all([
      canDonations ? db.select({ month: month(donations.date), value: total(donations.amount) }).from(donations).where(and(gte(donations.date, start), lt(donations.date, end))).groupBy(month(donations.date)) : [],
      canExpenses ? db.select({ month: month(expenses.date), value: total(expenses.amount) }).from(expenses).where(and(gte(expenses.date, start), lt(expenses.date, end))).groupBy(month(expenses.date)) : [],
    ]);
    const key = (value) => new Date(value).toISOString().slice(0, 7);
    const donationMap = new Map(donationRows.map((row) => [key(row.month), Number(row.value)]));
    const expenseMap = new Map(expenseRows.map((row) => [key(row.month), Number(row.value)]));
    const formatter = new Intl.DateTimeFormat("en", { month: "short" });
    const data = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = date.toISOString().slice(0, 7);
      data.push({ name: formatter.format(date), donations: donationMap.get(monthKey) || 0, expenses: expenseMap.get(monthKey) || 0 });
    }
    return { success: true, data };
  } catch (error) { console.error("getFinancialData Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function getRecentActivity() {
  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!hasPermission(user.role, PERMISSIONS.DONATIONS_VIEW, user.permissions)) {
      return { success: true, activities: [] };
    }
    const rows = await db.select({ amount: donations.amount, donor: donors.name, date: donations.createdAt }).from(donations).leftJoin(donors, eq(donors.id, donations.donorId)).orderBy(desc(donations.createdAt), desc(donations.date)).limit(4);
    return { success: true, activities: serializeRows(rows.map((row) => ({ type: "donation", amount: Number(row.amount), donor: row.donor || "Anonymous", date: row.date }))) };
  } catch (error) { console.error("getRecentActivity Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

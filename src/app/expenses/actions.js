"use server";

import mongoose from "mongoose";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  escapeRegex,
  expenseSchema,
  objectId,
  parsePagination,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

export async function addExpense(expenseData) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_CREATE);
    const parsed = expenseSchema.parse(expenseData);
    const data = { ...parsed, date: new Date(parsed.date), created_at: new Date() };
    const result = await mongoose.connection.db.collection("expenses").insertOne(data);
    return { success: true, data: serializeDocument({ ...data, _id: result.insertedId }) };
  } catch (error) {
    console.error("addExpense Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateExpense(id, expenseData) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_UPDATE);
    const parsed = expenseSchema.parse(expenseData);
    const data = { ...parsed, date: new Date(parsed.date), updated_at: new Date() };
    const result = await mongoose.connection.db
      .collection("expenses")
      .updateOne({ _id: objectId(id, "expense id") }, { $set: data });
    return result.matchedCount === 1
      ? { success: true, data: serializeDocument(data) }
      : { success: false, error: "Expense not found" };
  } catch (error) {
    console.error("updateExpense Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteExpense(id) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_DELETE);
    const result = await mongoose.connection.db
      .collection("expenses")
      .deleteOne({ _id: objectId(id, "expense id") });
    return result.deletedCount === 1
      ? { success: true }
      : { success: false, error: "Expense not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getExpenses(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  category = "",
) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_VIEW);
    const pagination = parsePagination(page, pageSize);
    const query = {};
    const safeSearch = escapeRegex(search);
    if (safeSearch) {
      query.$or = [
        { description: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (category) query.category = String(category).slice(0, 50);

    const collection = mongoose.connection.db.collection("expenses");
    const [totalItems, data] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ date: -1 })
        .skip((pagination.page - 1) * pagination.pageSize)
        .limit(pagination.pageSize)
        .toArray(),
    ]);
    return formatPaginatedResponse(
      serializeDocuments(data),
      totalItems,
      pagination.page,
      pagination.pageSize,
    );
  } catch (error) {
    console.error("getExpenses Error:", error);
    return { success: false, error: error.message };
  }
}

"use server";

import mongoose from "mongoose";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  escapeRegex,
  inventorySchema,
  objectId,
  parsePagination,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

export async function addInventoryItem(itemData) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_CREATE);
    const data = { ...inventorySchema.parse(itemData), created_at: new Date() };
    const result = await mongoose.connection.db.collection("inventory").insertOne(data);
    return { success: true, data: serializeDocument({ ...data, _id: result.insertedId }) };
  } catch (error) {
    console.error("addInventoryItem Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInventoryItem(id, itemData) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_UPDATE);
    const data = { ...inventorySchema.parse(itemData), updated_at: new Date() };
    const result = await mongoose.connection.db
      .collection("inventory")
      .updateOne({ _id: objectId(id, "inventory id") }, { $set: data });
    return result.matchedCount === 1
      ? { success: true, data: serializeDocument(data) }
      : { success: false, error: "Inventory item not found" };
  } catch (error) {
    console.error("updateInventoryItem Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteInventoryItem(id) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_DELETE);
    const result = await mongoose.connection.db
      .collection("inventory")
      .deleteOne({ _id: objectId(id, "inventory id") });
    return result.deletedCount === 1
      ? { success: true }
      : { success: false, error: "Inventory item not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getInventory(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  category = "",
) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_VIEW);
    const pagination = parsePagination(page, pageSize);
    const query = {};
    const safeSearch = escapeRegex(search);
    if (safeSearch) {
      query.$or = [
        { item_name: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { unit: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (category) query.category = String(category).slice(0, 50);

    const collection = mongoose.connection.db.collection("inventory");
    const [totalItems, data] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ item_name: 1 })
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
    console.error("getInventory Error:", error);
    return { success: false, error: error.message };
  }
}

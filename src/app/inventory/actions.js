"use server";

import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { inventory } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { inventorySchema, objectId, parsePagination } from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

const inventoryValues = (data) => ({ itemName: data.item_name, category: data.category, quantity: data.quantity, unit: data.unit });

export async function addInventoryItem(itemData) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_CREATE);
    const [row] = await db.insert(inventory).values(inventoryValues(inventorySchema.parse(itemData))).returning();
    return { success: true, data: serializeRow(row) };
  } catch (error) { console.error("addInventoryItem Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function updateInventoryItem(id, itemData) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_UPDATE);
    const [row] = await db.update(inventory).set({ ...inventoryValues(inventorySchema.parse(itemData)), updatedAt: new Date() }).where(eq(inventory.id, objectId(id, "inventory id"))).returning();
    return row ? { success: true, data: serializeRow(row) } : { success: false, error: "Inventory item not found" };
  } catch (error) { console.error("updateInventoryItem Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

export async function deleteInventoryItem(id) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_DELETE);
    const [row] = await db.delete(inventory).where(eq(inventory.id, objectId(id, "inventory id"))).returning({ id: inventory.id });
    return row ? { success: true } : { success: false, error: "Inventory item not found" };
  } catch (error) { return { success: false, error: getErrorMessage(error) }; }
}

export async function getInventory(page = 1, pageSize = PAGINATION_DEFAULTS.PAGE_SIZE, search = "", category = "") {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_VIEW);
    const pagination = parsePagination(page, pageSize);
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(inventory.itemName, `%${term}%`), ilike(inventory.category, `%${term}%`), ilike(inventory.unit, `%${term}%`)));
    if (category) filters.push(eq(inventory.category, String(category).slice(0, 50)));
    const where = filters.length ? and(...filters) : undefined;
    const [[summary], rows] = await Promise.all([
      db.select({ value: count() }).from(inventory).where(where),
      db.select().from(inventory).where(where).orderBy(asc(inventory.itemName)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    return formatPaginatedResponse(serializeRows(rows), summary.value, pagination.page, pagination.pageSize);
  } catch (error) { console.error("getInventory Error:", error); return { success: false, error: getErrorMessage(error) }; }
}

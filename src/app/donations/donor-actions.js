"use server";

import mongoose from "mongoose";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  donorSchema,
  escapeRegex,
  objectId,
  parsePagination,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

export async function addDonor(donorData) {
  try {
    await requirePermission(PERMISSIONS.DONORS_CREATE);
    const data = { ...donorSchema.parse(donorData), created_at: new Date() };
    const result = await mongoose.connection.db.collection("donors").insertOne(data);
    return { success: true, data: serializeDocument({ ...data, _id: result.insertedId }) };
  } catch (error) {
    console.error("addDonor Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDonor(id, donorData) {
  try {
    await requirePermission(PERMISSIONS.DONORS_UPDATE);
    const data = { ...donorSchema.parse(donorData), updated_at: new Date() };
    const result = await mongoose.connection.db
      .collection("donors")
      .updateOne({ _id: objectId(id, "donor id") }, { $set: data });
    return result.matchedCount === 1
      ? { success: true, data: serializeDocument(data) }
      : { success: false, error: "Donor not found" };
  } catch (error) {
    console.error("updateDonor Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllDonors(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  status = "",
) {
  try {
    await requirePermission(PERMISSIONS.DONORS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const query = {};
    const safeSearch = escapeRegex(search);
    if (safeSearch) {
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
        { address: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (status === "active" || status === "inactive") {
      query.is_active = status === "active";
    }

    const collection = mongoose.connection.db.collection("donors");
    const [totalItems, data] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ name: 1 })
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
    console.error("getAllDonors Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDonor(id) {
  try {
    await requirePermission(PERMISSIONS.DONORS_DELETE);
    const donorId = objectId(id, "donor id");
    const donations = mongoose.connection.db.collection("donations");
    if (await donations.countDocuments({ donor_id: donorId }, { limit: 1 })) {
      return {
        success: false,
        error: "This donor has donations and cannot be deleted",
      };
    }
    const result = await mongoose.connection.db
      .collection("donors")
      .deleteOne({ _id: donorId });
    return result.deletedCount === 1
      ? { success: true }
      : { success: false, error: "Donor not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

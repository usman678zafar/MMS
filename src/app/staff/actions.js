"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  escapeRegex,
  objectId,
  parsePagination,
  staffSchema,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

const refreshStaffViews = () => {
  revalidatePath("/staff");
  revalidatePath("/students");
};

export async function addStaffMember(staffData) {
  try {
    await requirePermission(PERMISSIONS.STAFF_CREATE);
    const parsed = staffSchema.parse(staffData);
    const data = {
      ...parsed,
      joining_date: new Date(parsed.joining_date),
      is_active: true,
      created_at: new Date(),
    };
    const result = await mongoose.connection.db.collection("staff").insertOne(data);
    refreshStaffViews();
    return { success: true, data: serializeDocument({ ...data, _id: result.insertedId }) };
  } catch (error) {
    console.error("addStaffMember Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStaffMember(id, staffData) {
  try {
    await requirePermission(PERMISSIONS.STAFF_UPDATE);
    const parsed = staffSchema.parse(staffData);
    const data = {
      ...parsed,
      joining_date: new Date(parsed.joining_date),
      updated_at: new Date(),
    };
    const result = await mongoose.connection.db
      .collection("staff")
      .updateOne({ _id: objectId(id, "staff id") }, { $set: data });
    if (result.matchedCount !== 1) {
      return { success: false, error: "Staff member not found" };
    }
    refreshStaffViews();
    return { success: true, data: serializeDocument(data) };
  } catch (error) {
    console.error("updateStaffMember Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStaffMember(id) {
  try {
    await requirePermission(PERMISSIONS.STAFF_DELETE);
    const result = await mongoose.connection.db
      .collection("staff")
      .deleteOne({ _id: objectId(id, "staff id") });
    if (result.deletedCount !== 1) {
      return { success: false, error: "Staff member not found" };
    }
    refreshStaffViews();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getStaff(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  status = "",
) {
  try {
    await requirePermission(PERMISSIONS.STAFF_VIEW);
    const pagination = parsePagination(page, pageSize);
    const query = {};
    const safeSearch = escapeRegex(search);
    if (safeSearch) {
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { role: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (status === "active" || status === "inactive") {
      query.is_active = status === "active";
    }

    const collection = mongoose.connection.db.collection("staff");
    const [totalItems, data] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ created_at: 1 })
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
    console.error("getStaff Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllTeachers() {
  try {
    await requirePermission(PERMISSIONS.STAFF_VIEW);
    const teachers = await mongoose.connection.db
      .collection("staff")
      .find({ role: { $regex: /teacher|qari/i }, is_active: { $ne: false } })
      .project({ name: 1 })
      .sort({ name: 1 })
      .toArray();
    return {
      success: true,
      data: teachers.map((teacher) => ({
        id: teacher._id.toString(),
        name: teacher.name,
      })),
    };
  } catch (error) {
    console.error("getAllTeachers Error:", error);
    return { success: false, error: error.message };
  }
}

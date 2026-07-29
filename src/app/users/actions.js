"use server";

import mongoose from "mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, ROLES } from "@/lib/rbac";
import {
  escapeRegex,
  objectId,
  parsePagination,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  is_active: user.is_active !== false,
  created_at: user.created_at || null,
  updated_at: user.updated_at || null,
});

export async function getUsers(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  role = "",
) {
  try {
    await requirePermission(PERMISSIONS.USERS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const collection = mongoose.connection.db.collection("users");
    const query = {};
    const safeSearch = escapeRegex(search);

    if (safeSearch) {
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { role: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (Object.values(ROLES).includes(role)) query.role = role;

    const totalItems = await collection.countDocuments(query);
    const users = await collection
      .find(query, { projection: { password: 0 } })
      .sort({ created_at: -1 })
      .skip((pagination.page - 1) * pagination.pageSize)
      .limit(pagination.pageSize)
      .toArray();

    return formatPaginatedResponse(
      users.map(sanitizeUser),
      totalItems,
      pagination.page,
      pagination.pageSize,
    );
  } catch (error) {
    console.error("getUsers Error:", error);
    return { success: false, error: error.message };
  }
}

export async function addUser(userData) {
  try {
    await requirePermission(PERMISSIONS.USERS_CREATE);
    const data = userCreateSchema.parse(userData);
    const existingUser = await User.exists({ email: data.email });
    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    const user = await User.create({
      ...data,
      password: await bcrypt.hash(data.password, 12),
    });
    return { success: true, user: sanitizeUser(user.toObject()) };
  } catch (error) {
    console.error("addUser Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUser(userId, userData) {
  try {
    await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = objectId(userId, "user id");
    const data = userUpdateSchema.parse(userData);
    const collection = mongoose.connection.db.collection("users");
    const existingUser = await collection.findOne({ _id: id });
    if (!existingUser) return { success: false, error: "User not found" };

    const emailOwner = await collection.findOne({
      email: data.email,
      _id: { $ne: id },
    });
    if (emailOwner) {
      return { success: false, error: "User with this email already exists" };
    }

    const updateData = {
      name: data.name,
      email: data.email,
      role: data.role,
      updated_at: new Date(),
    };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const result = await collection.updateOne({ _id: id }, { $set: updateData });
    if (result.matchedCount !== 1) {
      return { success: false, error: "User not found" };
    }
    if (data.password) {
      await mongoose.connection.db
        .collection("sessions")
        .deleteMany({ user_id: id });
    }

    const user = await collection.findOne(
      { _id: id },
      { projection: { password: 0 } },
    );
    return { success: true, user: sanitizeUser(user) };
  } catch (error) {
    console.error("updateUser Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId) {
  try {
    const currentUser = await requirePermission(PERMISSIONS.USERS_DELETE);
    const id = objectId(userId, "user id");
    if (currentUser.id === id.toString()) {
      return { success: false, error: "You cannot delete your own account" };
    }

    const collection = mongoose.connection.db.collection("users");
    const existingUser = await collection.findOne({ _id: id });
    if (!existingUser) return { success: false, error: "User not found" };
    if (
      existingUser.role === ROLES.SUPER_ADMIN &&
      (await collection.countDocuments({
        role: ROLES.SUPER_ADMIN,
        is_active: { $ne: false },
      })) <= 1
    ) {
      return { success: false, error: "The last active super admin cannot be deleted" };
    }

    const result = await collection.deleteOne({ _id: id });
    await mongoose.connection.db.collection("sessions").deleteMany({ user_id: id });
    return result.deletedCount === 1
      ? { success: true }
      : { success: false, error: "User not found" };
  } catch (error) {
    console.error("deleteUser Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatus(userId) {
  try {
    const currentUser = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = objectId(userId, "user id");
    if (currentUser.id === id.toString()) {
      return { success: false, error: "You cannot disable your own account" };
    }

    const collection = mongoose.connection.db.collection("users");
    const existingUser = await collection.findOne({ _id: id });
    if (!existingUser) return { success: false, error: "User not found" };
    if (
      existingUser.role === ROLES.SUPER_ADMIN &&
      existingUser.is_active !== false &&
      (await collection.countDocuments({
        role: ROLES.SUPER_ADMIN,
        is_active: { $ne: false },
      })) <= 1
    ) {
      return { success: false, error: "The last active super admin cannot be disabled" };
    }

    const nextStatus = existingUser.is_active === false;
    const result = await collection.updateOne(
      { _id: id },
      { $set: { is_active: nextStatus, updated_at: new Date() } },
    );
    if (result.matchedCount !== 1) {
      return { success: false, error: "User not found" };
    }
    if (!nextStatus) {
      await mongoose.connection.db.collection("sessions").deleteMany({ user_id: id });
    }

    const user = await collection.findOne(
      { _id: id },
      { projection: { password: 0 } },
    );
    return { success: true, user: sanitizeUser(user) };
  } catch (error) {
    console.error("toggleUserStatus Error:", error);
    return { success: false, error: error.message };
  }
}

"use server";

import crypto from "node:crypto";
import mongoose from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/r2";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  donationSchema,
  escapeRegex,
  objectId,
  parsePagination,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const hasValidSignature = (type, buffer) => {
  if (type === "application/pdf") {
    return buffer.subarray(0, 5).toString() === "%PDF-";
  }
  if (type === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (type === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (type === "image/webp") {
    return (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    );
  }
  return false;
};

export async function uploadReceipt(formData) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_CREATE);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("A receipt file is required");
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      throw new Error("Receipt files must be 5 MB or smaller");
    }
    const extension = RECEIPT_TYPES[file.type];
    if (!extension) {
      throw new Error("Only PDF, JPEG, PNG, and WebP receipts are allowed");
    }
    if (
      !process.env.R2_BUCKET_NAME ||
      !process.env.R2_PUBLIC_URL
    ) {
      throw new Error("Receipt storage is not configured");
    }

    const fileName = `receipts/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidSignature(file.type, buffer)) {
      throw new Error("The receipt contents do not match its file type");
    }
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }),
    );
    return {
      success: true,
      url: `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${fileName}`,
    };
  } catch (error) {
    console.error("uploadReceipt Error:", error);
    return { success: false, error: error.message };
  }
}

const prepareDonation = (input) => {
  const parsed = donationSchema.parse(input);
  return {
    ...parsed,
    donor_id: parsed.donor_id ? objectId(parsed.donor_id, "donor id") : null,
    date: new Date(parsed.date),
  };
};

export async function addDonation(donationData) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_CREATE);
    const data = { ...prepareDonation(donationData), created_at: new Date() };
    const result = await mongoose.connection.db.collection("donations").insertOne(data);
    return { success: true, data: serializeDocument({ ...data, _id: result.insertedId }) };
  } catch (error) {
    console.error("addDonation Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDonation(id, donationData) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_UPDATE);
    const data = { ...prepareDonation(donationData), updated_at: new Date() };
    const result = await mongoose.connection.db
      .collection("donations")
      .updateOne({ _id: objectId(id, "donation id") }, { $set: data });
    return result.matchedCount === 1
      ? { success: true, data: serializeDocument(data) }
      : { success: false, error: "Donation not found" };
  } catch (error) {
    console.error("updateDonation Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDonation(id) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_DELETE);
    const result = await mongoose.connection.db
      .collection("donations")
      .deleteOne({ _id: objectId(id, "donation id") });
    return result.deletedCount === 1
      ? { success: true }
      : { success: false, error: "Donation not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getDonations(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  type = "",
) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_VIEW);
    const pagination = parsePagination(page, pageSize);
    const query = {};
    const safeSearch = escapeRegex(search);
    if (safeSearch) {
      query.$or = [
        { "donors.name": { $regex: safeSearch, $options: "i" } },
        { type: { $regex: safeSearch, $options: "i" } },
        { notes: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (type) query.type = String(type).slice(0, 50);

    const collection = mongoose.connection.db.collection("donations");
    const pipeline = [
      {
        $lookup: {
          from: "donors",
          localField: "donor_id",
          foreignField: "_id",
          as: "donors",
        },
      },
      { $unwind: { path: "$donors", preserveNullAndEmptyArrays: true } },
      { $match: query },
    ];
    const [countResult, data] = await Promise.all([
      collection.aggregate([...pipeline, { $count: "total" }]).toArray(),
      collection
        .aggregate([
          ...pipeline,
          { $sort: { date: -1 } },
          { $skip: (pagination.page - 1) * pagination.pageSize },
          { $limit: pagination.pageSize },
        ])
        .toArray(),
    ]);
    return formatPaginatedResponse(
      serializeDocuments(data),
      countResult[0]?.total || 0,
      pagination.page,
      pagination.pageSize,
    );
  } catch (error) {
    console.error("getDonations Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getDonors() {
  try {
    await requirePermission(PERMISSIONS.DONORS_VIEW);
    const data = await mongoose.connection.db
      .collection("donors")
      .find({ is_active: { $ne: false } })
      .project({ name: 1 })
      .sort({ name: 1 })
      .toArray();
    return { success: true, data: serializeDocuments(data) };
  } catch (error) {
    console.error("getDonors Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getDonorDonations(donorId) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_VIEW);
    const data = await mongoose.connection.db
      .collection("donations")
      .find({ donor_id: objectId(donorId, "donor id") })
      .sort({ date: -1 })
      .toArray();
    return { success: true, data: serializeDocuments(data) };
  } catch (error) {
    console.error("getDonorDonations Error:", error);
    return { success: false, error: error.message };
  }
}

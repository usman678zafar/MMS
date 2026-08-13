"use server";

import crypto from "node:crypto";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors } from "@/db/schema";
import { getErrorMessage, serializeRow, serializeRows } from "@/db/utils";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/r2";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  donationSchema,
  objectId,
  parsePagination,
} from "@/lib/validation";
import { formatPaginatedResponse, PAGINATION_DEFAULTS } from "@/lib/pagination";

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
    amount: parsed.amount,
    type: parsed.type,
    notes: parsed.notes,
    receiptUrl: parsed.receipt_url,
    donorId: parsed.donor_id ? objectId(parsed.donor_id, "donor id") : null,
    date: new Date(parsed.date),
  };
};

export async function addDonation(donationData) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_CREATE);
    const [row] = await db.insert(donations).values(prepareDonation(donationData)).returning();
    return { success: true, data: serializeRow(row) };
  } catch (error) {
    console.error("addDonation Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateDonation(id, donationData) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_UPDATE);
    const [row] = await db.update(donations).set({ ...prepareDonation(donationData), updatedAt: new Date() }).where(eq(donations.id, objectId(id, "donation id"))).returning();
    return row
      ? { success: true, data: serializeRow(row) }
      : { success: false, error: "Donation not found" };
  } catch (error) {
    console.error("updateDonation Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteDonation(id) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_DELETE);
    const [row] = await db.delete(donations).where(eq(donations.id, objectId(id, "donation id"))).returning({ id: donations.id });
    return row
      ? { success: true }
      : { success: false, error: "Donation not found" };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
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
    const term = String(search).trim().slice(0, 100);
    const filters = [];
    if (term) filters.push(or(ilike(donors.name, `%${term}%`), ilike(donations.type, `%${term}%`), ilike(donations.notes, `%${term}%`)));
    if (type) filters.push(eq(donations.type, String(type).slice(0, 20)));
    const where = filters.length ? and(...filters) : undefined;
    const [countResult, data] = await Promise.all([
      db.select({ value: count() }).from(donations).leftJoin(donors, eq(donors.id, donations.donorId)).where(where),
      db.select({ donation: donations, donors }).from(donations).leftJoin(donors, eq(donors.id, donations.donorId)).where(where).orderBy(desc(donations.date)).offset((pagination.page - 1) * pagination.pageSize).limit(pagination.pageSize),
    ]);
    const rows = data.map(({ donation, donors: donor }) => ({ ...donation, donors: donor }));
    return formatPaginatedResponse(
      serializeRows(rows),
      countResult[0]?.value || 0,
      pagination.page,
      pagination.pageSize,
    );
  } catch (error) {
    console.error("getDonations Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getDonors() {
  try {
    await requirePermission(PERMISSIONS.DONORS_VIEW);
    const data = await db.select({ id: donors.id, name: donors.name }).from(donors).where(eq(donors.isActive, true)).orderBy(asc(donors.name));
    return { success: true, data: serializeRows(data) };
  } catch (error) {
    console.error("getDonors Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getDonorDonations(donorId) {
  try {
    await requirePermission(PERMISSIONS.DONATIONS_VIEW);
    const data = await db.select().from(donations).where(eq(donations.donorId, objectId(donorId, "donor id"))).orderBy(desc(donations.date));
    return { success: true, data: serializeRows(data) };
  } catch (error) {
    console.error("getDonorDonations Error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

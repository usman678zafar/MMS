import { z } from "zod";
import mongoose from "mongoose";
import { ROLES } from "@/lib/rbac";

const text = (max = 500) => z.string().trim().max(max);
const requiredText = (max = 200) => text(max).min(1);
const optionalText = (max = 500) => text(max).optional().default("");
const nonNegativeNumber = z.coerce.number().finite().min(0);
const dateString = z.string().trim().min(1).refine(
  (value) => !Number.isNaN(new Date(value).getTime()),
  "Invalid date",
);

export const objectId = (value, field = "id") => {
  if (
    typeof value !== "string" ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return new mongoose.Types.ObjectId(value);
};

export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 100);

export const parsePagination = (page, pageSize) => ({
  page: Math.max(1, Math.trunc(Number(page) || 1)),
  pageSize: Math.min(100, Math.max(1, Math.trunc(Number(pageSize) || 10))),
});

export const userCreateSchema = z.object({
  name: requiredText(100),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(Object.values(ROLES)).default(ROLES.VIEWER),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .extend({ password: z.string().min(8).max(128).optional().or(z.literal("")) });

export const studentSchema = z.object({
  name: requiredText(100),
  father_name: optionalText(100),
  religious_class: requiredText(50),
  contemporary_class: optionalText(50),
  admission_date: dateString,
  phone: optionalText(30),
  address: optionalText(500),
  gender: z.enum(["Male", "Female"]),
  monthly_fee: nonNegativeNumber,
  teacher_id: z.string().trim().optional().default(""),
  fee_status: z.enum(["Paid", "Unpaid"]).default("Unpaid"),
  progress_type: z.enum(["Qaida", "Nazra", "Hifz", "Girdan"]).default("Qaida"),
  progress_para: z.coerce.number().int().min(1).max(30).default(1),
  progress_surah: optionalText(100),
  is_active: z.boolean().default(true),
});

export const progressSchema = z.object({
  type: z.enum(["Qaida", "Nazra", "Hifz", "Girdan"]),
  para: z.coerce.number().int().min(1).max(30),
  surahNumber: z.union([z.literal(""), z.coerce.number().int().min(1).max(114)]).optional(),
  surah: optionalText(100),
  ayat: z.union([z.literal(""), z.coerce.number().int().min(1)]).optional(),
  notes: optionalText(1000),
  month: optionalText(20),
  year: z.union([z.literal(""), z.coerce.number().int().min(2000).max(2200)]).optional(),
});

export const feeSchema = z.object({
  amount: nonNegativeNumber,
  month: z.enum([
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]),
  year: z.coerce.number().int().min(2000).max(2200),
  notes: optionalText(500),
});

export const attendanceSchema = z.object({
  student_id: z.string().trim().min(1),
  status: z.enum(["Present", "Absent", "Late", "Leave"]),
  notes: optionalText(500),
});

export const studentNotesSchema = z.object({
  notes: optionalText(5000),
});

export const donorSchema = z.object({
  name: requiredText(100),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]).default(""),
  phone: optionalText(30),
  address: optionalText(500),
  is_active: z.boolean().default(true),
});

export const donationSchema = z.object({
  donor_id: z.string().trim().optional().default(""),
  amount: nonNegativeNumber,
  type: z.enum(["Sadqah", "Zakat", "Fitra", "Hadiya", "Other"]),
  date: dateString,
  notes: optionalText(1000),
  receipt_url: z.union([z.literal(""), z.string().url().max(2000)]).default(""),
});

export const expenseSchema = z.object({
  category: requiredText(50),
  amount: nonNegativeNumber,
  description: optionalText(1000),
  date: dateString,
});

export const inventorySchema = z.object({
  item_name: requiredText(100),
  category: requiredText(50),
  quantity: nonNegativeNumber,
  unit: requiredText(30),
});

export const staffSchema = z.object({
  name: requiredText(100),
  role: requiredText(50),
  monthly_salary: nonNegativeNumber,
  phone: optionalText(30),
  joining_date: dateString,
});

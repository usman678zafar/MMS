import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
const money = (name) => numeric(name, { precision: 14, scale: 2, mode: "number" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 30 }).notNull().default("viewer"),
    password: text("password").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    index("users_created_at_idx").on(table.createdAt),
    check(
      "users_role_check",
      sql`${table.role} in ('super_admin','admin','accountant','teacher','inventory_manager','viewer')`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 320 }).notNull(),
    count: integer("count").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("login_attempts_key_unique").on(table.key)],
);

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    monthlySalary: money("monthly_salary").notNull().default(0),
    phone: varchar("phone", { length: 30 }).notNull().default(""),
    joiningDate: timestamp("joining_date", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("staff_active_created_idx").on(table.isActive, table.createdAt),
    check("staff_salary_nonnegative", sql`${table.monthlySalary} >= 0`),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    fatherName: varchar("father_name", { length: 100 }).notNull().default(""),
    religiousClass: varchar("religious_class", { length: 50 }).notNull(),
    contemporaryClass: varchar("contemporary_class", { length: 50 })
      .notNull()
      .default("None"),
    admissionDate: timestamp("admission_date", { withTimezone: true }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull().default(""),
    address: text("address").notNull().default(""),
    gender: varchar("gender", { length: 10 }).notNull(),
    monthlyFee: money("monthly_fee").notNull().default(0),
    teacherId: uuid("teacher_id").references(() => staff.id, { onDelete: "set null" }),
    feeStatus: varchar("fee_status", { length: 10 }).notNull().default("Unpaid"),
    isActive: boolean("is_active").notNull().default(true),
    lastFeePaid: timestamp("last_fee_paid", { withTimezone: true }),
    currentProgress: jsonb("current_progress").notNull().default({}),
    profileNotes: text("profile_notes").notNull().default(""),
    documents: jsonb("documents").notNull().default([]),
    profilePhoto: jsonb("profile_photo"),
    ...timestamps,
  },
  (table) => [
    index("students_created_at_idx").on(table.createdAt),
    index("students_teacher_id_idx").on(table.teacherId),
    index("students_active_fee_idx").on(table.isActive, table.feeStatus),
    check("students_gender_check", sql`${table.gender} in ('Male','Female')`),
    check("students_fee_status_check", sql`${table.feeStatus} in ('Paid','Unpaid')`),
    check("students_monthly_fee_nonnegative", sql`${table.monthlyFee} >= 0`),
    check("students_current_progress_object_check", sql`jsonb_typeof(${table.currentProgress}) = 'object'`),
    check("students_documents_array_check", sql`jsonb_typeof(${table.documents}) = 'array'`),
  ],
);

export const studentProgresses = pgTable(
  "student_progresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => staff.id, { onDelete: "set null" }),
    type: varchar("type", { length: 20 }).notNull(),
    para: integer("para"),
    surahNumber: integer("surah_number"),
    surah: varchar("surah", { length: 100 }),
    ayat: integer("ayat"),
    notes: text("notes").notNull().default(""),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    index("student_progresses_student_date_idx").on(table.studentId, table.date),
    check("student_progress_type_check", sql`${table.type} in ('Qaida','Nazra','Hifz','Girdan')`),
    check("student_progress_para_check", sql`${table.para} is null or (${table.para} between 1 and 30)`),
    check("student_progress_surah_check", sql`${table.surahNumber} is null or (${table.surahNumber} between 1 and 114)`),
  ],
);

export const studentFees = pgTable(
  "student_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    amount: money("amount").notNull(),
    month: varchar("month", { length: 20 }).notNull(),
    year: integer("year").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("student_fees_student_period_unique").on(
      table.studentId,
      table.month,
      table.year,
    ),
    index("student_fees_student_date_idx").on(table.studentId, table.date),
    check("student_fees_amount_nonnegative", sql`${table.amount} >= 0`),
    check("student_fees_year_check", sql`${table.year} between 2000 and 2200`),
  ],
);

export const studentAttendance = pgTable(
  "student_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 10 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("student_attendance_student_date_unique").on(table.studentId, table.date),
    index("student_attendance_date_idx").on(table.date),
    check("student_attendance_status_check", sql`${table.status} in ('Present','Absent','Late','Leave')`),
  ],
);

export const donors = pgTable(
  "donors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull().default(""),
    phone: varchar("phone", { length: 30 }).notNull().default(""),
    address: text("address").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("donors_active_name_idx").on(table.isActive, table.name)],
);

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorId: uuid("donor_id").references(() => donors.id, { onDelete: "set null" }),
    amount: money("amount").notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    notes: text("notes").notNull().default(""),
    receiptUrl: text("receipt_url").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    index("donations_date_idx").on(table.date),
    index("donations_donor_date_idx").on(table.donorId, table.date),
    check("donations_amount_nonnegative", sql`${table.amount} >= 0`),
    check("donations_type_check", sql`${table.type} in ('Sadqah','Zakat','Fitra','Hadiya','Other')`),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: varchar("category", { length: 50 }).notNull(),
    amount: money("amount").notNull(),
    description: text("description").notNull().default(""),
    date: timestamp("date", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("expenses_date_idx").on(table.date),
    check("expenses_amount_nonnegative", sql`${table.amount} >= 0`),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemName: varchar("item_name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2, mode: "number" }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("inventory_item_name_idx").on(table.itemName),
    check("inventory_quantity_nonnegative", sql`${table.quantity} >= 0`),
  ],
);

export const migrationIdMap = pgTable(
  "migration_id_map",
  {
    sourceCollection: varchar("source_collection", { length: 100 }).notNull(),
    mongoId: varchar("mongo_id", { length: 24 }).notNull(),
    postgresId: uuid("postgres_id").notNull(),
    migratedAt: timestamp("migrated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("migration_id_map_source_mongo_unique").on(
      table.sourceCollection,
      table.mongoId,
    ),
    index("migration_id_map_postgres_idx").on(table.postgresId),
  ],
);

export const migrationArchive = pgTable("migration_archive", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceCollection: varchar("source_collection", { length: 100 }).notNull(),
  mongoId: varchar("mongo_id", { length: 24 }),
  reason: text("reason").notNull().default("Legacy MongoDB record"),
  original: jsonb("original").notNull(),
  backedUpAt: timestamp("backed_up_at", { withTimezone: true }).notNull().defaultNow(),
});

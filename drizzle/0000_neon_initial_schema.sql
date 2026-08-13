CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"type" varchar(20) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"receipt_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_amount_nonnegative" CHECK ("donations"."amount" >= 0),
	CONSTRAINT "donations_type_check" CHECK ("donations"."type" in ('Sadqah','Zakat','Fitra','Hadiya','Other'))
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(254) DEFAULT '' NOT NULL,
	"phone" varchar(30) DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(50) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_nonnegative" CHECK ("expenses"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_quantity_nonnegative" CHECK ("inventory"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(320) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_collection" varchar(100) NOT NULL,
	"mongo_id" varchar(24),
	"reason" text DEFAULT 'Legacy MongoDB record' NOT NULL,
	"original" jsonb NOT NULL,
	"backed_up_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_id_map" (
	"source_collection" varchar(100) NOT NULL,
	"mongo_id" varchar(24) NOT NULL,
	"postgres_id" uuid NOT NULL,
	"migrated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(50) NOT NULL,
	"monthly_salary" numeric(14, 2) DEFAULT 0 NOT NULL,
	"phone" varchar(30) DEFAULT '' NOT NULL,
	"joining_date" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_salary_nonnegative" CHECK ("staff"."monthly_salary" >= 0)
);
--> statement-breakpoint
CREATE TABLE "student_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"status" varchar(10) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_attendance_status_check" CHECK ("student_attendance"."status" in ('Present','Absent','Late','Leave'))
);
--> statement-breakpoint
CREATE TABLE "student_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"month" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_fees_amount_nonnegative" CHECK ("student_fees"."amount" >= 0),
	CONSTRAINT "student_fees_year_check" CHECK ("student_fees"."year" between 2000 and 2200)
);
--> statement-breakpoint
CREATE TABLE "student_progresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"teacher_id" uuid,
	"type" varchar(20) NOT NULL,
	"para" integer,
	"surah_number" integer,
	"surah" varchar(100),
	"ayat" integer,
	"notes" text DEFAULT '' NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_progress_type_check" CHECK ("student_progresses"."type" in ('Qaida','Nazra','Hifz','Girdan')),
	CONSTRAINT "student_progress_para_check" CHECK ("student_progresses"."para" is null or ("student_progresses"."para" between 1 and 30)),
	CONSTRAINT "student_progress_surah_check" CHECK ("student_progresses"."surah_number" is null or ("student_progresses"."surah_number" between 1 and 114))
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"father_name" varchar(100) DEFAULT '' NOT NULL,
	"religious_class" varchar(50) NOT NULL,
	"contemporary_class" varchar(50) DEFAULT 'None' NOT NULL,
	"admission_date" timestamp with time zone NOT NULL,
	"phone" varchar(30) DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"gender" varchar(10) NOT NULL,
	"monthly_fee" numeric(14, 2) DEFAULT 0 NOT NULL,
	"teacher_id" uuid,
	"fee_status" varchar(10) DEFAULT 'Unpaid' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fee_paid" timestamp with time zone,
	"current_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_notes" text DEFAULT '' NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"profile_photo" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_gender_check" CHECK ("students"."gender" in ('Male','Female')),
	CONSTRAINT "students_fee_status_check" CHECK ("students"."fee_status" in ('Paid','Unpaid')),
	CONSTRAINT "students_monthly_fee_nonnegative" CHECK ("students"."monthly_fee" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(30) DEFAULT 'viewer' NOT NULL,
	"password" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('super_admin','admin','accountant','teacher','inventory_manager','viewer'))
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progresses" ADD CONSTRAINT "student_progresses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progresses" ADD CONSTRAINT "student_progresses_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donations_date_idx" ON "donations" USING btree ("date");--> statement-breakpoint
CREATE INDEX "donations_donor_date_idx" ON "donations" USING btree ("donor_id","date");--> statement-breakpoint
CREATE INDEX "donors_active_name_idx" ON "donors" USING btree ("is_active","name");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inventory_item_name_idx" ON "inventory" USING btree ("item_name");--> statement-breakpoint
CREATE UNIQUE INDEX "login_attempts_key_unique" ON "login_attempts" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "migration_id_map_source_mongo_unique" ON "migration_id_map" USING btree ("source_collection","mongo_id");--> statement-breakpoint
CREATE INDEX "migration_id_map_postgres_idx" ON "migration_id_map" USING btree ("postgres_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "staff_active_created_idx" ON "staff" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "student_attendance_student_date_unique" ON "student_attendance" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "student_attendance_date_idx" ON "student_attendance" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "student_fees_student_period_unique" ON "student_fees" USING btree ("student_id","month","year");--> statement-breakpoint
CREATE INDEX "student_fees_student_date_idx" ON "student_fees" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "student_progresses_student_date_idx" ON "student_progresses" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "students_created_at_idx" ON "students" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "students_teacher_id_idx" ON "students" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "students_active_fee_idx" ON "students" USING btree ("is_active","fee_status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
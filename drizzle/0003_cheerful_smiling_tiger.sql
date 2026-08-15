ALTER TABLE "users" ADD COLUMN "language" varchar(5) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" varchar(10) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_language_check" CHECK ("users"."language" in ('en','ur'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_theme_check" CHECK ("users"."theme" in ('light','dark','system'));
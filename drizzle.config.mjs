import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("postgres")) {
  throw new Error("POSTGRES_URL (or a PostgreSQL DATABASE_URL) is required");
}

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});

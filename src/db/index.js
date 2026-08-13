import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const connectionString = databaseUrl?.startsWith("postgres")
  ? databaseUrl
  : "postgresql://not-configured:not-configured@localhost:5432/not-configured";

neonConfig.webSocketConstructor = ws;

const globalDatabase = globalThis;
export const pool =
  globalDatabase.__mmsPostgresPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalDatabase.__mmsPostgresPool = pool;
}

export const db = drizzle({ client: pool, schema });

const bcrypt = require("bcryptjs");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");

async function createSuperAdmin() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString?.startsWith("postgres")) throw new Error("POSTGRES_URL (or PostgreSQL DATABASE_URL) is required");
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  if (process.env.ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.query(
      `insert into users (email, name, role, password, is_active)
       values ($1, $2, 'super_admin', $3, true)
       on conflict (lower(email)) do update set role = 'super_admin', password = excluded.password, is_active = true, updated_at = now()`,
      [email, process.env.ADMIN_NAME || "Muhammad Usman", password],
    );
    console.log(`Super admin synchronized: ${email}`);
  } finally { await pool.end(); }
}

createSuperAdmin().catch((error) => { console.error(error); process.exitCode = 1; });

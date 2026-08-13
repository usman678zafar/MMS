import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { EJSON } from "bson";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const backupRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!backupRoot) throw new Error("Usage: npm run db:import:mongo -- <backup-directory>");
if (!postgresUrl?.startsWith("postgres")) throw new Error("POSTGRES_URL (or PostgreSQL DATABASE_URL) is required");

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: postgresUrl, max: 1 });
const idString = (value) => value == null ? null : typeof value.toHexString === "function" ? value.toHexString() : String(value);
const uuidFor = (collection, value) => {
  const bytes = crypto.createHash("sha256").update(`mms:${collection}:${idString(value)}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const asDate = (value, fallback = new Date()) => { const date = value ? new Date(value) : fallback; return Number.isNaN(date.getTime()) ? fallback : date; };
const asNumber = (value, fallback = 0) => { const number = Number(value?.valueOf?.() ?? value); return Number.isFinite(number) ? number : fallback; };
const normalizeExtendedJson = (value) => {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeExtendedJson);
  if (typeof value !== "object") return value;
  if (Object.keys(value).length === 1 && "$date" in value) {
    const date = new Date(value.$date);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeExtendedJson(item)]));
};
const cleanJson = (value, fallback) => value == null ? fallback : normalizeExtendedJson(JSON.parse(EJSON.stringify(value, { relaxed: true })));
const allowed = (value, values, fallback) => values.includes(value) ? value : fallback;

let manifest;
async function readCollection(name) {
  const file = path.join(backupRoot, `${name}.ejsonl`);
  try {
    const contents = await fs.readFile(file);
    const definition = manifest.collections.find((item) => item.name === name);
    if (!definition) throw new Error(`Collection ${name} is missing from the backup manifest`);
    if (contents.byteLength !== definition.bytes) throw new Error(`Backup byte count mismatch: ${name}`);
    if (crypto.createHash("sha256").update(contents).digest("hex") !== definition.sha256) throw new Error(`Backup checksum mismatch: ${name}`);
    const documents = contents.toString("utf8").split(/\r?\n/).filter(Boolean).map((line) => EJSON.parse(line, { relaxed: false }));
    if (documents.length !== definition.documents) throw new Error(`Backup document count mismatch: ${name}`);
    return documents;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const identifiers = (names) => names.map((name) => `"${name}"`).join(", ");
async function upsert(client, table, row, conflict = ["id"]) {
  const columns = Object.keys(row);
  const updates = columns.filter((column) => !conflict.includes(column)).map((column) => `"${column}" = excluded."${column}"`).join(", ");
  const query = `insert into "${table}" (${identifiers(columns)}) values (${columns.map((_, index) => `$${index + 1}`).join(", ")}) on conflict (${identifiers(conflict)}) do ${updates ? `update set ${updates}` : "nothing"}`;
  await client.query(query, Object.values(row));
}

async function remember(client, collection, mongoId, postgresId) {
  await upsert(client, "migration_id_map", { source_collection: collection, mongo_id: idString(mongoId), postgres_id: postgresId, migrated_at: new Date() }, ["source_collection", "mongo_id"]);
}

async function migrate() {
  manifest = JSON.parse(await fs.readFile(path.join(backupRoot, "manifest.json"), "utf8"));
  const archiveNames = manifest.collections.map((item) => item.name).filter((name) => name.startsWith("integrity_backup_"));
  const names = ["users", "sessions", "loginattempts", "staff", "staffs", "students", "studentprogresses", "studentfees", "studentattendance", "donors", "donations", "expenses", "inventory", ...archiveNames];
  const supported = new Set(names);
  const unsupported = manifest.collections.filter((item) => item.documents > 0 && !supported.has(item.name));
  if (unsupported.length) throw new Error(`Unsupported non-empty MongoDB collections: ${unsupported.map((item) => item.name).join(", ")}`);
  const source = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readCollection(name)])));
  const client = await pool.connect();
  const migrated = {};
  const bump = (name) => { migrated[name] = (migrated[name] || 0) + 1; };

  try {
    await client.query("begin");

    for (const item of source.users) {
      const id = uuidFor("users", item._id);
      await upsert(client, "users", { id, email: String(item.email || "").trim().toLowerCase(), name: String(item.name || "User").slice(0, 100), role: allowed(item.role, ["super_admin", "admin", "accountant", "teacher", "inventory_manager", "viewer"], "viewer"), password: String(item.password || ""), is_active: item.is_active !== false, created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "users", item._id, id); bump("users");
    }
    for (const sourceCollection of ["staff", "staffs"]) for (const item of source[sourceCollection]) {
      const id = uuidFor(sourceCollection, item._id);
      await upsert(client, "staff", { id, name: String(item.name || "Staff").slice(0, 100), role: String(item.role || "Staff").slice(0, 50), monthly_salary: Math.max(0, asNumber(item.monthly_salary)), phone: String(item.phone || "").slice(0, 30), joining_date: asDate(item.joining_date || item.created_at), is_active: item.is_active !== false, created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, sourceCollection, item._id, id); bump(sourceCollection);
    }
    for (const item of source.donors) {
      const id = uuidFor("donors", item._id);
      await upsert(client, "donors", { id, name: String(item.name || "Anonymous").slice(0, 100), email: String(item.email || "").slice(0, 254), phone: String(item.phone || "").slice(0, 30), address: String(item.address || ""), is_active: item.is_active !== false, created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "donors", item._id, id); bump("donors");
    }
    for (const item of source.students) {
      const id = uuidFor("students", item._id);
      const teacherId = item.teacher_id ? uuidFor("staff", item.teacher_id) : null;
      const religiousClass = item.religious_class || item.class || "Unassigned";
      const currentProgress = item.current_progress || { type: item.progress_type || "Qaida", para: asNumber(item.progress_para, 1), surah: item.progress_surah || "" };
      await upsert(client, "students", { id, name: String(item.name || "Student").slice(0, 100), father_name: String(item.father_name || "").slice(0, 100), religious_class: String(religiousClass).slice(0, 50), contemporary_class: String(item.contemporary_class || "None").slice(0, 50), admission_date: asDate(item.admission_date || item.created_at), phone: String(item.phone || "").slice(0, 30), address: String(item.address || ""), gender: allowed(item.gender, ["Male", "Female"], "Male"), monthly_fee: Math.max(0, asNumber(item.monthly_fee)), teacher_id: teacherId, fee_status: allowed(item.fee_status, ["Paid", "Unpaid"], "Unpaid"), is_active: item.is_active !== false, last_fee_paid: item.last_fee_paid ? asDate(item.last_fee_paid) : null, current_progress: JSON.stringify(cleanJson(currentProgress, {})), profile_notes: String(item.profile_notes || ""), documents: JSON.stringify(cleanJson(item.documents, [])), profile_photo: item.profile_photo == null ? null : JSON.stringify(cleanJson(item.profile_photo, null)), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "students", item._id, id); bump("students");
    }

    for (const item of source.sessions) {
      const id = uuidFor("sessions", item._id);
      await upsert(client, "sessions", { id, token_hash: String(item.token_hash), user_id: uuidFor("users", item.user_id), created_at: asDate(item.created_at), expires_at: asDate(item.expires_at) });
      await remember(client, "sessions", item._id, id); bump("sessions");
    }
    const attemptGroups = new Map();
    for (const item of source.loginattempts) {
      const key = String(item.identifier || item.key || "unknown").slice(0, 320);
      const group = attemptGroups.get(key) || { items: [], latest: new Date(0) };
      group.items.push(item);
      const createdAt = asDate(item.created_at || item.window_started_at);
      if (createdAt > group.latest) group.latest = createdAt;
      attemptGroups.set(key, group);
    }
    for (const [key, group] of attemptGroups) {
      const id = uuidFor("loginattempts-key", key);
      await upsert(client, "login_attempts", { id, key, count: group.items.length, window_started_at: group.latest, blocked_until: null, updated_at: group.latest }, ["key"]);
      for (const item of group.items) { await remember(client, "loginattempts", item._id, id); bump("loginattempts"); }
    }
    for (const item of source.studentprogresses) {
      const id = uuidFor("studentprogresses", item._id);
      await upsert(client, "student_progresses", { id, student_id: uuidFor("students", item.student_id), teacher_id: item.teacher_id ? uuidFor("staff", item.teacher_id) : null, type: allowed(item.type, ["Qaida", "Nazra", "Hifz", "Girdan"], "Qaida"), para: item.para == null ? null : Math.min(30, Math.max(1, asNumber(item.para, 1))), surah_number: item.surah_number == null ? null : Math.min(114, Math.max(1, asNumber(item.surah_number, 1))), surah: String(item.surah || "").slice(0, 100), ayat: item.ayat == null ? null : Math.max(1, asNumber(item.ayat, 1)), notes: String(item.notes || ""), date: asDate(item.date || item.created_at), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "studentprogresses", item._id, id); bump("studentprogresses");
    }
    for (const item of source.studentfees) {
      const id = uuidFor("studentfees", item._id);
      await upsert(client, "student_fees", { id, student_id: uuidFor("students", item.student_id), amount: Math.max(0, asNumber(item.amount)), month: String(item.month).slice(0, 20), year: asNumber(item.year), date: asDate(item.date || item.created_at), notes: String(item.notes || ""), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) }, ["student_id", "month", "year"]);
      await remember(client, "studentfees", item._id, id); bump("studentfees");
    }
    for (const item of source.studentattendance) {
      const id = uuidFor("studentattendance", item._id);
      await upsert(client, "student_attendance", { id, student_id: uuidFor("students", item.student_id), status: allowed(item.status, ["Present", "Absent", "Late", "Leave"], "Present"), date: asDate(item.date), notes: String(item.notes || ""), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) }, ["student_id", "date"]);
      await remember(client, "studentattendance", item._id, id); bump("studentattendance");
    }
    for (const item of source.donations) {
      const id = uuidFor("donations", item._id);
      await upsert(client, "donations", { id, donor_id: item.donor_id ? uuidFor("donors", item.donor_id) : null, amount: Math.max(0, asNumber(item.amount)), type: allowed(item.type, ["Sadqah", "Zakat", "Fitra", "Hadiya", "Other"], "Other"), date: asDate(item.date || item.created_at), notes: String(item.notes || ""), receipt_url: String(item.receipt_url || ""), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "donations", item._id, id); bump("donations");
    }
    for (const item of source.expenses) {
      const id = uuidFor("expenses", item._id);
      await upsert(client, "expenses", { id, category: String(item.category || "Other").slice(0, 50), amount: Math.max(0, asNumber(item.amount)), description: String(item.description || ""), date: asDate(item.date || item.created_at), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "expenses", item._id, id); bump("expenses");
    }
    for (const item of source.inventory) {
      const id = uuidFor("inventory", item._id);
      await upsert(client, "inventory", { id, item_name: String(item.item_name || "Item").slice(0, 100), category: String(item.category || "Other").slice(0, 50), quantity: Math.max(0, asNumber(item.quantity)), unit: String(item.unit || "unit").slice(0, 30), created_at: asDate(item.created_at), updated_at: asDate(item.updated_at || item.created_at) });
      await remember(client, "inventory", item._id, id); bump("inventory");
    }
    for (const archiveName of archiveNames) for (const item of source[archiveName]) {
      await upsert(client, "migration_archive", { id: uuidFor(archiveName, item._id), source_collection: String(item.source_collection || "unknown").slice(0, 100), mongo_id: idString(item.original?._id), reason: String(item.reason || "Legacy MongoDB record"), original: JSON.stringify(cleanJson(item.original, {})), backed_up_at: asDate(item.backed_up_at) });
      bump(archiveName);
    }

    const expected = Object.fromEntries(manifest.collections.filter((item) => !item.name.startsWith("integrity_backup_")).map((item) => [item.name, item.documents]));
    const mapCounts = Object.fromEntries((await client.query("select source_collection, count(*)::int as count from migration_id_map group by source_collection")).rows.map((row) => [row.source_collection, row.count]));
    const incomplete = Object.entries(expected).filter(([name, count]) => count && (mapCounts[name] || 0) < count);
    if (incomplete.length) throw new Error(`Migration verification failed: ${incomplete.map(([name, count]) => `${name} ${mapCounts[name] || 0}/${count}`).join(", ")}`);

    await client.query("commit");
    const report = { migratedAt: new Date().toISOString(), sourceBackup: backupRoot, sourceDatabase: manifest.database, sourceDocuments: manifest.totals.documents, migrated, verifiedMappings: mapCounts, note: "Checksums, document counts, relational inserts, and source-to-target mappings were verified." };
    const reportPath = path.join(backupRoot, "postgres-migration-report.json");
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ success: true, reportPath, ...report }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

migrate().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline");
const { EJSON } = require("bson");

const backupRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : null;
if (!backupRoot) {
  throw new Error("Usage: node scripts/verify-mongodb-backup.js <backup-directory>");
}

async function main() {
  const manifest = JSON.parse(
    await fsp.readFile(path.join(backupRoot, "manifest.json"), "utf8"),
  );
  let totalDocuments = 0;
  let totalBytes = 0;

  for (const collection of manifest.collections) {
    const filePath = path.join(backupRoot, collection.file);
    const hash = crypto.createHash("sha256");
    const hashStream = fs.createReadStream(filePath);
    for await (const chunk of hashStream) hash.update(chunk);
    const checksum = hash.digest("hex");
    if (checksum !== collection.sha256) {
      throw new Error(`Checksum mismatch: ${collection.file}`);
    }

    let count = 0;
    const lines = readline.createInterface({
      input: fs.createReadStream(filePath, "utf8"),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (!line) continue;
      EJSON.parse(line, { relaxed: false });
      count += 1;
    }
    if (count !== collection.documents) {
      throw new Error(
        `Document count mismatch for ${collection.name}: ${count} != ${collection.documents}`,
      );
    }
    const stats = await fsp.stat(filePath);
    if (stats.size !== collection.bytes) {
      throw new Error(`Byte count mismatch: ${collection.file}`);
    }
    totalDocuments += count;
    totalBytes += stats.size;
  }

  if (
    totalDocuments !== manifest.totals.documents ||
    totalBytes !== manifest.totals.bytes
  ) {
    throw new Error("Backup totals do not match manifest totals");
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        verified: true,
        backupRoot,
        collections: manifest.collections.length,
        documents: totalDocuments,
        bytes: totalBytes,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

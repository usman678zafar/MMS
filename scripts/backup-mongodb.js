const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { once } = require("node:events");
const { EJSON } = require("bson");
const { MongoClient } = require("mongodb");

const mongoUrl = process.env.MONGODB_URL || process.env.DATABASE_URL;
if (!mongoUrl?.startsWith("mongodb")) {
  throw new Error("MONGODB_URL (or a MongoDB DATABASE_URL) is required");
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupRoot = path.resolve(process.cwd(), "backups", `mongodb-${stamp}`);

const writeLine = async (stream, value) => {
  if (!stream.write(`${value}\n`)) await once(stream, "drain");
};

async function main() {
  await fsp.mkdir(backupRoot, { recursive: true });
  const client = new MongoClient(mongoUrl);
  await client.connect();

  try {
    const db = client.db();
    const collectionDefinitions = await db
      .listCollections({}, { nameOnly: false })
      .toArray();
    const manifest = {
      format: "mongodb-ejson-jsonl-v1",
      createdAt: new Date().toISOString(),
      database: db.databaseName,
      source: "MongoDB",
      collections: [],
      totals: { collections: 0, documents: 0, bytes: 0 },
    };

    for (const definition of collectionDefinitions
      .filter(({ name }) => !name.startsWith("system."))
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const collection = db.collection(definition.name);
      const fileName = `${definition.name}.ejsonl`;
      const filePath = path.join(backupRoot, fileName);
      const stream = fs.createWriteStream(filePath, {
        encoding: "utf8",
        flags: "wx",
      });
      const hash = crypto.createHash("sha256");
      stream.on("data", (chunk) => hash.update(chunk));

      let count = 0;
      const cursor = collection.find({}).sort({ _id: 1 });
      for await (const document of cursor) {
        const line = EJSON.stringify(document, { relaxed: false });
        hash.update(`${line}\n`);
        await writeLine(stream, line);
        count += 1;
      }
      stream.end();
      await once(stream, "finish");

      const fileStats = await fsp.stat(filePath);
      const indexes = await collection.indexes();
      const collectionManifest = {
        name: definition.name,
        type: definition.type,
        options: definition.options || {},
        file: fileName,
        documents: count,
        bytes: fileStats.size,
        sha256: hash.digest("hex"),
        indexes: EJSON.parse(EJSON.stringify(indexes, { relaxed: false })),
      };
      manifest.collections.push(collectionManifest);
      manifest.totals.documents += count;
      manifest.totals.bytes += fileStats.size;
    }

    manifest.totals.collections = manifest.collections.length;
    await fsp.writeFile(
      path.join(backupRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );

    const verification = {
      backupRoot,
      database: manifest.database,
      collections: manifest.totals.collections,
      documents: manifest.totals.documents,
      bytes: manifest.totals.bytes,
      counts: Object.fromEntries(
        manifest.collections.map((collection) => [
          collection.name,
          collection.documents,
        ]),
      ),
    };
    process.stdout.write(`${JSON.stringify(verification, null, 2)}\n`);
  } finally {
    await client.close();
  }
}

main().catch(async (error) => {
  await fsp.rm(backupRoot, { recursive: true, force: true }).catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
});

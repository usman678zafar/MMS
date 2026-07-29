const { MongoClient } = require("mongodb");

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new MongoClient(process.env.DATABASE_URL);

async function findOrphans(db, collectionName) {
  return db
    .collection(collectionName)
    .aggregate([
      { $match: { student_id: { $ne: null } } },
      {
        $lookup: {
          from: "students",
          localField: "student_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $match: { student: { $size: 0 } } },
      { $project: { student: 0 } },
    ])
    .toArray();
}

async function main() {
  await client.connect();
  const db = client.db();
  const backupName = `integrity_backup_${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")}`;
  const backup = db.collection(backupName);

  const duplicateFeeGroups = await db
    .collection("studentfees")
    .aggregate([
      { $sort: { updated_at: -1, date: -1, _id: -1 } },
      {
        $group: {
          _id: {
            student_id: "$student_id",
            month: "$month",
            year: "$year",
          },
          records: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  const duplicateFees = duplicateFeeGroups.flatMap((group) =>
    group.records.slice(1),
  );
  const orphanFees = await findOrphans(db, "studentfees");
  const orphanAttendance = await findOrphans(db, "studentattendance");
  const orphanProgress = await findOrphans(db, "studentprogresses");

  const backupRecords = [
    ...duplicateFees.map((original) => ({
      reason: "duplicate_fee_period",
      source_collection: "studentfees",
      original,
      backed_up_at: new Date(),
    })),
    ...orphanFees.map((original) => ({
      reason: "orphan_student",
      source_collection: "studentfees",
      original,
      backed_up_at: new Date(),
    })),
    ...orphanAttendance.map((original) => ({
      reason: "orphan_student",
      source_collection: "studentattendance",
      original,
      backed_up_at: new Date(),
    })),
    ...orphanProgress.map((original) => ({
      reason: "orphan_student",
      source_collection: "studentprogresses",
      original,
      backed_up_at: new Date(),
    })),
  ];

  if (backupRecords.length) await backup.insertMany(backupRecords);

  const uniqueIds = (documents) => [
    ...new Map(
      documents.map((document) => [document._id.toString(), document._id]),
    ).values(),
  ];
  const remove = async (collectionName, documents) => {
    const ids = uniqueIds(documents);
    if (ids.length) {
      await db.collection(collectionName).deleteMany({ _id: { $in: ids } });
    }
  };

  await remove("studentfees", [...duplicateFees, ...orphanFees]);
  await remove("studentattendance", orphanAttendance);
  await remove("studentprogresses", orphanProgress);

  for (const collectionName of [
    "users",
    "donors",
    "donations",
    "expenses",
    "staff",
    "inventory",
    "students",
    "studentfees",
    "studentattendance",
    "studentprogresses",
  ]) {
    await db.collection(collectionName).updateMany(
      { $or: [{ createdAt: { $exists: true } }, { updatedAt: { $exists: true } }] },
      [
        {
          $set: {
            created_at: { $ifNull: ["$created_at", "$createdAt"] },
            updated_at: { $ifNull: ["$updated_at", "$updatedAt"] },
          },
        },
        { $unset: ["createdAt", "updatedAt"] },
      ],
    );
  }

  await Promise.all([
    db.collection("studentfees").createIndex(
      { student_id: 1, month: 1, year: 1 },
      { unique: true, name: "student_fee_period_unique" },
    ),
    db.collection("studentattendance").createIndex(
      { student_id: 1, date: 1 },
      { unique: true, name: "student_attendance_date_unique" },
    ),
    db.collection("studentattendance").createIndex({ date: 1 }),
    db.collection("studentprogresses").createIndex({ student_id: 1, date: -1 }),
    db.collection("students").createIndex({ created_at: -1 }),
    db.collection("students").createIndex({ teacher_id: 1 }),
    db.collection("students").createIndex({ is_active: 1, fee_status: 1 }),
    db.collection("donations").createIndex({ date: -1 }),
    db.collection("donations").createIndex({ donor_id: 1, date: -1 }),
    db.collection("expenses").createIndex({ date: -1 }),
    db.collection("staff").createIndex({ is_active: 1, created_at: 1 }),
    db.collection("inventory").createIndex({ item_name: 1 }),
    db.collection("donors").createIndex({ is_active: 1, name: 1 }),
    db.collection("users").createIndex({ created_at: -1 }),
  ]);

  console.log(
    JSON.stringify(
      {
        backupCollection: backupRecords.length ? backupName : null,
        removedDuplicateFees: duplicateFees.length,
        removedOrphanFees: orphanFees.length,
        removedOrphanAttendance: orphanAttendance.length,
        removedOrphanProgress: orphanProgress.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());

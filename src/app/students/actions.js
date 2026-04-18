"use server";
import { connectDB } from "@/lib/mongoose";
import mongoose from "mongoose";
import {
  getPaginationParams,
  formatPaginatedResponse,
  PAGINATION_DEFAULTS,
} from "@/lib/pagination";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

export async function addStudent(studentData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    const data = {
      ...studentData,
      monthly_fee: studentData.monthly_fee
        ? parseFloat(studentData.monthly_fee)
        : 0,
      admission_date: studentData.admission_date
        ? new Date(studentData.admission_date)
        : null,
      teacher_id: studentData.teacher_id
        ? new mongoose.Types.ObjectId(studentData.teacher_id)
        : null,
      fee_status: studentData.fee_status || "Unpaid",
      current_progress: {
        type: studentData.progress_type || "Qaida",
        para: studentData.progress_para
          ? parseInt(studentData.progress_para)
          : 1,
        surah: studentData.progress_surah || "",
        last_updated: new Date(),
      },
      created_at: new Date(),
    };

    const result = await collection.insertOne(data);
    const sId = result.insertedId;

    // 2. Add initial history record
    const history = db.collection("studentprogresses");
    await history.insertOne({
      student_id: sId,
      teacher_id: data.teacher_id,
      type: data.current_progress.type,
      para: data.current_progress.para,
      surah: data.current_progress.surah,
      notes: "Initial enrollment progress",
      date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      success: true,
      data: serializeDocument({ ...data, id: sId.toString() }),
    };
  } catch (error) {
    console.error("addStudent Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStudent(id, studentData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    const updateData = {
      ...studentData,
      monthly_fee: studentData.monthly_fee
        ? parseFloat(studentData.monthly_fee)
        : 0,
      admission_date: studentData.admission_date
        ? new Date(studentData.admission_date)
        : null,
      updated_at: new Date(),
    };

    if (studentData.teacher_id) {
      updateData.teacher_id = new mongoose.Types.ObjectId(
        studentData.teacher_id,
      );
    }

    const result = await collection.updateOne(
      { _id: typeof id === "string" ? new mongoose.Types.ObjectId(id) : id },
      { $set: updateData },
    );
    return { success: true, data: serializeDocument(updateData) };
  } catch (error) {
    console.error("updateStudent Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudents(
  page = 1,
  pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  search = "",
  status = "",
) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { father_name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.is_active = status === "active";
    }

    // Get total count
    const totalItems = await collection.countDocuments(query);

    // Get paginated data with teacher join
    const { skip, limit } = getPaginationParams(page, pageSize);

    const data = await collection
      .aggregate([
        { $match: query },
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "staff",
            localField: "teacher_id",
            foreignField: "_id",
            as: "teacher",
          },
        },
        {
          $addFields: {
            teacher_name: { $arrayElemAt: ["$teacher.name", 0] },
            id: { $toString: "$_id" },
          },
        },
        { $project: { teacher: 0 } },
      ])
      .toArray();

    return formatPaginatedResponse(
      serializeDocuments(data),
      totalItems,
      page,
      pageSize,
    );
  } catch (error) {
    console.error("getStudents Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStudentStatus(id, is_active) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    await collection.updateOne(
      { _id: id },
      { $set: { is_active, updated_at: new Date() } },
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteStudent(id) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    await collection.deleteOne({
      _id: typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateStudentProgress(studentId, progressData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const history = db.collection("studentprogresses"); // Mongoose pluralizes by default

    const sId =
      typeof studentId === "string"
        ? new mongoose.Types.ObjectId(studentId)
        : studentId;

    // 1. Update current progress on student record
    const updateResult = await students.updateOne(
      { _id: sId },
      {
        $set: {
          current_progress: {
            ...progressData,
            para: parseInt(progressData.para),
            last_updated: new Date(),
          },
          updated_at: new Date(),
        },
      },
    );

    // 2. Record in history
    if (updateResult.modifiedCount > 0) {
      const student = await students.findOne({ _id: sId });
      await history.insertOne({
        student_id: sId,
        teacher_id: student.teacher_id,
        type: progressData.type,
        para: parseInt(progressData.para),
        surah: progressData.surah,
        notes: progressData.notes,
        date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("updateStudentProgress Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateFeeStatus(id, fee_status) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("students");

    await collection.updateOne(
      { _id: typeof id === "string" ? new mongoose.Types.ObjectId(id) : id },
      { $set: { fee_status, updated_at: new Date() } },
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getStudentProgressHistory(studentId) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("studentprogresses");

    const history = await collection
      .find({
        student_id:
          typeof studentId === "string"
            ? new mongoose.Types.ObjectId(studentId)
            : studentId,
      })
      .sort({ date: -1 })
      .toArray();

    return {
      success: true,
      data: serializeDocuments(history),
    };
  } catch (error) {
    console.error("getStudentProgressHistory Error:", error);
    return { success: false, error: error.message };
  }
}

export async function recordFeePayment(studentId, feeData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    const sId =
      typeof studentId === "string"
        ? new mongoose.Types.ObjectId(studentId)
        : studentId;

    // 1. Record in fees collection
    const payment = {
      student_id: sId,
      amount: parseFloat(feeData.amount),
      month: feeData.month, // e.g., "April"
      year: parseInt(feeData.year),
      date: new Date(),
      notes: feeData.notes || "",
      created_at: new Date(),
    };

    await fees.insertOne(payment);

    // 2. Update student fee status to Paid
    await students.updateOne(
      { _id: sId },
      {
        $set: {
          fee_status: "Paid",
          last_fee_paid: new Date(),
          updated_at: new Date(),
        },
      },
    );

    return { success: true };
  } catch (error) {
    console.error("recordFeePayment Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFeePayment(studentId, month, year) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    const sId =
      typeof studentId === "string"
        ? new mongoose.Types.ObjectId(studentId)
        : studentId;

    await fees.deleteMany({
      student_id: sId,
      month: month,
      year: parseInt(year),
    });

    await students.updateOne(
      { _id: sId },
      {
        $set: {
          fee_status: "Unpaid",
          updated_at: new Date(),
        },
      },
    );

    return { success: true };
  } catch (error) {
    console.error("deleteFeePayment Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBulkFeePayments(studentIds, month, year) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    const objectIds = studentIds.map((id) =>
      typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
    );

    await fees.deleteMany({
      student_id: { $in: objectIds },
      month: month,
      year: parseInt(year),
    });

    await students.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          fee_status: "Unpaid",
          updated_at: new Date(),
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error("deleteBulkFeePayments Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentFeeHistory(studentId) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("studentfees");

    const history = await collection
      .find({
        student_id:
          typeof studentId === "string"
            ? new mongoose.Types.ObjectId(studentId)
            : studentId,
      })
      .sort({ date: -1 })
      .toArray();

    return {
      success: true,
      data: serializeDocuments(history),
    };
  } catch (error) {
    console.error("getStudentFeeHistory Error:", error);
    return { success: false, error: error.message };
  }
}

export async function recordAttendance(attendanceRecords, dateString = null) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("studentattendance");

    const recordDate = dateString ? new Date(dateString) : new Date();
    recordDate.setHours(0, 0, 0, 0);

    // Clear existing records for this specific date
    await collection.deleteMany({
      date: recordDate,
    });

    const records = attendanceRecords.map((record) => ({
      student_id:
        typeof record.student_id === "string"
          ? new mongoose.Types.ObjectId(record.student_id)
          : record.student_id,
      status: record.status, // 'Present', 'Absent', 'Late', 'Leave'
      date: recordDate,
      notes: record.notes || "",
      created_at: new Date(),
    }));

    if (records.length > 0) {
      await collection.insertMany(records);
    }
    return { success: true };
  } catch (error) {
    console.error("recordAttendance Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAttendanceByDate(dateString) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("studentattendance");

    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const attendance = await collection
      .find({
        date: { $gte: date, $lt: nextDay },
      })
      .toArray();

    return { success: true, data: serializeDocuments(attendance) };
  } catch (error) {
    console.error("getAttendanceByDate Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentAttendanceReport(studentId) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("studentattendance");

    const sId =
      typeof studentId === "string"
        ? new mongoose.Types.ObjectId(studentId)
        : studentId;

    const stats = await collection
      .aggregate([
        { $match: { student_id: sId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    const formattedStats = stats.reduce(
      (acc, curr) => {
        acc[curr._id.toLowerCase()] = curr.count;
        return acc;
      },
      { present: 0, absent: 0, late: 0, leave: 0 },
    );

    return { success: true, data: formattedStats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getMonthlyFeeStatus(month, year) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("studentfees");

    const payments = await collection
      .find({
        month: month,
        year: parseInt(year),
      })
      .toArray();

    // Return a map of student_id -> true if paid
    const statusMap = payments.reduce((acc, p) => {
      acc[p.student_id.toString()] = true;
      return acc;
    }, {});

    return { success: true, data: statusMap };
  } catch (error) {
    console.error("getMonthlyFeeStatus Error:", error);
    return { success: false, error: error.message };
  }
}

export async function recordBulkFeePayments(paymentsData) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const students = db.collection("students");
    const fees = db.collection("studentfees");

    const feeRecords = paymentsData.map((data) => ({
      student_id:
        typeof data.studentId === "string"
          ? new mongoose.Types.ObjectId(data.studentId)
          : data.studentId,
      amount: parseFloat(data.amount || 0),
      month: data.month,
      year: parseInt(data.year),
      date: new Date(),
      notes: data.notes || "",
      created_at: new Date(),
    }));

    if (feeRecords.length > 0) {
      await fees.insertMany(feeRecords);

      const studentIds = feeRecords.map((r) => r.student_id);
      await students.updateMany(
        { _id: { $in: studentIds } },
        {
          $set: {
            fee_status: "Paid",
            last_fee_paid: new Date(),
            updated_at: new Date(),
          },
        },
      );
    }
    return { success: true };
  } catch (error) {
    console.error("recordBulkFeePayments Error:", error);
    return { success: false, error: error.message };
  }
}

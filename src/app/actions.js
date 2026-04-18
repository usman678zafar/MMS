"use server";
import { connectDB } from "@/lib/mongoose";
import mongoose from "mongoose";
import User from "@/models/User";
import { serializeDocument, serializeDocuments } from "@/lib/serialization";

export async function getDashboardStats() {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    const [
      donations,
      expenses,
      staffCount,
      inventoryCount,
      studentCount,
      pendingFeesCount,
    ] = await Promise.all([
      db.collection("donations").find({}).toArray(),
      db.collection("expenses").find({}).toArray(),
      db.collection("staff").countDocuments(),
      db.collection("inventory").countDocuments(),
      db.collection("students").countDocuments(),
      db.collection("students").countDocuments({ fee_status: "Unpaid" }),
    ]);

    return {
      success: true,
      totalDonations:
        donations?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
      totalExpenses:
        expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
      activeStaff: staffCount || 0,
      inventoryCount: inventoryCount || 0,
      studentCount: studentCount || 0,
      pendingFees: pendingFeesCount || 0,
    };
  } catch (error) {
    console.error("getDashboardStats Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getFinancialData() {
  try {
    const now = new Date();
    // Start from the beginning of the month 5 months ago
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    await connectDB();
    const db = mongoose.connection.db;

    const [donations, expenses] = await Promise.all([
      db
        .collection("donations")
        .find({ date: { $gte: sixMonthsAgo } })
        .toArray(),
      db
        .collection("expenses")
        .find({ date: { $gte: sixMonthsAgo } })
        .toArray(),
    ]);

    const ALL_MONTHS = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const data = [];
    for (let i = 5; i >= 0; i--) {
      // Calculate correct month and year
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();

      const monthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
      const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      const monthDonations = donations
        .filter((d) => {
          const d2 = new Date(d.date);
          return d2 >= monthStart && d2 <= monthEnd;
        })
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const monthExpenses = expenses
        .filter((e) => {
          const e2 = new Date(e.date);
          return e2 >= monthStart && e2 <= monthEnd;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      data.push({
        name: ALL_MONTHS[targetMonth],
        donations: monthDonations,
        expenses: monthExpenses,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("getFinancialData Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getRecentActivity() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const donationsCollection = db.collection("donations");

    const recentDonations = await donationsCollection
      .aggregate([
        { $sort: { created_at: -1 } },
        { $limit: 4 },
        {
          $lookup: {
            from: "donors",
            localField: "donor_id",
            foreignField: "_id",
            as: "donorData",
          },
        },
        {
          $unwind: {
            path: "$donorData",
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    const activities = recentDonations.map((donation) => ({
      type: "donation",
      amount: Number(donation.amount),
      donor: donation.donorData?.name || "Anonymous",
      date: donation.created_at,
    }));

    return { success: true, activities: serializeDocuments(activities) };
  } catch (error) {
    console.error("getRecentActivity Error:", error);
    return { success: false, error: error.message };
  }
}

"use server";

import mongoose from "mongoose";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { serializeDocuments } from "@/lib/serialization";

const sumAmount = (collection, match = {}) =>
  collection
    .aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])
    .toArray();

export async function getDashboardStats() {
  try {
    await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    const db = mongoose.connection.db;
    const [
      donationTotal,
      expenseTotal,
      staffCount,
      inventoryCount,
      studentCount,
      pendingFeesCount,
    ] = await Promise.all([
      sumAmount(db.collection("donations")),
      sumAmount(db.collection("expenses")),
      db.collection("staff").countDocuments({ is_active: { $ne: false } }),
      db.collection("inventory").countDocuments(),
      db.collection("students").countDocuments({ is_active: { $ne: false } }),
      db.collection("students").countDocuments({
        fee_status: "Unpaid",
        is_active: { $ne: false },
      }),
    ]);

    return {
      success: true,
      totalDonations: Number(donationTotal[0]?.total || 0),
      totalExpenses: Number(expenseTotal[0]?.total || 0),
      activeStaff: staffCount,
      inventoryCount,
      studentCount,
      pendingFees: pendingFeesCount,
    };
  } catch (error) {
    console.error("getDashboardStats Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getFinancialData() {
  try {
    await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    const db = mongoose.connection.db;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthlyPipeline = [
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
        },
      },
    ];
    const [donations, expenses] = await Promise.all([
      db.collection("donations").aggregate(monthlyPipeline).toArray(),
      db.collection("expenses").aggregate(monthlyPipeline).toArray(),
    ]);
    const key = (year, month) => `${year}-${month}`;
    const donationMap = new Map(
      donations.map((item) => [key(item._id.year, item._id.month), item.total]),
    );
    const expenseMap = new Map(
      expenses.map((item) => [key(item._id.year, item._id.month), item.total]),
    );
    const formatter = new Intl.DateTimeFormat("en", { month: "short" });
    const data = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = key(date.getFullYear(), date.getMonth() + 1);
      data.push({
        name: formatter.format(date),
        donations: Number(donationMap.get(monthKey) || 0),
        expenses: Number(expenseMap.get(monthKey) || 0),
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
    await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    const recentDonations = await mongoose.connection.db
      .collection("donations")
      .aggregate([
        { $sort: { created_at: -1, date: -1 } },
        { $limit: 4 },
        {
          $lookup: {
            from: "donors",
            localField: "donor_id",
            foreignField: "_id",
            as: "donorData",
          },
        },
        { $unwind: { path: "$donorData", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    return {
      success: true,
      activities: serializeDocuments(
        recentDonations.map((donation) => ({
          type: "donation",
          amount: Number(donation.amount),
          donor: donation.donorData?.name || "Anonymous",
          date: donation.created_at || donation.date,
        })),
      ),
    };
  } catch (error) {
    console.error("getRecentActivity Error:", error);
    return { success: false, error: error.message };
  }
}

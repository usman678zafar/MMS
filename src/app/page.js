"use client";
import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  DollarSign,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import NavigationLayout from "@/components/NavigationLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { PERMISSIONS } from "@/lib/rbac";

import {
  getDashboardStats,
  getFinancialData,
  getRecentActivity,
} from "./actions";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalExpenses: 0,
    activeStaff: 0,
    inventoryCount: 0,
  });
  const [financialData, setFinancialData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    async function fetchAllData() {
      try {
        const [statsRes, financialRes, activityRes] = await Promise.all([
          getDashboardStats(),
          getFinancialData(),
          getRecentActivity(),
        ]);

        if (statsRes.success) {
          setStats({
            totalDonations: statsRes.totalDonations,
            totalExpenses: statsRes.totalExpenses,
            activeStaff: statsRes.activeStaff,
            inventoryCount: statsRes.inventoryCount,
            studentCount: statsRes.studentCount,
            pendingFees: statsRes.pendingFees,
          });
        }

        if (financialRes.success) {
          setFinancialData(financialRes.data);
        }

        if (activityRes.success) {
          setRecentActivity(activityRes.activities);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  const cards = [
    {
      name: "Total Donations",
      value: `Rs ${stats.totalDonations.toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-emerald-500",
      trend: "+12%",
      trendUp: true,
    },
    {
      name: "Total Expenses",
      value: `Rs ${stats.totalExpenses.toLocaleString()}`,
      icon: TrendingDown,
      color: "bg-rose-500",
      trend: "+4%",
      trendUp: false,
    },
    {
      name: "Students Enrolled",
      value: stats.studentCount,
      icon: GraduationCap,
      color: "bg-indigo-500",
      trend: "Active",
      trendUp: true,
    },
    {
      name: "Fee Accountability",
      value: stats.pendingFees,
      icon: AlertTriangle,
      color: stats.pendingFees > 0 ? "bg-orange-500" : "bg-emerald-500",
      trend: stats.pendingFees > 0 ? "Unpaid" : "Clear",
      trendUp: stats.pendingFees === 0,
    },
    {
      name: "Active Staff",
      value: stats.activeStaff,
      icon: Users,
      color: "bg-amber-500",
      trend: "Stable",
      trendUp: true,
    },
    {
      name: "Inventory Items",
      value: stats.inventoryCount,
      icon: Wallet,
      color: "bg-blue-500",
      trend: "In Stock",
      trendUp: true,
    },
  ];

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.DASHBOARD_VIEW}>
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Dashboard Overview
            </h2>
            <p className="text-slate-500">
              Welcome back. Here&apos;s what&apos;s happening today.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
              <div
                key={card.name}
                className="bg-white p-5 rounded-2xl border border-slate-100 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.color} p-2.5 rounded-xl text-white `}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div
                    className={`flex items-center space-x-1 text-[10px] uppercase tracking-wider font-bold ${card.trendUp ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    <span>{card.trend}</span>
                    {card.trendUp ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                  </div>
                </div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-tight">
                  {card.name}
                </h3>
                <p className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 ">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 text-lg">
                  Finances Overview
                </h3>
                <select className="bg-slate-50 border-none rounded-lg text-sm px-3 py-1 text-slate-600 outline-none">
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div className="h-72">
                {hasMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialData}>
                      <defs>
                        <linearGradient
                          id="colorDonations"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.1}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="donations"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorDonations)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 ">
              <h3 className="font-bold text-slate-900 text-lg mb-6">
                Recent Activity
              </h3>
              <div className="space-y-6">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mr-4">
                        <DollarSign className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          New Donation Received
                        </p>
                        <p className="text-xs text-slate-500">
                          Rs {activity.amount.toLocaleString()} from{" "}
                          {activity.donor}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">
                      No recent activity found
                    </p>
                  </div>
                )}
              </div>
              <button className="w-full mt-6 py-2 text-primary-600 text-sm font-semibold hover:bg-primary-50 rounded-xl transition-colors">
                View All Activity
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}

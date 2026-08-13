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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { PERMISSIONS } from "@/lib/rbac";
import { useAuth } from "@/context/AuthContext";

import {
  getDashboardStats,
  getFinancialData,
  getRecentActivity,
} from "./actions";

const formatCurrency = (value) =>
  `Rs ${Math.round(Number(value) || 0).toLocaleString()}`;

export default function DashboardPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();
  const canLoadDashboard =
    !authLoading && Boolean(user) && hasPermission(PERMISSIONS.DASHBOARD_VIEW);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalExpenses: 0,
    activeStaff: 0,
    inventoryCount: 0,
    studentCount: 0,
    pendingFees: 0,
  });
  const [financialData, setFinancialData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (!canLoadDashboard) return;

    let cancelled = false;

    async function fetchAllData() {
      try {
        const [statsRes, financialRes, activityRes] = await Promise.all([
          getDashboardStats(),
          getFinancialData(),
          getRecentActivity(),
        ]);

        if (!cancelled && statsRes.success) {
          setStats({
            totalDonations: statsRes.totalDonations,
            totalExpenses: statsRes.totalExpenses,
            activeStaff: statsRes.activeStaff,
            inventoryCount: statsRes.inventoryCount,
            studentCount: statsRes.studentCount,
            pendingFees: statsRes.pendingFees,
          });
        }

        if (!cancelled && financialRes.success) {
          setFinancialData(financialRes.data);
        }

        if (!cancelled && activityRes.success) {
          setRecentActivity(activityRes.activities);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching dashboard data:", error);
        }
      }
    }

    const timer = setTimeout(() => {
      setHasMounted(true);
      fetchAllData();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canLoadDashboard]);

  const financeSummary = financialData.reduce(
    (summary, month) => ({
      donations: summary.donations + Number(month.donations || 0),
      expenses: summary.expenses + Number(month.expenses || 0),
    }),
    { donations: 0, expenses: 0 },
  );
  const netBalance = financeSummary.donations - financeSummary.expenses;

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
        <div className="dashboard-page space-y-6 min-[1700px]:space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Dashboard Overview
            </h2>
            <p className="text-slate-500">
              Welcome back. Here&apos;s what&apos;s happening today.
            </p>
          </div>

          <div className="metric-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
              <div
                key={card.name}
                className="metric-card group p-5"
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
            <div className="surface-card rounded-2xl p-4 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    Finances Overview
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Actual figures for the displayed period
                  </p>
                </div>
                <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  Last 6 months
                </span>
              </div>

              <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Donations
                  </p>
                  <p className="mt-1 text-base font-extrabold text-slate-900">
                    {formatCurrency(financeSummary.donations)}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                    Expenses
                  </p>
                  <p className="mt-1 text-base font-extrabold text-slate-900">
                    {formatCurrency(financeSummary.expenses)}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    netBalance >= 0
                      ? "border-blue-100 bg-blue-50/60"
                      : "border-amber-100 bg-amber-50/60"
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      netBalance >= 0 ? "text-blue-700" : "text-amber-700"
                    }`}
                  >
                    Net Balance
                  </p>
                  <p className="mt-1 text-base font-extrabold text-slate-900">
                    {formatCurrency(netBalance)}
                  </p>
                </div>
              </div>

              <div className="h-56 sm:h-64">
                {hasMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={financialData}
                      margin={{ top: 8, right: 10, left: 0, bottom: 5 }}
                      barGap={6}
                    >
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
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`
                        }
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          border: "1px solid #f1f5f9",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
                          fontSize: "12px",
                        }}
                        formatter={(value, name) => [
                          `Rs ${Number(value).toLocaleString()}`,
                          name.charAt(0).toUpperCase() + name.slice(1),
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                        formatter={(value) =>
                          value.charAt(0).toUpperCase() + value.slice(1)
                        }
                      />
                      <Bar
                        dataKey="donations"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="expenses"
                        fill="#f43f5e"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="surface-card rounded-2xl p-4 sm:p-6">
              <h3 className="font-bold text-slate-900 text-lg mb-6">
                Recent Activity
              </h3>
              <div className="space-y-6">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 sm:items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <DollarSign className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          New Donation Received
                        </p>
                        <p className="text-xs text-slate-500">
                          Rs {activity.amount.toLocaleString()} from{" "}
                          {activity.donor}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400 sm:text-xs">
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

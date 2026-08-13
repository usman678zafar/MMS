"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
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
import { useLanguage } from "@/context/LanguageContext";

import {
  getDashboardStats,
  getFinancialData,
  getRecentActivity,
} from "./actions";

const formatCurrency = (value) =>
  `Rs ${Math.round(Number(value) || 0).toLocaleString()}`;

export default function DashboardPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();
  const { t } = useLanguage();
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
  const [dataReady, setDataReady] = useState(false);

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
      } finally {
        if (!cancelled) setDataReady(true);
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
  const financialSeriesLabels = {
    donations: t("dashboard", "donations"),
    expenses: t("dashboard", "expenses"),
  };

  const cards = [
    {
      name: t("dashboard", "totalDonations"),
      value: `Rs ${stats.totalDonations.toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-emerald-500",
      trend: "+12%",
      trendUp: true,
    },
    {
      name: t("dashboard", "totalExpenses"),
      value: `Rs ${stats.totalExpenses.toLocaleString()}`,
      icon: TrendingDown,
      color: "bg-rose-500",
      trend: "+4%",
      trendUp: false,
    },
    {
      name: t("dashboard", "studentsEnrolled"),
      value: stats.studentCount,
      icon: GraduationCap,
      color: "bg-indigo-500",
      trend: t("dashboard", "active"),
      trendUp: true,
    },
    {
      name: t("dashboard", "feeAccountability"),
      value: stats.pendingFees,
      icon: AlertTriangle,
      color: stats.pendingFees > 0 ? "bg-orange-500" : "bg-emerald-500",
      trend: stats.pendingFees > 0 ? t("dashboard", "unpaid") : t("dashboard", "clear"),
      trendUp: stats.pendingFees === 0,
    },
    {
      name: t("dashboard", "activeStaff"),
      value: stats.activeStaff,
      icon: Users,
      color: "bg-amber-500",
      trend: t("dashboard", "stable"),
      trendUp: true,
    },
    {
      name: t("dashboard", "inventoryItems"),
      value: stats.inventoryCount,
      icon: Wallet,
      color: "bg-blue-500",
      trend: t("dashboard", "inStock"),
      trendUp: true,
    },
  ];

  return (
    <NavigationLayout>
      <ProtectedRoute requiredPermission={PERMISSIONS.DASHBOARD_VIEW}>
        <div className="dashboard-page space-y-6 min-[1700px]:space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t("dashboard", "overview")}
            </h2>
            <p className="text-slate-500">
              {t("dashboard", "welcomeBack")}
            </p>
          </div>

          <div className="data-stage metric-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" data-ready={dataReady} aria-busy={!dataReady}>
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
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${card.trendUp ? "text-emerald-600" : "text-rose-600"}`}
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
                <p dir="ltr" className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="data-stage grid grid-cols-1 gap-8 lg:grid-cols-2" data-ready={dataReady} aria-busy={!dataReady}>
            <div className="surface-card rounded-2xl p-4 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {t("dashboard", "financesOverview")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {t("dashboard", "actualFigures")}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  {t("dashboard", "lastSixMonths")}
                </span>
              </div>

              <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    {t("dashboard", "donations")}
                  </p>
                  <p dir="ltr" className="mt-1 text-base font-extrabold text-slate-900">
                    {formatCurrency(financeSummary.donations)}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                    {t("dashboard", "expenses")}
                  </p>
                  <p dir="ltr" className="mt-1 text-base font-extrabold text-slate-900">
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
                    {t("dashboard", "netBalance")}
                  </p>
                  <p dir="ltr" className="mt-1 text-base font-extrabold text-slate-900">
                    {formatCurrency(netBalance)}
                  </p>
                </div>
              </div>

              <div dir="ltr" className="h-56 sm:h-64">
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
                          financialSeriesLabels[name] || name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                        formatter={(value) => financialSeriesLabels[value] || value}
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
                {t("dashboard", "recentActivity")}
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
                          {t("dashboard", "newDonationReceived")}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span dir="ltr">Rs {activity.amount.toLocaleString()}</span>{" "}
                          {t("dashboard", "from")}{" "}
                          <bdi>{activity.donor}</bdi>
                        </p>
                      </div>
                      <span dir="ltr" className="shrink-0 text-[10px] font-medium text-slate-400 sm:text-xs">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">
                      {t("dashboard", "noRecentActivity")}
                    </p>
                  </div>
                )}
              </div>
              <Link
                href="/donations?tab=donations"
                className="mt-6 block w-full rounded-xl py-2 text-center text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50"
              >
                {t("dashboard", "viewAllActivity")}
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </NavigationLayout>
  );
}

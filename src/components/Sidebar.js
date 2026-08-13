"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { PERMISSIONS } from "@/lib/rbac";

const navigationItems = [
  {
    name: "Dashboard",
    translationKey: "dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    name: "Students",
    translationKey: "students",
    href: "/students",
    icon: GraduationCap,
    permission: PERMISSIONS.STUDENTS_VIEW,
  },
  {
    name: "Donations & Donors",
    translationKey: "donations",
    href: "/donations",
    icon: HandHeart,
    permission: PERMISSIONS.DONATIONS_VIEW,
  },
  {
    name: "Expenses",
    translationKey: "expenses",
    href: "/expenses",
    icon: Receipt,
    permission: PERMISSIONS.EXPENSES_VIEW,
  },
  {
    name: "Staff",
    translationKey: "staff",
    href: "/staff",
    icon: Users,
    permission: PERMISSIONS.STAFF_VIEW,
  },
  {
    name: "Inventory",
    translationKey: "inventory",
    href: "/inventory",
    icon: Package,
    permission: PERMISSIONS.INVENTORY_VIEW,
  },
  {
    name: "Users",
    translationKey: "users",
    href: "/users",
    icon: Settings,
    permission: PERMISSIONS.USERS_VIEW,
    admin: true,
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { signOut, profile, hasPermission } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const navigation = navigationItems.filter((item) =>
    hasPermission(item.permission),
  );

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:h-screen lg:w-[13.5rem] lg:translate-x-0 lg:shadow-none min-[1700px]:w-64 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 min-[1700px]:h-20 min-[1700px]:px-6">
          <Link href="/" onClick={onClose} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-lg font-bold text-white shadow-sm min-[1700px]:h-10 min-[1700px]:w-10 min-[1700px]:text-xl">
              M
            </div>
            <div>
              <p className="font-bold leading-none text-slate-950">MMS</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Madrasa Management
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 py-4 min-[1700px]:px-4 min-[1700px]:py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <nav aria-label="Main navigation" className="space-y-1.5">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <div
                  key={item.name}
                  className={item.admin ? "border-t border-slate-100 pt-3 mt-3" : ""}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors min-[1700px]:py-3 ${
                      isActive
                        ? "bg-primary-50 text-primary-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive
                          ? "text-primary-700"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{t("sidebar", item.translationKey)}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-600" />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-3 min-[1700px]:p-4">
          <div className="rounded-xl bg-slate-50 p-2.5 min-[1700px]:rounded-2xl min-[1700px]:p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold uppercase text-white">
                {profile?.full_name?.charAt(0) || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {profile?.full_name || "Admin User"}
                </p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {profile?.role?.replaceAll("_", " ") || "Admin"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

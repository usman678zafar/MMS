"use client";

import Link from "next/link";
import Image from "next/image";
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
  const { signOut, hasPermission } = useAuth();
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
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:h-screen lg:w-[13.5rem] lg:translate-x-0 lg:shadow-none min-[1700px]:w-60 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative flex h-28 shrink-0 items-center justify-center border-b border-slate-100 px-4 min-[1700px]:h-32 min-[1700px]:px-5">
          <Link href="/" onClick={onClose} aria-label="Madrasa Management dashboard" className="flex flex-col items-center gap-1.5 text-center">
            <Image src="/logo-mark-black.svg" alt="Madrasa Management" width={68} height={68} className="h-16 w-16 shrink-0 min-[1700px]:h-[4.5rem] min-[1700px]:w-[4.5rem]" priority />
            <span className="whitespace-nowrap text-[11px] font-bold leading-none text-slate-900 min-[1700px]:text-xs">
              Madrasa Management System
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute right-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 py-4 min-[1700px]:px-4 min-[1700px]:py-6">
          <nav aria-label="Main navigation" className="space-y-1.5">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <div
                  key={item.name}
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

        <div className="flex shrink-0 justify-center border-t border-slate-100 px-3 py-4">
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            aria-label="Sign Out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

      </aside>
    </>
  );
}

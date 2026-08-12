"use client";

import { Globe, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const pageTitles = {
  "/": "Dashboard",
  "/students": "Students",
  "/donations": "Donations & Donors",
  "/expenses": "Expenses",
  "/staff": "Staff",
  "/inventory": "Inventory",
  "/users": "Users",
};

export default function Header({ onMenuClick }) {
  const { profile } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname();
  const pageTitle =
    Object.entries(pageTitles).find(([path]) =>
      path === "/" ? pathname === path : pathname.startsWith(path),
    )?.[1] || "Madrasa Management";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
              {pageTitle}
            </p>
            <p className="hidden text-xs text-slate-400 sm:block">
              Madrasa Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title="Toggle language"
          >
            <Globe className="h-4 w-4" />
            <span lang={language === "en" ? "ur" : "en"}>
              {language === "en" ? "اردو" : "EN"}
            </span>
          </button>

          <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 sm:flex">
            <div className="text-right">
              <p className="max-w-36 truncate text-xs font-bold text-slate-800">
                {profile?.full_name || "Admin User"}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {profile?.role?.replaceAll("_", " ") || "Admin"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-xs font-bold uppercase text-white">
              {profile?.full_name?.charAt(0) || "A"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

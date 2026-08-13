"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Globe, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const pageTitleKeys = {
  "/": "dashboard",
  "/students": "students",
  "/donations": "donations",
  "/expenses": "expenses",
  "/staff": "staff",
  "/inventory": "inventory",
  "/users": "users",
};

function getIslamicDate(locale) {
  const options = { day: "numeric", month: "long", year: "numeric" };

  try {
    return new Intl.DateTimeFormat(
      `${locale}-u-ca-islamic-umalqura`,
      options,
    ).format(new Date());
  } catch {
    return new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, options).format(
      new Date(),
    );
  }
}

export default function Header({ onMenuClick }) {
  const { profile } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [islamicDate, setIslamicDate] = useState({ english: "", arabic: "" });

  useEffect(() => {
    const updateDate = () => {
      setIslamicDate({
        english: getIslamicDate("en-GB"),
        arabic: getIslamicDate("ar-SA"),
      });
    };

    updateDate();
    const interval = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const pageTitleKey = pathname.match(/^\/students\/[^/]+$/)
    ? "studentProfile"
    : Object.entries(pageTitleKeys).find(([path]) =>
        path === "/" ? pathname === path : pathname.startsWith(path),
      )?.[1] || "fallback";
  const pageTitle = t("pages", pageTitleKey);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:px-5 md:flex-nowrap min-[1700px]:min-h-[3.75rem] min-[1700px]:gap-x-4 min-[1700px]:px-7">
        <div className="order-1 flex min-w-0 items-center gap-3">
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
            <p dir="ltr" className="hidden text-xs text-slate-400 sm:block">
              Madrasa Management System
            </p>
          </div>
        </div>

        <div className="order-3 flex w-full items-center justify-center gap-2 border-t border-slate-100 pt-2 md:order-2 md:w-auto md:border-0 md:pt-0">
          <CalendarDays className="hidden h-4 w-4 shrink-0 text-primary-700 sm:block" />
          <div className="flex min-w-0 items-center gap-2 text-center md:block md:text-left">
            <p dir="ltr" className="whitespace-nowrap text-[10px] font-bold leading-tight text-slate-700 min-[1700px]:text-[11px]">
              {islamicDate.english}
            </p>
            <span className="h-3 w-px bg-slate-200 md:hidden" aria-hidden="true" />
            <p lang="ar" dir="rtl" className="whitespace-nowrap text-xs leading-tight text-primary-700 min-[1700px]:text-sm">
              {islamicDate.arabic}
            </p>
          </div>
        </div>

        <div className="order-2 flex items-center gap-2 sm:gap-4 md:order-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title="Toggle language"
          >
            <Globe className="h-4 w-4" />
            <span lang={language === "en" ? "ur" : "en"}>
              {t("header", "toggleLang")}
            </span>
          </button>

          <div dir="ltr" className={`hidden items-center gap-3 lg:flex ${language === "ur" ? "border-r border-slate-200 pr-4" : "border-l border-slate-200 pl-4"}`}>
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

"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Globe, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

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
  const { language, toggleLanguage, theme, setTheme, t } = useLanguage();
  const [islamicDate, setIslamicDate] = useState({ english: "", arabic: "" });
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

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

  return (
    <header className="app-header sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="header-toolbar px-4 py-2 sm:px-5 min-[1700px]:px-7">
        <div className="header-search-group flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={t("header", "openNavigation")}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <label className="header-search relative block min-w-0">
            <span className="sr-only">{t("common", "search")}</span>
            <Search className="header-search-icon pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={`${t("common", "search")}...`}
              className="header-search-input h-9 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100"
            />
          </label>
        </div>

        <div className="header-date flex items-center justify-center gap-2">
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

        <div className="header-actions flex items-center gap-2 sm:gap-4">
          <label className="header-theme relative flex items-center text-slate-500" title={t("header", "colorTheme")}>
            <span className="sr-only">{t("header", "colorTheme")}</span>
            <ThemeIcon className="header-theme-icon pointer-events-none absolute h-4 w-4" aria-hidden="true" />
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              aria-label={t("header", "colorTheme")}
              className="header-theme-select h-9 cursor-pointer appearance-none rounded-xl border border-transparent bg-transparent py-1 text-xs font-bold outline-none transition-colors hover:bg-primary-50 hover:text-primary-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              <option value="system">{t("header", "themeSystem")}</option>
              <option value="light">{t("header", "themeLight")}</option>
              <option value="dark">{t("header", "themeDark")}</option>
            </select>
          </label>

          <button
            type="button"
            onClick={toggleLanguage}
            className="header-language flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title={t("header", "toggleLanguage")}
          >
            <Globe className="h-4 w-4" />
            <span lang={language === "en" ? "ur" : "en"}>
              {t("header", "toggleLang")}
            </span>
          </button>

          <div dir="ltr" className={`header-profile hidden items-center gap-3 lg:flex ${language === "ur" ? "border-r border-slate-200 pr-4" : "border-l border-slate-200 pl-4"}`}>
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

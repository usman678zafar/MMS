"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { translations } from "./translations";

const LANGUAGE_KEY = "app_lang";
const THEME_KEY = "app_theme";
const LANGUAGES = new Set(["en", "ur"]);
const THEMES = new Set(["light", "dark", "system"]);
const LanguageContext = createContext();

function applyLanguage(language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
}

function applyTheme(theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState("en");
  const [theme, setThemeState] = useState("system");
  const [mounted, setMounted] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);
    const nextLanguage = user
      ? (LANGUAGES.has(user.language) ? user.language : "en")
      : (LANGUAGES.has(savedLanguage) ? savedLanguage : "en");
    const nextTheme = user
      ? (THEMES.has(user.theme) ? user.theme : "system")
      : (THEMES.has(savedTheme) ? savedTheme : "system");

    applyLanguage(nextLanguage);
    applyTheme(nextTheme);
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    localStorage.setItem(THEME_KEY, nextTheme);

    const timer = window.setTimeout(() => {
      setLanguageState(nextLanguage);
      setThemeState(nextTheme);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!mounted) return;
    applyLanguage(language);
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language, mounted]);

  useEffect(() => {
    if (!mounted) return undefined;
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    if (theme !== "system") return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme, mounted]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === LANGUAGE_KEY && LANGUAGES.has(event.newValue)) setLanguageState(event.newValue);
      if (event.key === THEME_KEY && THEMES.has(event.newValue)) setThemeState(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const persistPreferences = useCallback((preferences) => {
    if (!user) return;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(preferences),
        });
        if (!response.ok) throw new Error("Unable to save preferences");
      })
      .catch((error) => console.error("Preference sync failed:", error));
  }, [user]);

  const setLanguage = useCallback((nextLanguage) => {
    if (!LANGUAGES.has(nextLanguage)) return;
    setLanguageState(nextLanguage);
    persistPreferences({ language: nextLanguage });
  }, [persistPreferences]);

  const setTheme = useCallback((nextTheme) => {
    if (!THEMES.has(nextTheme)) return;
    setThemeState(nextTheme);
    persistPreferences({ theme: nextTheme });
  }, [persistPreferences]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ur" : "en");
  }, [language, setLanguage]);

  const t = useCallback((section, key) => (
    translations[language]?.[section]?.[key] || translations.en?.[section]?.[key] || key
  ), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, theme, setTheme, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}

export const usePreferences = useLanguage;

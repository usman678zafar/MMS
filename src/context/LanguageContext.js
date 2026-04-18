"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "./translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("app_lang");
    if (savedLang) {
      setLanguage(savedLang);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("app_lang", language);
      document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ur" : "en"));
  };

  const t = (section, key) => {
    return translations[language]?.[section]?.[key] || translations["en"]?.[section]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

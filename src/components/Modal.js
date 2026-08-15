"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const sizeClasses = {
  default: "sm:max-w-lg",
  large: "sm:max-w-2xl",
  wide: "sm:max-w-4xl",
};

export default function Modal({ open, onClose, title, children, size = "default" }) {
  const { t } = useLanguage();
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`flex max-h-[calc(100dvh-1rem)] w-full flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] duration-200 animate-in slide-in-from-bottom-4 sm:max-h-[90vh] sm:rounded-2xl sm:pb-0 sm:zoom-in-95 ${sizeClasses[size] || sizeClasses.default}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label={t("common", "close")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

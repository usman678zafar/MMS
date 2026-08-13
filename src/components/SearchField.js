"use client";

import { Search } from "lucide-react";

export default function SearchField({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
      role="search"
      className="flex w-full min-w-0 gap-2 sm:max-w-md"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <button type="submit" className="btn btn-primary shrink-0 gap-2 px-4">
        <Search className="h-4 w-4" />
        <span className="hidden min-[420px]:inline">Search</span>
      </button>
    </form>
  );
}

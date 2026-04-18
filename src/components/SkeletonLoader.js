import React from "react";

// Base skeleton element component
const Skeleton = ({ className = "", children }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`}>
    {children}
  </div>
);

// Table skeleton loader
export const TableSkeleton = ({ columns = 5, rows = 10 }) => (
  <div className="space-y-1">
    {/* Header row */}
    <div className="grid gap-4 px-6 py-4 border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-4 w-20" />
      ))}
    </div>

    {/* Data rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={`row-${rowIndex}`}
        className="grid gap-4 px-6 py-4 border-b border-slate-50"
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4" />
        ))}
      </div>
    ))}
  </div>
);

// Card skeleton loader
export const CardSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={`card-${i}`}
        className="bg-white rounded-2xl border border-slate-100 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

// Stats bar skeleton loader
export const StatsSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={`stat-${i}`}
        className="bg-white rounded-2xl border border-slate-100 p-4 text-center"
      >
        <Skeleton className="h-8 w-16 mx-auto mb-2" />
        <Skeleton className="h-3 w-20 mx-auto" />
      </div>
    ))}
  </div>
);

// Form skeleton loader
export const FormSkeleton = () => (
  <div className="space-y-4">
    <div>
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    <div>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="flex gap-2 justify-end pt-2">
      <Skeleton className="h-10 w-20 rounded-lg" />
      <Skeleton className="h-10 w-24 rounded-lg" />
    </div>
  </div>
);

// Filter skeleton loader
export const FilterSkeleton = () => (
  <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1 max-w-sm">
      <Skeleton className="h-10 w-full pl-10 pr-4 rounded-xl" />
      <Skeleton className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" />
    </div>
    <Skeleton className="h-10 w-32 rounded-xl" />
  </div>
);

// Full page skeleton loader
export const FullPageSkeleton = ({ type = "table" }) => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>

    {/* Stats skeleton */}
    <StatsSkeleton />

    {/* Filters skeleton */}
    <FilterSkeleton />

    {/* Content skeleton */}
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-6">
        {type === "table" ? <TableSkeleton /> : <CardSkeleton />}
      </div>
    </div>
  </div>
);

export default Skeleton;

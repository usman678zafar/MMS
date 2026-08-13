"use client";
import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { calculatePagination, PAGINATION_DEFAULTS } from "@/lib/pagination";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
}) {
  const pagination = calculatePagination(currentPage, pageSize, totalItems);

  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];

    // Add first page
    if (pagination.startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            currentPage === 1
              ? "bg-primary-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          1
        </button>,
      );

      if (pagination.startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="px-3 py-2 text-slate-400">
            <MoreHorizontal className="h-4 w-4" />
          </span>,
        );
      }
    }

    // Add page range
    for (let i = pagination.startPage; i <= pagination.endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            currentPage === i
              ? "bg-primary-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {i}
        </button>,
      );
    }

    // Add last page
    if (pagination.endPage < totalPages) {
      if (pagination.endPage < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" className="px-3 py-2 text-slate-400">
            <MoreHorizontal className="h-4 w-4" />
          </span>,
        );
      }

      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            currentPage === totalPages
              ? "bg-primary-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {totalPages}
        </button>,
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-3 py-4 sm:flex-row sm:gap-4 sm:px-6">
      <div className="text-center text-xs text-slate-600 sm:text-left sm:text-sm">
        Showing {pagination.startIndex + 1} to {pagination.endIndex} of{" "}
        {totalItems} results
      </div>

      <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1 sm:gap-2 sm:pb-0">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          className={`p-2 rounded-lg transition-colors ${
            pagination.hasPrevPage
              ? "text-slate-600 hover:bg-slate-100"
              : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex shrink-0 items-center gap-1">{renderPageNumbers()}</div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className={`p-2 rounded-lg transition-colors ${
            pagination.hasNextPage
              ? "text-slate-600 hover:bg-slate-100"
              : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

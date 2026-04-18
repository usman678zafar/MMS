// Pagination constants
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 10,
  MAX_PAGE_BUTTONS: 5,
};

// Import serialization utility
import { serializeDocuments } from "./serialization.js";

// Pagination utility functions
export const calculatePagination = (page, pageSize, totalItems) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));

  // Calculate page range for display
  const halfMaxButtons = Math.floor(PAGINATION_DEFAULTS.MAX_PAGE_BUTTONS / 2);
  let startPage = Math.max(1, currentPage - halfMaxButtons);
  let endPage = Math.min(
    totalPages,
    startPage + PAGINATION_DEFAULTS.MAX_PAGE_BUTTONS - 1,
  );

  // Adjust start page if we're near the end
  if (endPage - startPage + 1 < PAGINATION_DEFAULTS.MAX_PAGE_BUTTONS) {
    startPage = Math.max(1, endPage - PAGINATION_DEFAULTS.MAX_PAGE_BUTTONS + 1);
  }

  return {
    currentPage,
    totalPages,
    startPage,
    endPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    startIndex: (currentPage - 1) * pageSize,
    endIndex: Math.min(currentPage * pageSize, totalItems),
  };
};

// Backend pagination helper
export const getPaginationParams = (page, pageSize) => {
  const skip = (page - 1) * pageSize;
  const limit = pageSize;
  return { skip, limit };
};

// Format pagination response
export const formatPaginatedResponse = (data, totalItems, page, pageSize) => {
  const pagination = calculatePagination(page, pageSize, totalItems);

  // Serialize all documents to remove ObjectIDs and other non-serializable objects
  const serializedData = serializeDocuments(data);

  return {
    success: true,
    data: serializedData,
    pagination: {
      page: pagination.currentPage,
      pageSize,
      totalItems,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
    },
  };
};

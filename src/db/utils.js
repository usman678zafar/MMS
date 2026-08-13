export function serializeRow(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeRow);
  if (typeof value !== "object") return value;
  if (Object.keys(value).length === 1 && "$date" in value) {
    const date = new Date(value.$date);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      serializeRow(item),
    ]),
  );
}

export const serializeRows = (rows) => rows.map(serializeRow);

export function getErrorMessage(error) {
  if (error?.name === "ZodError") return error.issues?.[0]?.message || "Invalid data";
  if (error?.code === "23505") return "A record with these details already exists";
  if (error?.code === "23503") return "This record is referenced by another record";
  return error?.message || "Unexpected database error";
}

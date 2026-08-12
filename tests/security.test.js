import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/rbac";
import {
  donationSchema,
  escapeRegex,
  objectId,
  parsePagination,
  studentNotesSchema,
  userCreateSchema,
} from "@/lib/validation";

describe("role permissions", () => {
  it("grants every permission to a super admin", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(ROLES.SUPER_ADMIN, permission)).toBe(true);
    }
  });

  it("does not allow a viewer to mutate data", () => {
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.STUDENTS_UPDATE)).toBe(false);
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_CREATE)).toBe(false);
  });
});

describe("input validation", () => {
  it("rejects weak passwords and unknown roles", () => {
    expect(() =>
      userCreateSchema.parse({
        name: "Test",
        email: "test@example.com",
        password: "short",
        role: "owner",
      }),
    ).toThrow();
  });

  it("strips fields that are not allowed for donations", () => {
    const parsed = donationSchema.parse({
      donor_id: "",
      amount: "100",
      type: "Zakat",
      date: "2026-07-29",
      notes: "",
      receipt_url: "",
      role: "super_admin",
    });
    expect(parsed.amount).toBe(100);
    expect(parsed).not.toHaveProperty("role");
  });

  it("rejects invalid MongoDB IDs", () => {
    expect(() => objectId("not-an-id")).toThrow("Invalid id");
  });

  it("bounds internal student notes", () => {
    expect(studentNotesSchema.parse({ notes: "Guardian follow-up" }).notes).toBe(
      "Guardian follow-up",
    );
    expect(() => studentNotesSchema.parse({ notes: "x".repeat(5001) })).toThrow();
  });
});

describe("query safety", () => {
  it("escapes regular-expression input", () => {
    expect(escapeRegex("(a+)+$")).toBe("\\(a\\+\\)\\+\\$");
  });

  it("bounds pagination", () => {
    expect(parsePagination(-10, 10000)).toEqual({ page: 1, pageSize: 100 });
  });
});

import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/rbac";
import {
  donationSchema,
  escapeRegex,
  objectId,
  parsePagination,
  studentNotesSchema,
  userCreateSchema,
  userPreferencesSchema,
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

  it("uses an explicit permission list instead of the role defaults", () => {
    const permissions = [PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.ATTENDANCE_VIEW];
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ATTENDANCE_VIEW, permissions)).toBe(true);
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.FEES_VIEW, permissions)).toBe(false);
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.STUDENTS_DELETE, [])).toBe(false);
  });

  it("never restricts a super admin with an override", () => {
    expect(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.USERS_DELETE, [])).toBe(true);
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

  it("rejects unknown permission values and removes duplicates", () => {
    const base = {
      name: "Permission Test",
      email: "permission@example.com",
      password: "strong-password",
      role: ROLES.VIEWER,
    };
    expect(
      userCreateSchema.parse({
        ...base,
        permissions: [PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.STUDENTS_VIEW],
      }).permissions,
    ).toEqual([PERMISSIONS.STUDENTS_VIEW]);
    expect(() =>
      userCreateSchema.parse({ ...base, permissions: ["database_owner"] }),
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

  it("accepts only supported personal preferences", () => {
    expect(userPreferencesSchema.parse({ language: "ur", theme: "dark" })).toEqual({
      language: "ur",
      theme: "dark",
    });
    expect(() => userPreferencesSchema.parse({ theme: "midnight" })).toThrow();
    expect(() => userPreferencesSchema.parse({ language: "en", role: "super_admin" })).toThrow();
    expect(() => userPreferencesSchema.parse({})).toThrow();
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

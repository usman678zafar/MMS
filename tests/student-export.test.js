import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  buildStudentsCsv,
  buildStudentsWorkbook,
  makeStudentExportRecord,
} from "@/lib/student-export";

const databaseRow = {
  id: "student-1",
  name: "Ayesha Noor",
  fatherName: "Muhammad Noor",
  gender: "Female",
  religiousClass: "Nazra",
  contemporaryClass: "Class 4",
  admissionDate: new Date("2025-01-15T00:00:00.000Z"),
  phone: "+92 300 1234567",
  address: "Karachi",
  isActive: true,
  monthlyFee: "2500.00",
  feeStatus: "Paid",
  lastFeePaid: new Date("2026-08-01T00:00:00.000Z"),
  currentProgress: { type: "Nazra", para: 8, surah: "Al-Anfal", ayat: 25 },
  profilePhoto: null,
  createdAt: new Date("2025-01-15T00:00:00.000Z"),
  religiousTeacherName: "Qari Imran",
};

describe("student exports", () => {
  it("maps permitted student, progress, and fee data", () => {
    const record = makeStudentExportRecord(databaseRow, { includeFees: true, includeProgress: true });

    expect(record).toMatchObject({
      studentName: "Ayesha Noor",
      gender: "Female",
      religiousClass: "Nazra",
      qariTeacher: "Qari Imran",
      schoolClass: "Class 4",
      status: "Active",
      monthlyFee: 2500,
      feeStatus: "Paid",
    });
    expect(record.quranicProgress).toContain("Para 8");
  });

  it("omits restricted fee and progress details", () => {
    const record = makeStudentExportRecord(databaseRow, { includeFees: false, includeProgress: false });

    expect(record).not.toHaveProperty("monthlyFee");
    expect(record.quranicProgress).toBe("Not recorded");
    expect(record.quranicProgressDetails).toEqual({});
  });

  it("creates safe, spreadsheet-compatible CSV", () => {
    const record = makeStudentExportRecord(
      { ...databaseRow, name: "=HYPERLINK(\"https://example.com\")" },
      { includeFees: true, includeProgress: true },
    );
    const csv = buildStudentsCsv([record], true);

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain("Gender");
    expect(csv).toContain("Profile Picture URL");
    expect(csv).toContain("'=HYPERLINK");
  });

  it("builds a styled and filterable Excel directory", async () => {
    const record = makeStudentExportRecord(databaseRow, { includeFees: true, includeProgress: true });
    const bytes = await buildStudentsWorkbook([record], {
      includeFees: true,
      exportedAt: new Date("2026-08-19T05:00:00.000Z"),
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    const worksheet = workbook.getWorksheet("Student Directory");

    expect(worksheet.getCell("C1").value).toBe("STUDENT DIRECTORY");
    expect(worksheet.getRow(5).values).toContain("Gender");
    expect(worksheet.autoFilter).toBeTruthy();
    expect(worksheet.views[0]).toMatchObject({ state: "frozen", xSplit: 2, ySplit: 5 });
    expect(worksheet.getCell("C6").value).toBe("Ayesha Noor");
  });
});

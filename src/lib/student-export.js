import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/r2";

const BRAND_GREEN = "047857";
const BRAND_DARK = "064E3B";
const BRAND_LIGHT = "ECFDF5";
const BORDER = "DDE7E3";
const TEXT = "1E293B";
const MUTED = "64748B";
const WHITE = "FFFFFF";
const PHOTO_LIMIT = 3 * 1024 * 1024;

const asDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateText = (value) => {
  const date = asDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const quranicProgressText = (progress) => {
  if (!progress || typeof progress !== "object" || !Object.keys(progress).length) return "Not recorded";
  const parts = [progress.type || "Quranic study"];
  if (progress.para) parts.push(`Para ${progress.para}`);
  if (progress.surah) parts.push(progress.surah);
  if (progress.ayat) parts.push(`Ayat ${progress.ayat}`);
  return parts.join(" | ");
};

export function makeStudentExportRecord(row, { includeFees, includeProgress }) {
  const progress = includeProgress ? row.currentProgress || {} : {};
  return {
    id: row.id,
    profilePhotoUrl: row.profilePhoto?.url || "",
    profilePhoto: row.profilePhoto || null,
    studentName: row.name,
    fatherGuardian: row.fatherName || "",
    gender: row.gender,
    religiousClass: row.religiousClass || "",
    qariTeacher: row.religiousTeacherName || "Unassigned",
    quranicProgress: quranicProgressText(progress),
    quranicProgressDetails: progress,
    schoolClass: row.contemporaryClass === "None" ? "Not enrolled" : row.contemporaryClass || "Not enrolled",
    admissionDate: asDate(row.admissionDate)?.toISOString() || null,
    phone: row.phone || "",
    address: row.address || "",
    status: row.isActive === false ? "Inactive" : "Active",
    ...(includeFees ? {
      monthlyFee: Number(row.monthlyFee || 0),
      feeStatus: row.feeStatus || "Unpaid",
      lastFeePaid: asDate(row.lastFeePaid)?.toISOString() || null,
    } : {}),
    createdAt: asDate(row.createdAt)?.toISOString() || null,
  };
}

const csvCell = (value) => {
  let text = value == null ? "" : String(value);
  // Prevent spreadsheet programs from treating user-entered values as formulas.
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function buildStudentsCsv(records, includeFees) {
  const columns = [
    ["Student ID", "id"],
    ["Student Name", "studentName"],
    ["Father / Guardian", "fatherGuardian"],
    ["Gender", "gender"],
    ["Religious Class", "religiousClass"],
    ["Qari / Teacher", "qariTeacher"],
    ["Quranic Progress", "quranicProgress"],
    ["School Class", "schoolClass"],
    ["Admission Date", "admissionDate"],
    ["Phone", "phone"],
    ["Address", "address"],
    ["Status", "status"],
    ...(includeFees ? [
      ["Monthly Fee (Rs)", "monthlyFee"],
      ["Fee Status", "feeStatus"],
      ["Last Fee Paid", "lastFeePaid"],
    ] : []),
    ["Profile Picture URL", "profilePhotoUrl"],
  ];
  const lines = [columns.map(([label]) => csvCell(label)).join(",")];
  records.forEach((record) => {
    lines.push(columns.map(([, key]) => csvCell(record[key])).join(","));
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

async function readStudentPhoto(profilePhoto) {
  if (!profilePhoto || typeof profilePhoto !== "object") return null;
  let input;

  if (profilePhoto.key && process.env.R2_BUCKET_NAME) {
    const object = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: profilePhoto.key,
    }));
    if (Number(object.ContentLength || 0) > PHOTO_LIMIT) return null;
    input = Buffer.from(await object.Body.transformToByteArray());
  } else if (
    profilePhoto.url &&
    process.env.R2_PUBLIC_URL &&
    profilePhoto.url.startsWith(process.env.R2_PUBLIC_URL.replace(/\/$/, ""))
  ) {
    const response = await fetch(profilePhoto.url, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok || Number(response.headers.get("content-length") || 0) > PHOTO_LIMIT) return null;
    input = Buffer.from(await response.arrayBuffer());
  }

  if (!input || !input.length || input.length > PHOTO_LIMIT) return null;
  return sharp(input)
    .rotate()
    .resize(96, 96, { fit: "cover", position: "attention" })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

async function loadStudentPhotos(records) {
  const photos = new Array(records.length).fill(null);
  let nextIndex = 0;
  const workerCount = Math.min(6, records.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < records.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        photos[index] = await readStudentPhoto(records[index].profilePhoto);
      } catch {
        // A broken/missing photo should never prevent the register export.
      }
    }
  }));

  return photos;
}

const thinBorder = {
  top: { style: "thin", color: { argb: BORDER } },
  left: { style: "thin", color: { argb: BORDER } },
  bottom: { style: "thin", color: { argb: BORDER } },
  right: { style: "thin", color: { argb: BORDER } },
};

export async function buildStudentsWorkbook(records, { includeFees, exportedAt }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Madrasa Management System";
  workbook.lastModifiedBy = "Madrasa Management System";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;
  workbook.subject = "Student records export";
  workbook.title = "Student Directory";
  workbook.company = "Madrasa Management System";

  const worksheet = workbook.addWorksheet("Student Directory", {
    properties: { defaultRowHeight: 19 },
    views: [{ state: "frozen", xSplit: 2, ySplit: 5, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: {
      oddFooter: "&LGenerated by Madrasa Management System&CPage &P of &N&R&D &T",
    },
  });

  const columns = [
    { header: "#", key: "serial", width: 6 },
    { header: "Photo", key: "photo", width: 12 },
    { header: "Student Name", key: "studentName", width: 23 },
    { header: "Father / Guardian", key: "fatherGuardian", width: 22 },
    { header: "Gender", key: "gender", width: 11 },
    { header: "Religious Class", key: "religiousClass", width: 17 },
    { header: "Qari / Teacher", key: "qariTeacher", width: 21 },
    { header: "Quranic Progress", key: "quranicProgress", width: 34 },
    { header: "School Class", key: "schoolClass", width: 16 },
    { header: "Admission Date", key: "admissionDate", width: 16 },
    { header: "Phone", key: "phone", width: 17 },
    { header: "Address", key: "address", width: 30 },
    { header: "Status", key: "status", width: 12 },
    ...(includeFees ? [
      { header: "Monthly Fee (Rs)", key: "monthlyFee", width: 17 },
      { header: "Fee Status", key: "feeStatus", width: 13 },
      { header: "Last Fee Paid", key: "lastFeePaid", width: 16 },
    ] : []),
  ];
  columns.forEach((definition, index) => {
    worksheet.getColumn(index + 1).width = definition.width;
  });
  const lastColumn = worksheet.getColumn(columns.length).letter;

  for (let rowNumber = 1; rowNumber <= 3; rowNumber += 1) {
    for (let column = 1; column <= columns.length; column += 1) {
      worksheet.getCell(rowNumber, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DARK } };
    }
  }
  worksheet.mergeCells(`A1:B3`);
  worksheet.mergeCells(`C1:${lastColumn}1`);
  worksheet.mergeCells(`C2:${lastColumn}2`);
  worksheet.mergeCells(`C3:${lastColumn}3`);
  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 22;
  worksheet.getCell("C1").value = "STUDENT DIRECTORY";
  worksheet.getCell("C1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: WHITE } };
  worksheet.getCell("C1").alignment = { vertical: "middle" };
  worksheet.getCell("C2").value = "Madrasa Management System | Complete student academic and contact register";
  worksheet.getCell("C2").font = { name: "Aptos", size: 10, color: { argb: "D1FAE5" } };
  worksheet.getCell("C3").value = `${records.length} student${records.length === 1 ? "" : "s"} | ${records.filter((record) => record.status === "Active").length} active | Exported ${dateText(exportedAt)}`;
  worksheet.getCell("C3").font = { name: "Aptos", size: 10, bold: true, color: { argb: "A7F3D0" } };

  try {
    const logo = await readFile(path.join(process.cwd(), "public", "logo-mark-white.png"));
    const logoId = workbook.addImage({ buffer: logo, extension: "png" });
    worksheet.addImage(logoId, { tl: { col: 0.55, row: 0.25 }, ext: { width: 54, height: 54 }, editAs: "oneCell" });
  } catch {
    worksheet.getCell("A1").value = "MMS";
    worksheet.getCell("A1").font = { size: 16, bold: true, color: { argb: WHITE } };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  }

  worksheet.getRow(4).height = 9;
  for (let column = 1; column <= columns.length; column += 1) {
    worksheet.getCell(4, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };
  }

  const headerRow = worksheet.getRow(5);
  headerRow.values = columns.map((column) => column.header);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_GREEN } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });
  worksheet.autoFilter = { from: "A5", to: `${lastColumn}5` };
  worksheet.pageSetup.printTitlesRow = "5:5";

  const photos = await loadStudentPhotos(records);
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const values = {
      serial: index + 1,
      photo: "No photo",
      studentName: record.studentName,
      fatherGuardian: record.fatherGuardian,
      gender: record.gender,
      religiousClass: record.religiousClass,
      qariTeacher: record.qariTeacher,
      quranicProgress: record.quranicProgress,
      schoolClass: record.schoolClass,
      admissionDate: dateText(record.admissionDate),
      phone: record.phone,
      address: record.address,
      status: record.status,
      ...(includeFees ? {
        monthlyFee: record.monthlyFee,
        feeStatus: record.feeStatus,
        lastFeePaid: dateText(record.lastFeePaid),
      } : {}),
    };
    const row = worksheet.addRow(columns.map((column) => values[column.key]));
    row.height = 48;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: TEXT } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: index % 2 === 0 ? WHITE : "F7FBF9" },
      };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: [1, 2, 5, 6, 9, 10, 13].includes(columnNumber) ? "center" : "left",
        wrapText: true,
      };
    });
    row.getCell(3).font = { name: "Aptos", size: 11, bold: true, color: { argb: BRAND_DARK } };
    row.getCell(2).font = { name: "Aptos", size: 8, italic: true, color: { argb: MUTED } };
    const statusCell = row.getCell(columns.findIndex((column) => column.key === "status") + 1);
    statusCell.font = { name: "Aptos", size: 10, bold: true, color: { argb: record.status === "Active" ? BRAND_GREEN : MUTED } };
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: record.status === "Active" ? "D1FAE5" : "F1F5F9" } };
    if (includeFees) {
      const feeColumn = columns.findIndex((column) => column.key === "monthlyFee") + 1;
      row.getCell(feeColumn).numFmt = '"Rs" #,##0.00';
      const feeStatusCell = row.getCell(columns.findIndex((column) => column.key === "feeStatus") + 1);
      feeStatusCell.font = { name: "Aptos", size: 10, bold: true, color: { argb: record.feeStatus === "Paid" ? BRAND_GREEN : "BE123C" } };
    }

    const thumbnail = photos[index];
    if (thumbnail) {
      row.getCell(2).value = "";
      const imageId = workbook.addImage({ buffer: thumbnail, extension: "png" });
      worksheet.addImage(imageId, {
        tl: { col: 1.28, row: row.number - 0.9 },
        ext: { width: 42, height: 42 },
        editAs: "oneCell",
      });
    }
  }

  const footerRow = worksheet.addRow([]);
  footerRow.height = 8;
  for (let column = 1; column <= columns.length; column += 1) {
    footerRow.getCell(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_GREEN } };
  }
  worksheet.getColumn(1).alignment = { horizontal: "center" };
  worksheet.getColumn(2).alignment = { horizontal: "center" };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

import ExcelJS from "exceljs";
import { z } from "zod";
import { AuditAction, Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { RequestMetadata } from "@/modules/audit/service";
export const STUDENT_IMPORT_HEADERS = [
  "Student ID",
  "Admission Number",
  "IEMIS ID",
  "First Name",
  "Middle Name",
  "Last Name",
  "Name in Nepali",
  "Gender",
  "DOB AD",
  "DOB BS",
  "Mobile",
  "Email",
  "Birth Registration Number",
  "Father Name",
  "Father Mobile",
  "Mother Name",
  "Mother Mobile",
  "Guardian Name",
  "Guardian Relationship",
  "Guardian Mobile",
  "Academic Year",
  "Class",
  "Section",
  "Roll Number",
  "Admission Date",
  "Permanent Address",
] as const;
const rowSchema = z.object({
  studentId: z.string().trim().min(1),
  admissionNumber: z.string().trim().min(1),
  iemisId: z.string().trim().optional(),
  firstName: z.string().trim().min(1),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1),
  nameInNepali: z.string().trim().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"]),
  dateOfBirthAd: z.date().optional(),
  dateOfBirthBs: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  birthRegistrationNumber: z.string().trim().optional(),
  fatherName: z.string().trim().optional(),
  fatherMobile: z.string().trim().optional(),
  motherName: z.string().trim().optional(),
  motherMobile: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianRelationship: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "GRANDPARENT",
    "SIBLING",
    "OTHER",
  ]),
  guardianMobile: z.string().trim().optional(),
  academicYear: z.string().trim().min(1),
  className: z.string().trim().min(1),
  section: z.string().trim().min(1),
  rollNumber: z.string().trim().optional(),
  admissionDate: z.date(),
  permanentAddress: z.string().trim().optional(),
});
export type ImportRowData = z.infer<typeof rowSchema> & {
  academicYearId: string;
  classId: string;
  sectionId: string;
};
type Actor = { schoolId: string; userId: string; metadata: RequestMetadata };
function cellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value) return String(value.text);
    if ("result" in value) return String(value.result ?? "");
  }
  return String(value).trim();
}
function parseDate(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");
const toJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function personName(value: string) {
  const parts = value.trim().split(/\s+/);
  const firstName = parts.shift() ?? value;
  const lastName = parts.pop() ?? "-";
  return {
    firstName,
    middleName: parts.join(" ") || null,
    lastName,
    normalizedName: normalize([firstName, ...parts, lastName].join(" ")),
  };
}
export async function previewStudentImport(file: File, actor: Actor) {
  if (file.size > 5 * 1024 * 1024)
    throw new ValidationError("Excel file must be 5 MB or smaller.");
  if (!/\.(xlsx)$/i.test(file.name))
    throw new ValidationError(
      "Upload an .xlsx workbook generated from the template.",
    );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("Students") ?? workbook.worksheets[0];
  if (!sheet)
    throw new ValidationError(
      "The workbook does not contain a Students sheet.",
    );
  const headerMap = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell((cell, column) =>
      headerMap.set(cellText(cell.value).toLocaleLowerCase("en-US"), column),
    );
  for (const header of STUDENT_IMPORT_HEADERS)
    if (!headerMap.has(header.toLocaleLowerCase("en-US")))
      throw new ValidationError(`Missing required column: ${header}.`);
  if (sheet.actualRowCount - 1 > 1000)
    throw new ValidationError(
      "A single import can contain at most 1,000 rows.",
    );
  const get = (row: ExcelJS.Row, header: string) =>
    cellText(
      row.getCell(headerMap.get(header.toLocaleLowerCase("en-US"))!).value,
    );
  const rawRows: {
    rowNumber: number;
    data: z.input<typeof rowSchema>;
    errors: string[];
  }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const studentId = get(row, "Student ID");
    const admissionNumber = get(row, "Admission Number");
    const firstName = get(row, "First Name");
    if (!studentId && !admissionNumber && !firstName) return;
    const gender = get(row, "Gender").toUpperCase() || "NOT_SPECIFIED";
    const relationship =
      get(row, "Guardian Relationship").toUpperCase().replace(/\s+/g, "_") ||
      "GUARDIAN";
    const dob = get(row, "DOB AD");
    const admission = get(row, "Admission Date");
    rawRows.push({
      rowNumber,
      data: {
        studentId,
        admissionNumber,
        iemisId: get(row, "IEMIS ID") || undefined,
        firstName,
        middleName: get(row, "Middle Name") || undefined,
        lastName: get(row, "Last Name"),
        nameInNepali: get(row, "Name in Nepali") || undefined,
        gender: gender as "MALE",
        dateOfBirthAd: parseDate(dob),
        dateOfBirthBs: get(row, "DOB BS") || undefined,
        mobile: get(row, "Mobile") || undefined,
        email: get(row, "Email") || undefined,
        birthRegistrationNumber:
          get(row, "Birth Registration Number") || undefined,
        fatherName: get(row, "Father Name") || undefined,
        fatherMobile: get(row, "Father Mobile") || undefined,
        motherName: get(row, "Mother Name") || undefined,
        motherMobile: get(row, "Mother Mobile") || undefined,
        guardianName: get(row, "Guardian Name") || undefined,
        guardianRelationship: relationship as "GUARDIAN",
        guardianMobile: get(row, "Guardian Mobile") || undefined,
        academicYear: get(row, "Academic Year"),
        className: get(row, "Class"),
        section: get(row, "Section"),
        rollNumber: get(row, "Roll Number") || undefined,
        admissionDate: parseDate(admission) as Date,
        permanentAddress: get(row, "Permanent Address") || undefined,
      },
      errors: [
        ...(!dob || parseDate(dob) ? [] : ["DOB AD is not a valid date."]),
        ...(!admission || parseDate(admission)
          ? []
          : ["Admission Date is not a valid date."]),
      ],
    });
  });
  if (!rawRows.length)
    throw new ValidationError(
      "The workbook does not contain any student rows.",
    );
  const [years, classes, sections, existing] = await Promise.all([
    prisma.academicYear.findMany({ where: { schoolId: actor.schoolId } }),
    prisma.class.findMany({ where: { schoolId: actor.schoolId } }),
    prisma.section.findMany({
      where: { schoolId: actor.schoolId },
      include: { class: true },
    }),
    prisma.student.findMany({
      where: {
        schoolId: actor.schoolId,
        OR: [
          { studentId: { in: rawRows.map((r) => String(r.data.studentId)) } },
          {
            admissionNumber: {
              in: rawRows.map((r) => String(r.data.admissionNumber)),
            },
          },
          {
            iemisId: {
              in: rawRows
                .map((r) => r.data.iemisId)
                .filter((v): v is string => Boolean(v)),
            },
          },
          {
            birthRegistrationNumber: {
              in: rawRows
                .map((r) => r.data.birthRegistrationNumber)
                .filter((v): v is string => Boolean(v)),
            },
          },
          {
            normalizedName: {
              in: rawRows.map((r) =>
                normalize(
                  `${r.data.firstName} ${r.data.middleName ?? ""} ${r.data.lastName}`.replace(
                    /\s+/g,
                    " ",
                  ),
                ),
              ),
            },
          },
        ],
      },
      select: {
        id: true,
        studentId: true,
        admissionNumber: true,
        iemisId: true,
        birthRegistrationNumber: true,
        normalizedName: true,
        dateOfBirthAd: true,
      },
    }),
  ]);
  const seen = new Set<string>();
  const rows = [];
  let validRows = 0,
    duplicateRows = 0,
    errorRows = 0;
  for (const raw of rawRows) {
    const parsed = rowSchema.safeParse(raw.data);
    const errors = [
      ...raw.errors,
      ...(parsed.success
        ? []
        : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)),
    ];
    let data: ImportRowData | undefined;
    let duplicateStudentId: string | undefined;
    if (parsed.success) {
      const year = years.find(
        (v) => normalize(v.name) === normalize(parsed.data.academicYear),
      );
      const schoolClass = classes.find(
        (v) => normalize(v.name) === normalize(parsed.data.className),
      );
      const section = sections.find(
        (v) =>
          schoolClass &&
          v.classId === schoolClass.id &&
          normalize(v.name) === normalize(parsed.data.section),
      );
      if (!year)
        errors.push(
          `Academic year '${parsed.data.academicYear}' was not found.`,
        );
      if (!schoolClass)
        errors.push(`Class '${parsed.data.className}' was not found.`);
      if (!section)
        errors.push(
          `Section '${parsed.data.section}' was not found for the class.`,
        );
      if (year && schoolClass && section)
        data = {
          ...parsed.data,
          academicYearId: year.id,
          classId: schoolClass.id,
          sectionId: section.id,
        };
      const name = normalize(
        `${parsed.data.firstName} ${parsed.data.middleName ?? ""} ${parsed.data.lastName}`.replace(
          /\s+/g,
          " ",
        ),
      );
      const found = existing.find(
        (v) =>
          v.studentId === parsed.data.studentId ||
          v.admissionNumber === parsed.data.admissionNumber ||
          Boolean(parsed.data.iemisId && v.iemisId === parsed.data.iemisId) ||
          Boolean(
            parsed.data.birthRegistrationNumber &&
              v.birthRegistrationNumber === parsed.data.birthRegistrationNumber,
          ) ||
          (v.normalizedName === name &&
            Boolean(
              parsed.data.dateOfBirthAd &&
                v.dateOfBirthAd?.toISOString().slice(0, 10) ===
                  parsed.data.dateOfBirthAd.toISOString().slice(0, 10),
            )),
      );
      const rowKey = `${parsed.data.studentId}|${parsed.data.admissionNumber}|${parsed.data.iemisId ?? ""}`;
      if (found) duplicateStudentId = found.id;
      else if (seen.has(rowKey))
        errors.push(
          "Duplicate identifiers also appear earlier in this workbook.",
        );
      seen.add(rowKey);
    }
    const status: "VALID" | "DUPLICATE" | "ERROR" = errors.length
      ? "ERROR"
      : duplicateStudentId
        ? "DUPLICATE"
        : "VALID";
    if (status === "VALID") validRows++;
    else if (status === "DUPLICATE") duplicateRows++;
    else errorRows++;
    rows.push({
      rowNumber: raw.rowNumber,
      data: toJson(data ?? raw.data),
      status,
      errors: errors.length ? errors : undefined,
      duplicateStudentId,
    });
  }
  const batch = await prisma.studentImportBatch.create({
    data: {
      schoolId: actor.schoolId,
      fileName: file.name,
      totalRows: rows.length,
      validRows,
      duplicateRows,
      errorRows,
      createdById: actor.userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      rows: {
        create: rows.map((row) => ({
          schoolId: actor.schoolId,
          rowNumber: row.rowNumber,
          data: row.data,
          status: row.status,
          errors: row.errors as Prisma.InputJsonValue | undefined,
          duplicateStudentId: row.duplicateStudentId,
        })),
      },
    },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });
  return batch;
}
export async function confirmStudentImport(batchId: string, actor: Actor) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.studentImportBatch.findFirst({
        where: {
          id: batchId,
          schoolId: actor.schoolId,
          status: "VALIDATED",
          expiresAt: { gt: new Date() },
        },
        include: {
          rows: { where: { status: "VALID" }, orderBy: { rowNumber: "asc" } },
        },
      });
      if (!batch)
        throw new NotFoundError(
          "Import preview not found, expired, or already processed.",
        );
      await transaction.studentImportBatch.update({
        where: { id: batch.id },
        data: { status: "IMPORTING" },
      });
      let imported = 0;
      for (const row of batch.rows) {
        const data = row.data as unknown as ImportRowData;
        const student = await transaction.student.create({
          data: {
            schoolId: actor.schoolId,
            studentId: data.studentId,
            admissionNumber: data.admissionNumber,
            iemisId: data.iemisId || null,
            firstName: data.firstName,
            middleName: data.middleName || null,
            lastName: data.lastName,
            normalizedName: normalize(
              `${data.firstName} ${data.middleName ?? ""} ${data.lastName}`.replace(
                /\s+/g,
                " ",
              ),
            ),
            nameInNepali: data.nameInNepali || null,
            gender: data.gender,
            dateOfBirthAd: data.dateOfBirthAd
              ? new Date(data.dateOfBirthAd)
              : null,
            dateOfBirthBs: data.dateOfBirthBs || null,
            mobile: data.mobile || null,
            email: data.email ? normalize(data.email) : null,
            birthRegistrationNumber: data.birthRegistrationNumber || null,
            permanentAddress: data.permanentAddress || null,
            admissionDate: new Date(data.admissionDate),
            admissionAcademicYearId: data.academicYearId,
            admissionClassId: data.classId,
            status: "ACTIVE",
            createdById: actor.userId,
          },
        });
        const guardianName =
          data.guardianName || data.fatherName || data.motherName;
        const guardianMobile =
          data.guardianMobile || data.fatherMobile || data.motherMobile;
        if (guardianName && guardianMobile) {
          const names = personName(guardianName);
          const guardian = await transaction.guardian.create({
            data: {
              schoolId: actor.schoolId,
              ...names,
              mobile: guardianMobile,
              createdById: actor.userId,
            },
          });
          await transaction.studentGuardian.create({
            data: {
              schoolId: actor.schoolId,
              studentId: student.id,
              guardianId: guardian.id,
              relationship: data.guardianRelationship || "GUARDIAN",
              isPrimary: true,
              isEmergency: true,
            },
          });
        }
        await transaction.studentEnrollment.create({
          data: {
            schoolId: actor.schoolId,
            studentId: student.id,
            academicYearId: data.academicYearId,
            classId: data.classId,
            sectionId: data.sectionId,
            rollNumber: data.rollNumber || null,
            enrollmentDate: new Date(data.admissionDate),
            status: "ACTIVE",
            createdById: actor.userId,
          },
        });
        await transaction.studentImportRow.update({
          where: { id: row.id },
          data: { status: "IMPORTED", createdStudentId: student.id },
        });
        imported++;
      }
      await transaction.studentImportRow.updateMany({
        where: { batchId: batch.id, status: { in: ["DUPLICATE", "ERROR"] } },
        data: { status: "SKIPPED" },
      });
      await transaction.studentImportBatch.update({
        where: { id: batch.id },
        data: { status: "IMPORTED", importedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.STUDENT_IMPORTED,
          entityType: "StudentImportBatch",
          entityId: batch.id,
          description: `Imported ${imported} students from ${batch.fileName}; duplicate and invalid rows were skipped.`,
          newValue: {
            totalRows: batch.totalRows,
            imported,
            duplicates: batch.duplicateRows,
            errors: batch.errorRows,
          },
          ...actor.metadata,
        },
      });
      return {
        batchId: batch.id,
        imported,
        duplicates: batch.duplicateRows,
        errors: batch.errorRows,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError(
        "Import stopped because a student, enrollment, or roll identifier now conflicts with existing data. Revalidate the file.",
      );
    throw error;
  }
}
export async function createStudentTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nepal School ERP";
  const sheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(STUDENT_IMPORT_HEADERS);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF14532D" },
  };
  sheet.columns = STUDENT_IMPORT_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 2),
  }));
  sheet.addRow([
    "STU-001",
    "ADM-001",
    "",
    "Aarav",
    "",
    "Sharma",
    "आरव शर्मा",
    "MALE",
    "2014-04-12",
    "2071-12-29",
    "9800000000",
    "",
    "",
    "Ram Sharma",
    "9800000001",
    "Sita Sharma",
    "9800000002",
    "Ram Sharma",
    "FATHER",
    "9800000001",
    "2083",
    "Class 6",
    "A",
    "1",
    "2026-04-15",
    "Kathmandu",
  ]);
  const instructions = workbook.addWorksheet("Instructions");
  instructions.addRows([
    ["Nepal School ERP Student Import"],
    [
      "Keep the header names unchanged. Maximum 1,000 data rows and 5 MB per file.",
    ],
    [
      "Academic Year, Class, and Section names must already exist exactly in the school setup.",
    ],
    ["Allowed Gender values: MALE, FEMALE, OTHER, NOT_SPECIFIED."],
    [
      "Allowed Guardian Relationship values: FATHER, MOTHER, GUARDIAN, GRANDPARENT, SIBLING, OTHER.",
    ],
    [
      "Dates use YYYY-MM-DD. Preview and resolve errors before confirming import.",
    ],
    ["The sample row is an example; delete or replace it before upload."],
  ]);
  instructions.getColumn(1).width = 110;
  instructions.getRow(1).font = {
    bold: true,
    size: 16,
    color: { argb: "FF14532D" },
  };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

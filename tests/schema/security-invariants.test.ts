import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("database security invariants", () => {
  it("contains no plaintext password persistence field", async () => {
    const schema = await readFile(resolve("prisma/schema.prisma"), "utf8");
    expect(schema).toContain("passwordHash");
    expect(schema).not.toMatch(
      /\bplainPassword\b|\boriginalPassword\b|\bvisiblePassword\b/,
    );
  });

  it("defines tenant username uniqueness, session revocation, and restricted school ownership", async () => {
    const schema = await readFile(resolve("prisma/schema.prisma"), "utf8");
    expect(schema).toContain("@@unique([schoolId, normalizedUsername])");
    expect(schema).toContain("revokedAt");
    expect(schema).toContain("onDelete: Restrict");
    expect(schema).toContain("model AuditLog");
  });

  it("scopes every Phase 2 and student record to a school", async () => {
    const schema = await readFile(resolve("prisma/schema.prisma"), "utf8");
    for (const model of [
      "AcademicYear",
      "Class",
      "Section",
      "Subject",
      "ClassSubject",
      "Teacher",
      "TeacherAssignment",
      "Student",
      "Guardian",
      "StudentGuardian",
      "StudentEnrollment",
      "StudentImportBatch",
      "StudentImportRow",
    ]) {
      const block = schema.match(
        new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`),
      )?.[1];
      expect(block, `${model} must exist`).toBeDefined();
      expect(block, `${model} must have schoolId`).toMatch(
        /\bschoolId\s+String\b/,
      );
    }
  });

  it("preserves enrollment history and has no cascading student master deletion", async () => {
    const schema = await readFile(resolve("prisma/schema.prisma"), "utf8");
    expect(schema).toContain("@@unique([schoolId, studentId, academicYearId])");
    expect(schema).toMatch(/status\s+StudentStatus\s+@default\(ACTIVE\)/);
    expect(schema).not.toMatch(
      /model Student[\s\S]*?onDelete:\s*Cascade[\s\S]*?model Guardian/,
    );
  });

  it("scopes every Phase 4 through 8 operational record to a school", async () => {
    const schema = await readFile(resolve("prisma/schema.prisma"), "utf8");
    for (const model of [
      "AttendanceSession",
      "AttendanceRecord",
      "ExamType",
      "GradingScheme",
      "GradeRule",
      "Exam",
      "ExamSubject",
      "MarkSheet",
      "StudentMark",
      "StudentResult",
      "Chapter",
      "Topic",
      "Question",
      "QuestionOption",
      "SpecificationGrid",
      "SpecificationGridAllocation",
      "QuestionPaper",
      "QuestionPaperItem",
      "Notification",
      "NotificationReceipt",
    ]) {
      const block = schema.match(
        new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`),
      )?.[1];
      expect(block, `${model} must exist`).toBeDefined();
      expect(block, `${model} must have schoolId`).toMatch(
        /\bschoolId\s+String\b/,
      );
    }
  });

  it("enforces one attendance day, one student mark, and one result per exam", async () => {
    const schema = await readFile(resolve("prisma/schema.prisma"), "utf8");
    expect(schema).toContain(
      "@@unique([schoolId, academicYearId, classId, sectionId, date])",
    );
    expect(schema).toContain("@@unique([markSheetId, studentId])");
    expect(schema).toContain("@@unique([schoolId, examId, studentId])");
  });
});

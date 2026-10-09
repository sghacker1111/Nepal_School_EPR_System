import { describe, it, expect } from "vitest";
import {
  calculateGrade,
  calculateSubjectResult,
} from "@/modules/exams/calculation";
import {
  examSchema,
  examSubjectSchema,
  gradingSchemeSchema,
} from "@/modules/exams/validation";
import { CDC_GRADE_RULES } from "@/modules/academic/curriculum";
import { notificationSchema } from "@/modules/notifications/validation";
import { parseDateInput } from "@/lib/date-input";

describe("workflow regression cases", () => {
  const subject = {
    theoryFullMarks: 75,
    internalFullMarks: 25,
    practicalFullMarks: 0,
    theoryPassMarks: 26.25,
    internalPassMarks: 10,
    rules: CDC_GRADE_RULES,
  };
  it("does not hide failed theory behind internal marks", () => {
    expect(
      calculateSubjectResult({
        ...subject,
        theoryMarks: 25,
        internalMarks: 25,
      }),
    ).toMatchObject({ grade: "NG", passed: false, gradePoint: 0 });
    expect(
      calculateSubjectResult({
        ...subject,
        theoryMarks: 27,
        internalMarks: 10,
      }),
    ).toMatchObject({ grade: "D", passed: true });
  });
  it("does not silently turn blank components into zero", () => {
    expect(() =>
      calculateSubjectResult({ ...subject, theoryMarks: 60 }),
    ).toThrow(/every required/);
    expect(() =>
      calculateSubjectResult({
        ...subject,
        theoryMarks: 76,
        internalMarks: 20,
      }),
    ).toThrow(/component full/);
    expect(() =>
      calculateSubjectResult({
        ...subject,
        theoryMarks: -1,
        internalMarks: 20,
      }),
    ).toThrow();
  });
  it.each([-1, 101, NaN, Infinity])("rejects invalid percentage %s", (value) =>
    expect(() => calculateGrade(value, CDC_GRADE_RULES)).toThrow(),
  );
  it("keeps grade cutoffs deterministic at two decimals", () => {
    expect(calculateGrade(89.994, CDC_GRADE_RULES).grade).toBe("A");
    expect(calculateGrade(90, CDC_GRADE_RULES).grade).toBe("A+");
  });
  it("rejects overlapping or incomplete grade schemes", () => {
    const base = { name: "School scheme", code: "SCHOOL", isDefault: true };
    expect(
      gradingSchemeSchema.safeParse({ ...base, rules: CDC_GRADE_RULES })
        .success,
    ).toBe(true);
    expect(
      gradingSchemeSchema.safeParse({
        ...base,
        rules: CDC_GRADE_RULES.slice(1),
      }).success,
    ).toBe(false);
  });
  it("cannot publish by changing the exam setup status", () => {
    expect(
      examSchema.safeParse({
        academicYearId: "c1234567890123456789012345",
        examTypeId: "c1234567890123456789012346",
        name: "Final",
        startDate: "2026-01-01",
        endDate: "2026-01-02",
        status: "PUBLISHED",
      }).success,
    ).toBe(false);
  });
  it("rejects component pass marks exceeding the maximum", () => {
    expect(
      examSubjectSchema.safeParse({
        examId: "c1234567890123456789012345",
        classId: "c1234567890123456789012346",
        subjectId: "c1234567890123456789012347",
        theoryFullMarks: 75,
        practicalFullMarks: 0,
        internalFullMarks: 25,
        theoryPassMarks: 76,
        creditHour: 5,
      }).success,
    ).toBe(false);
  });
  it.each(["//evil.test", "/\\evil.test", "https://evil.test"])(
    "blocks external notification links %s",
    (link) => {
      expect(
        notificationSchema.safeParse({
          type: "GENERAL",
          title: "Notice",
          body: "Test notice",
          target: "ALL",
          link,
        }).success,
      ).toBe(false);
    },
  );
  it("validates calendar dates without rollover", () => {
    expect(parseDateInput("2026-02-30")).toBeUndefined();
    expect(parseDateInput("garbage")).toBeUndefined();
    expect(parseDateInput("2026-10-08")?.toISOString()).toBe(
      "2026-10-08T00:00:00.000Z",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  academicYearSchema,
  classSubjectSchema,
  subjectSchema,
} from "@/modules/academic/validation";

describe("academic setup validation", () => {
  it("requires an academic year to end after it starts", () => {
    expect(
      academicYearSchema.safeParse({
        name: "2083",
        startDate: "2026-04-14",
        endDate: "2027-04-13",
        isCurrent: true,
        status: "ACTIVE",
      }).success,
    ).toBe(true);
    expect(
      academicYearSchema.safeParse({
        name: "2083",
        startDate: "2027-04-13",
        endDate: "2026-04-14",
        isCurrent: true,
        status: "ACTIVE",
      }).success,
    ).toBe(false);
  });

  it("requires class-subject marks to reconcile", () => {
    const base = {
      academicYearId: "cm1234567890123456789012",
      classId: "cm1234567890123456789013",
      subjectId: "cm1234567890123456789014",
      fullMarks: 100,
      theoryMarks: 75,
      practicalMarks: 25,
      passMarks: 40,
      creditHour: 4,
      displayOrder: 1,
      status: "ACTIVE",
    };
    expect(classSubjectSchema.safeParse(base).success).toBe(true);
    expect(
      classSubjectSchema.safeParse({ ...base, practicalMarks: 20 }).success,
    ).toBe(false);
  });

  it("rejects pass marks above the available subject marks", () => {
    expect(
      subjectSchema.safeParse({
        name: "Science",
        code: "SCI",
        subjectType: "MIXED",
        theoryFullMarks: 75,
        practicalFullMarks: 25,
        passMarks: 101,
        status: "ACTIVE",
      }).success,
    ).toBe(false);
  });
});

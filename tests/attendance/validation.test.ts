import { describe, expect, it } from "vitest";
import { attendanceSheetSchema } from "@/modules/attendance/validation";

const ids = [
  "cm1234567890123456789012",
  "cm1234567890123456789013",
  "cm1234567890123456789014",
  "cm1234567890123456789015",
];

describe("attendance validation", () => {
  it("accepts a complete daily attendance sheet", () => {
    expect(
      attendanceSheetSchema.safeParse({
        academicYearId: ids[0],
        classId: ids[1],
        sectionId: ids[2],
        date: "2026-08-20",
        submit: true,
        records: [{ studentId: ids[3], status: "PRESENT", remarks: "" }],
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported statuses and empty sheets", () => {
    expect(
      attendanceSheetSchema.safeParse({
        academicYearId: ids[0],
        classId: ids[1],
        sectionId: ids[2],
        date: "2026-08-20",
        submit: false,
        records: [],
      }).success,
    ).toBe(false);
    expect(
      attendanceSheetSchema.safeParse({
        academicYearId: ids[0],
        classId: ids[1],
        sectionId: ids[2],
        date: "2026-08-20",
        submit: false,
        records: [{ studentId: ids[3], status: "MISSING" }],
      }).success,
    ).toBe(false);
  });
});

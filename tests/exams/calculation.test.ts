import { describe, expect, it } from "vitest";
import {
  calculateGpa,
  calculateGrade,
  calculateSubjectResult,
} from "@/modules/exams/calculation";

const rules = [
  { minimumPercentage: 90, maximumPercentage: 100, grade: "A+", gradePoint: 4 },
  {
    minimumPercentage: 80,
    maximumPercentage: 89.99,
    grade: "A",
    gradePoint: 3.6,
  },
  {
    minimumPercentage: 0,
    maximumPercentage: 79.99,
    grade: "B",
    gradePoint: 2.8,
  },
];

describe("central result calculation", () => {
  it("uses deterministic percentage boundaries", () => {
    expect(calculateGrade(90, rules)).toMatchObject({
      grade: "A+",
      gradePoint: 4,
    });
    expect(calculateGrade(89.99, rules)).toMatchObject({
      grade: "A",
      gradePoint: 3.6,
    });
  });

  it("validates a subject result from all mark components", () => {
    expect(
      calculateSubjectResult({
        theoryMarks: 60,
        practicalMarks: 20,
        internalMarks: 10,
        theoryFullMarks: 75,
        practicalFullMarks: 25,
        internalFullMarks: 10,
        passMarks: 35,
        rules,
      }),
    ).toMatchObject({
      totalMarks: 90,
      percentage: 81.82,
      grade: "A",
      passed: true,
    });
  });

  it("computes a credit-weighted GPA and preserves failure", () => {
    expect(
      calculateGpa([
        { gradePoint: 4, creditHour: 4, passed: true },
        { gradePoint: 2, creditHour: 2, passed: true },
      ]),
    ).toEqual({ gpa: 3.33, passed: true });
    expect(
      calculateGpa([
        { gradePoint: 4, creditHour: 4, passed: true },
        { gradePoint: null, creditHour: 2, passed: false },
      ]),
    ).toEqual({ gpa: 0, passed: false });
  });
});

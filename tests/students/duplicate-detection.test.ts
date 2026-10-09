import { describe, expect, it } from "vitest";

import {
  evaluateStudentDuplicate,
  type DuplicateSource,
} from "@/modules/students/duplicates";

const candidate: DuplicateSource = {
  id: "student-existing",
  studentId: "STU-001",
  admissionNumber: "ADM-001",
  iemisId: "IEMIS-100",
  birthRegistrationNumber: "BR-100",
  registrationNumber: "REG-100",
  normalizedName: "aarav sharma",
  dateOfBirthAd: new Date("2014-04-12"),
  previousSchool: "Shree Primary School",
  guardians: [
    {
      relationship: "FATHER",
      guardian: { normalizedName: "ram sharma", mobile: "9800000001" },
    },
    {
      relationship: "MOTHER",
      guardian: { normalizedName: "sita sharma", mobile: "9800000002" },
    },
  ],
};

describe("student duplicate confidence", () => {
  it("marks an exact IEMIS identifier as high confidence", () => {
    const match = evaluateStudentDuplicate(candidate, {
      normalizedName: "another name",
      iemisId: "IEMIS-100",
    });
    expect(match?.confidence).toBe("HIGH");
    expect(match?.reasons).toContain("Same IEMIS ID");
  });

  it("marks the same normalized name and date of birth as medium confidence", () => {
    const match = evaluateStudentDuplicate(candidate, {
      normalizedName: "aarav sharma",
      dateOfBirthAd: new Date("2014-04-12"),
    });
    expect(match?.confidence).toBe("MEDIUM");
  });

  it("does not flag a same-name-only student", () => {
    expect(
      evaluateStudentDuplicate(candidate, { normalizedName: "aarav sharma" }),
    ).toBeNull();
  });

  it("uses parent combinations without auto-blocking unrelated students", () => {
    const match = evaluateStudentDuplicate(candidate, {
      normalizedName: "aarav sharma",
      fatherName: "Ram Sharma",
    });
    expect(match?.reasons).toContain("Same full name and father name");
    expect(
      evaluateStudentDuplicate(candidate, {
        normalizedName: "aarav thapa",
        fatherName: "Hari Thapa",
      }),
    ).toBeNull();
  });
});

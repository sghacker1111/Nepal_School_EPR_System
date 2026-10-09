import { describe, expect, it } from "vitest";

import { enrollmentSchema, studentSchema } from "@/modules/students/validation";

const newStudent = {
  duplicateOverride: false,
  studentId: "STU-001",
  admissionNumber: "ADM-001",
  firstName: "Aarav",
  lastName: "Sharma",
  gender: "MALE",
  nationality: "Nepali",
  temporarySameAsPermanent: true,
  admissionDate: "2026-04-15",
  scholarshipStatus: false,
  transportationRequired: false,
  hostelStatus: false,
  disabilityStatus: false,
  academicYearId: "cm1234567890123456789012",
  classId: "cm1234567890123456789013",
  sectionId: "cm1234567890123456789014",
  enrollmentDate: "2026-04-15",
  fatherName: "Ram Sharma",
  fatherMobile: "9800000001",
  guardianRelationship: "FATHER",
  createLogin: false,
  status: "ACTIVE",
};

describe("student and enrollment validation", () => {
  it("accepts a new student with an initial enrollment and guardian", () => {
    expect(studentSchema.safeParse(newStudent).success).toBe(true);
  });

  it("rejects new students without enrollment history", () => {
    expect(
      studentSchema.safeParse({
        ...newStudent,
        academicYearId: "",
        classId: "",
        sectionId: "",
      }).success,
    ).toBe(false);
  });

  it("requires strong matching credentials when a student login is requested", () => {
    expect(
      studentSchema.safeParse({
        ...newStudent,
        createLogin: true,
        username: "aarav",
        temporaryPassword: "weak",
        confirmPassword: "weak",
      }).success,
    ).toBe(false);
    expect(
      studentSchema.safeParse({
        ...newStudent,
        createLogin: true,
        username: "aarav",
        temporaryPassword: "Temp@123456",
        confirmPassword: "Temp@123456",
      }).success,
    ).toBe(true);
  });

  it("requires the selected primary parent to have contact details", () => {
    expect(
      studentSchema.safeParse({ ...newStudent, guardianRelationship: "MOTHER" })
        .success,
    ).toBe(false);
    expect(
      studentSchema.safeParse({
        ...newStudent,
        guardianRelationship: "MOTHER",
        motherName: "Sita Sharma",
        motherMobile: "9800000098",
      }).success,
    ).toBe(true);
  });

  it("validates a historical promotion enrollment", () => {
    expect(
      enrollmentSchema.safeParse({
        studentId: "cm1234567890123456789011",
        academicYearId: "cm1234567890123456789012",
        classId: "cm1234567890123456789013",
        sectionId: "cm1234567890123456789014",
        rollNumber: "12",
        enrollmentDate: "2027-04-15",
        status: "ACTIVE",
        remarks: "Promoted",
      }).success,
    ).toBe(true);
  });
});

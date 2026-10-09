import { describe, expect, it } from "vitest";

import { createSchoolSchema } from "@/modules/schools/validation";

const acceptanceSchool = {
  name: "Midas Secondary School",
  code: "MIDAS001",
  iemisCode: "",
  type: "COMMUNITY",
  level: "Secondary",
  establishmentYear: 2001,
  registrationNumber: "",
  panVat: "",
  province: "Bagmati",
  district: "Kathmandu",
  localLevel: "Kathmandu Metropolitan City",
  ward: 10,
  tole: "New Baneshwor",
  address: "Kathmandu, Nepal",
  phone: "",
  mobile: "9800000000",
  email: "school@example.test",
  website: "",
  principalName: "Sita Shrestha",
  principalPhone: "9800000001",
  principalEmail: "",
  calendarPreference: "BOTH",
  defaultAcademicYear: "2083",
  defaultLanguage: "en",
  status: "ACTIVE",
  attendanceEnabled: true,
  examinationEnabled: true,
  questionBankEnabled: true,
  adminFullName: "Ram Sharma",
  adminUsername: "ram.admin",
  adminEmail: "ram@example.test",
  adminMobile: "9800000002",
  temporaryPassword: "Temp@123456",
  confirmPassword: "Temp@123456",
} as const;

describe("school creation validation", () => {
  it("accepts the required Midas school and administrator scenario", () => {
    const parsed = createSchoolSchema.safeParse(acceptanceSchool);
    expect(parsed.success).toBe(true);
  });

  it("rejects unsafe school codes and weak temporary passwords", () => {
    const parsed = createSchoolSchema.safeParse({
      ...acceptanceSchool,
      code: "midas school",
      temporaryPassword: "password",
      confirmPassword: "password",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.code).toBeDefined();
      expect(
        parsed.error.flatten().fieldErrors.temporaryPassword,
      ).toBeDefined();
    }
  });

  it("requires the password confirmation to match", () => {
    const parsed = createSchoolSchema.safeParse({
      ...acceptanceSchool,
      confirmPassword: "Different@12345",
    });
    expect(parsed.success).toBe(false);
  });
});

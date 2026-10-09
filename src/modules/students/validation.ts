import { z } from "zod";

const optionalText = z.string().trim().max(255).optional().or(z.literal(""));
const optionalDate = z.union([z.coerce.date(), z.literal("")]).optional();
const optionalEmail = z
  .union([z.string().trim().email(), z.literal("")])
  .optional();
const optionalWard = z
  .union([z.coerce.number().int().min(1).max(99), z.literal("")])
  .optional();

export const studentSchema = z
  .object({
    id: z.string().cuid().optional().or(z.literal("")),
    duplicateOverride: z.boolean(),
    studentId: z.string().trim().min(2).max(50),
    admissionNumber: z.string().trim().min(1).max(50),
    iemisId: optionalText,
    firstName: z.string().trim().min(1).max(80),
    middleName: optionalText,
    lastName: z.string().trim().min(1).max(80),
    nameInNepali: optionalText,
    gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"]),
    dateOfBirthBs: optionalText,
    dateOfBirthAd: optionalDate,
    bloodGroup: optionalText,
    nationality: z.string().trim().min(2).max(80),
    motherTongue: optionalText,
    religion: optionalText,
    birthRegistrationNumber: optionalText,
    citizenshipNumber: optionalText,
    mobile: optionalText,
    email: optionalEmail,
    permanentProvince: optionalText,
    permanentDistrict: optionalText,
    permanentLocalLevel: optionalText,
    permanentWard: optionalWard,
    permanentTole: optionalText,
    permanentAddress: optionalText,
    temporarySameAsPermanent: z.boolean(),
    temporaryProvince: optionalText,
    temporaryDistrict: optionalText,
    temporaryLocalLevel: optionalText,
    temporaryWard: optionalWard,
    temporaryTole: optionalText,
    temporaryAddress: optionalText,
    admissionDate: z.coerce.date(),
    admissionAcademicYearId: z.string().cuid().optional().or(z.literal("")),
    admissionClassId: z.string().cuid().optional().or(z.literal("")),
    previousSchool: optionalText,
    previousClass: optionalText,
    previousSchoolIemisCode: optionalText,
    registrationNumber: optionalText,
    scholarshipStatus: z.boolean(),
    scholarshipCategory: optionalText,
    transportationRequired: z.boolean(),
    hostelStatus: z.boolean(),
    ethnicityCategory: optionalText,
    disabilityStatus: z.boolean(),
    disabilityType: optionalText,
    economicStatus: optionalText,
    medicalNotes: optionalText,
    allergies: optionalText,
    academicYearId: z.string().cuid().optional().or(z.literal("")),
    classId: z.string().cuid().optional().or(z.literal("")),
    sectionId: z.string().cuid().optional().or(z.literal("")),
    rollNumber: optionalText,
    enrollmentDate: optionalDate,
    fatherName: optionalText,
    fatherOccupation: optionalText,
    fatherEducation: optionalText,
    fatherMobile: optionalText,
    motherName: optionalText,
    motherOccupation: optionalText,
    motherEducation: optionalText,
    motherMobile: optionalText,
    guardianName: optionalText,
    guardianRelationship: z.enum([
      "FATHER",
      "MOTHER",
      "GUARDIAN",
      "GRANDPARENT",
      "SIBLING",
      "OTHER",
    ]),
    guardianMobile: optionalText,
    guardianEmail: optionalEmail,
    emergencyContact: optionalText,
    createLogin: z.boolean(),
    username: optionalText,
    loginEmail: optionalEmail,
    temporaryPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    status: z.enum([
      "ACTIVE",
      "INACTIVE",
      "TRANSFERRED",
      "GRADUATED",
      "DROPPED",
      "ARCHIVED",
    ]),
  })
  .superRefine((data, context) => {
    if (
      !data.id &&
      (!data.academicYearId ||
        !data.classId ||
        !data.sectionId ||
        !data.enrollmentDate)
    )
      context.addIssue({
        code: "custom",
        path: ["academicYearId"],
        message:
          "Academic year, class, section, and enrollment date are required for a new student.",
      });
    if (!data.guardianName && !data.fatherName && !data.motherName)
      context.addIssue({
        code: "custom",
        path: ["guardianName"],
        message: "Add at least one parent or guardian.",
      });
    if (data.fatherName && !data.fatherMobile)
      context.addIssue({
        code: "custom",
        path: ["fatherMobile"],
        message: "Father mobile is required when father name is entered.",
      });
    if (data.motherName && !data.motherMobile)
      context.addIssue({
        code: "custom",
        path: ["motherMobile"],
        message: "Mother mobile is required when mother name is entered.",
      });
    if (data.guardianName && !data.guardianMobile)
      context.addIssue({
        code: "custom",
        path: ["guardianMobile"],
        message: "Guardian mobile is required when guardian name is entered.",
      });
    if (
      data.guardianRelationship === "FATHER" &&
      !data.fatherName &&
      !data.guardianName
    )
      context.addIssue({
        code: "custom",
        path: ["fatherName"],
        message: "Enter father details when father is the primary contact.",
      });
    if (
      data.guardianRelationship === "MOTHER" &&
      !data.motherName &&
      !data.guardianName
    )
      context.addIssue({
        code: "custom",
        path: ["motherName"],
        message: "Enter mother details when mother is the primary contact.",
      });
    if (data.disabilityStatus && !data.disabilityType)
      context.addIssue({
        code: "custom",
        path: ["disabilityType"],
        message: "Specify the disability type.",
      });
    if (data.scholarshipStatus && !data.scholarshipCategory)
      context.addIssue({
        code: "custom",
        path: ["scholarshipCategory"],
        message: "Specify the scholarship category.",
      });
    if (data.createLogin) {
      const password = data.temporaryPassword ?? "";
      if (!data.username || data.username.length < 3)
        context.addIssue({
          code: "custom",
          path: ["username"],
          message: "Username must contain at least 3 characters.",
        });
      if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
      )
        context.addIssue({
          code: "custom",
          path: ["temporaryPassword"],
          message:
            "Use 8+ characters with uppercase, lowercase, number, and special character.",
        });
      if (password !== data.confirmPassword)
        context.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Passwords do not match.",
        });
    }
  });

export const enrollmentSchema = z.object({
  studentId: z.string().cuid(),
  academicYearId: z.string().cuid(),
  classId: z.string().cuid(),
  sectionId: z.string().cuid(),
  rollNumber: optionalText,
  enrollmentDate: z.coerce.date(),
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
    "TRANSFERRED",
    "PROMOTED",
    "COMPLETED",
    "ARCHIVED",
  ]),
  remarks: optionalText,
});
export type StudentInput = z.infer<typeof studentSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

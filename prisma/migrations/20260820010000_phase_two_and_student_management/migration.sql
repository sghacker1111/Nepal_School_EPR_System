-- Phase 2 academic/teacher management and Phase 3 student management.
-- This migration is additive: historical Phase 1 records are preserved.

-- ExtendEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACADEMIC_YEAR_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACADEMIC_YEAR_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLASS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLASS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBJECT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBJECT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLASS_SUBJECT_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEACHER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEACHER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEACHER_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TEACHER_ASSIGNMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_DUPLICATE_OVERRIDE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_ENROLLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_PROMOTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_IMPORTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_IMPORT_FAILED';

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('THEORY', 'PRACTICAL', 'MIXED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'CONTRACT', 'PART_TIME', 'VOLUNTEER', 'OTHER');

-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE', 'RESIGNED', 'RETIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPPED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROMOTED', 'TRANSFERRED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('VALIDATED', 'IMPORTING', 'IMPORTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('VALID', 'DUPLICATE', 'ERROR', 'IMPORTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numericLevel" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shortName" TEXT,
    "subjectType" "SubjectType" NOT NULL DEFAULT 'THEORY',
    "theoryFullMarks" INTEGER NOT NULL DEFAULT 100,
    "practicalFullMarks" INTEGER NOT NULL DEFAULT 0,
    "passMarks" INTEGER,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "fullMarks" INTEGER NOT NULL,
    "theoryMarks" INTEGER NOT NULL,
    "practicalMarks" INTEGER NOT NULL DEFAULT 0,
    "passMarks" INTEGER,
    "creditHour" DECIMAL(5,2),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "teacherCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "nameInNepali" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'NOT_SPECIFIED',
    "dateOfBirth" TIMESTAMP(3),
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "qualification" TEXT,
    "specialization" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
    "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoStorageKey" TEXT,
    "citizenshipNumber" TEXT,
    "citizenshipIssueAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdById" TEXT,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assignmentKey" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "isClassTeacher" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "studentId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "iemisId" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "nameInNepali" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'NOT_SPECIFIED',
    "dateOfBirthBs" TEXT,
    "dateOfBirthAd" TIMESTAMP(3),
    "bloodGroup" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Nepali',
    "motherTongue" TEXT,
    "religion" TEXT,
    "photoStorageKey" TEXT,
    "birthRegistrationNumber" TEXT,
    "citizenshipNumber" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "permanentProvince" TEXT,
    "permanentDistrict" TEXT,
    "permanentLocalLevel" TEXT,
    "permanentWard" INTEGER,
    "permanentTole" TEXT,
    "permanentAddress" TEXT,
    "temporarySameAsPermanent" BOOLEAN NOT NULL DEFAULT true,
    "temporaryProvince" TEXT,
    "temporaryDistrict" TEXT,
    "temporaryLocalLevel" TEXT,
    "temporaryWard" INTEGER,
    "temporaryTole" TEXT,
    "temporaryAddress" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "admissionAcademicYearId" TEXT,
    "admissionClassId" TEXT,
    "previousSchool" TEXT,
    "previousClass" TEXT,
    "previousSchoolIemisCode" TEXT,
    "registrationNumber" TEXT,
    "scholarshipStatus" BOOLEAN NOT NULL DEFAULT false,
    "scholarshipCategory" TEXT,
    "transportationRequired" BOOLEAN NOT NULL DEFAULT false,
    "hostelStatus" BOOLEAN NOT NULL DEFAULT false,
    "ethnicityCategory" TEXT,
    "disabilityStatus" BOOLEAN NOT NULL DEFAULT false,
    "disabilityType" TEXT,
    "economicStatus" TEXT,
    "medicalNotes" TEXT,
    "allergies" TEXT,
    "metadata" JSONB,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdById" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "occupation" TEXT,
    "education" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "citizenshipNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "livesWith" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "rollNumber" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImportBatch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'VALIDATED',
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "duplicateRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3),

    CONSTRAINT "StudentImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImportRow" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "errors" JSONB,
    "duplicateStudentId" TEXT,
    "createdStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_isCurrent_status_idx" ON "AcademicYear"("schoolId", "isCurrent", "status");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_startDate_endDate_idx" ON "AcademicYear"("schoolId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Class_schoolId_status_displayOrder_idx" ON "Class"("schoolId", "status", "displayOrder");

-- CreateIndex
CREATE INDEX "Class_schoolId_numericLevel_idx" ON "Class"("schoolId", "numericLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Section_schoolId_classId_status_idx" ON "Section"("schoolId", "classId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Section_schoolId_classId_name_key" ON "Section"("schoolId", "classId", "name");

-- CreateIndex
CREATE INDEX "Subject_schoolId_name_idx" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Subject_schoolId_status_idx" ON "Subject"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");

-- CreateIndex
CREATE INDEX "ClassSubject_schoolId_academicYearId_classId_status_idx" ON "ClassSubject"("schoolId", "academicYearId", "classId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_schoolId_academicYearId_classId_subjectId_key" ON "ClassSubject"("schoolId", "academicYearId", "classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "Teacher_schoolId_normalizedName_idx" ON "Teacher"("schoolId", "normalizedName");

-- CreateIndex
CREATE INDEX "Teacher_schoolId_status_idx" ON "Teacher"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_teacherCode_key" ON "Teacher"("schoolId", "teacherCode");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_email_key" ON "Teacher"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_assignmentKey_key" ON "TeacherAssignment"("assignmentKey");

-- CreateIndex
CREATE INDEX "TeacherAssignment_schoolId_academicYearId_teacherId_idx" ON "TeacherAssignment"("schoolId", "academicYearId", "teacherId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_schoolId_classId_sectionId_subjectId_idx" ON "TeacherAssignment"("schoolId", "classId", "sectionId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_schoolId_normalizedName_idx" ON "Student"("schoolId", "normalizedName");

-- CreateIndex
CREATE INDEX "Student_schoolId_status_idx" ON "Student"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Student_schoolId_admissionAcademicYearId_admissionClassId_idx" ON "Student"("schoolId", "admissionAcademicYearId", "admissionClassId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_studentId_key" ON "Student"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_admissionNumber_key" ON "Student"("schoolId", "admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_iemisId_key" ON "Student"("schoolId", "iemisId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_birthRegistrationNumber_key" ON "Student"("schoolId", "birthRegistrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_registrationNumber_key" ON "Student"("schoolId", "registrationNumber");

-- CreateIndex
CREATE INDEX "Guardian_schoolId_normalizedName_idx" ON "Guardian"("schoolId", "normalizedName");

-- CreateIndex
CREATE INDEX "Guardian_schoolId_mobile_idx" ON "Guardian"("schoolId", "mobile");

-- CreateIndex
CREATE INDEX "StudentGuardian_schoolId_studentId_idx" ON "StudentGuardian"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "StudentGuardian_schoolId_guardianId_idx" ON "StudentGuardian"("schoolId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_studentId_guardianId_relationship_key" ON "StudentGuardian"("studentId", "guardianId", "relationship");

-- CreateIndex
CREATE INDEX "StudentEnrollment_schoolId_academicYearId_classId_sectionId_idx" ON "StudentEnrollment"("schoolId", "academicYearId", "classId", "sectionId", "status");

-- CreateIndex
CREATE INDEX "StudentEnrollment_schoolId_studentId_status_idx" ON "StudentEnrollment"("schoolId", "studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_schoolId_studentId_academicYearId_key" ON "StudentEnrollment"("schoolId", "studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_schoolId_academicYearId_classId_sectionId_key" ON "StudentEnrollment"("schoolId", "academicYearId", "classId", "sectionId", "rollNumber");

-- CreateIndex
CREATE INDEX "StudentImportBatch_schoolId_createdAt_idx" ON "StudentImportBatch"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentImportBatch_schoolId_status_expiresAt_idx" ON "StudentImportBatch"("schoolId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "StudentImportRow_schoolId_batchId_status_idx" ON "StudentImportRow"("schoolId", "batchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentImportRow_batchId_rowNumber_key" ON "StudentImportRow"("batchId", "rowNumber");

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_admissionAcademicYearId_fkey" FOREIGN KEY ("admissionAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_admissionClassId_fkey" FOREIGN KEY ("admissionClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StudentImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;


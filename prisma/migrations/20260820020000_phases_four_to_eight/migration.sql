-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MARK_ENTRY', 'VERIFICATION', 'APPROVED', 'PUBLISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "MarkSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'PUBLISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "SpecialMarkStatus" AS ENUM ('ABSENT', 'WITHHELD', 'EXEMPTED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'PASS', 'FAIL', 'WITHHELD', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'FILL_IN_BLANK', 'VERY_SHORT', 'SHORT', 'LONG', 'NUMERICAL', 'MATCHING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD');

-- CreateEnum
CREATE TYPE "CognitiveLevel" AS ENUM ('KNOWLEDGE', 'UNDERSTANDING', 'APPLICATION', 'HIGHER_ABILITY');

-- CreateEnum
CREATE TYPE "SpecificationGridStatus" AS ENUM ('DRAFT', 'VALID', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionPaperStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'ATTENDANCE', 'EXAM', 'RESULT', 'SECURITY', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ATTENDANCE_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'ATTENDANCE_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'ATTENDANCE_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'EXAM_TYPE_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'EXAM_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'EXAM_SUBJECT_CONFIGURED';
ALTER TYPE "AuditAction" ADD VALUE 'GRADING_SCHEME_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'MARKS_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'MARKS_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'MARKS_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'MARKS_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'MARKS_UNLOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'RESULT_CALCULATED';
ALTER TYPE "AuditAction" ADD VALUE 'RESULT_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'CHAPTER_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'TOPIC_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'QUESTION_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'QUESTION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'SPECIFICATION_GRID_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'QUESTION_PAPER_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'QUESTION_PAPER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_READ';

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "takenById" TEXT NOT NULL,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScheme" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradingSchemeId" TEXT NOT NULL,
    "minimumPercentage" DECIMAL(5,2) NOT NULL,
    "maximumPercentage" DECIMAL(5,2) NOT NULL,
    "grade" TEXT NOT NULL,
    "gradePoint" DECIMAL(4,2) NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "examTypeId" TEXT NOT NULL,
    "gradingSchemeId" TEXT,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "resultPublishDate" DATE,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "theoryFullMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "practicalFullMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "internalFullMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "passMarks" DECIMAL(7,2),
    "creditHour" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "examDate" DATE,
    "startTime" TEXT,
    "durationMinutes" INTEGER,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkSheet" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "enteredById" TEXT NOT NULL,
    "status" "MarkSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "unlockedAt" TIMESTAMP(3),
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMark" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "markSheetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "theoryMarks" DECIMAL(7,2),
    "practicalMarks" DECIMAL(7,2),
    "internalMarks" DECIMAL(7,2),
    "specialStatus" "SpecialMarkStatus",
    "totalMarks" DECIMAL(7,2),
    "percentage" DECIMAL(7,2),
    "grade" TEXT,
    "gradePoint" DECIMAL(4,2),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResult" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "totalFullMarks" DECIMAL(9,2) NOT NULL,
    "totalObtainedMarks" DECIMAL(9,2) NOT NULL,
    "percentage" DECIMAL(7,2) NOT NULL,
    "gpa" DECIMAL(4,2) NOT NULL,
    "finalGrade" TEXT NOT NULL,
    "outcome" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "resultStatus" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "attendanceDays" INTEGER,
    "presentDays" INTEGER,
    "teacherRemark" TEXT,
    "principalRemark" TEXT,
    "issueDate" DATE,
    "publishedAt" TIMESTAMP(3),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "topicId" TEXT,
    "questionType" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionImageKey" TEXT,
    "marks" DECIMAL(7,2) NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "cognitiveLevel" "CognitiveLevel" NOT NULL DEFAULT 'UNDERSTANDING',
    "estimatedMinutes" INTEGER,
    "specificationGroup" TEXT,
    "learningOutcome" TEXT,
    "curriculumCode" TEXT,
    "answer" TEXT,
    "solution" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificationGrid" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullMarks" DECIMAL(7,2) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "SpecificationGridStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecificationGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificationGridAllocation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "chapterId" TEXT,
    "topicId" TEXT,
    "questionType" "QuestionType",
    "cognitiveLevel" "CognitiveLevel",
    "difficulty" "DifficultyLevel",
    "marksPerQuestion" DECIMAL(7,2) NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "allocatedMarks" DECIMAL(7,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecificationGridAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPaper" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examId" TEXT,
    "gridId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "fullMarks" DECIMAL(7,2) NOT NULL,
    "passMarks" DECIMAL(7,2),
    "durationMinutes" INTEGER NOT NULL,
    "instructions" TEXT,
    "status" "QuestionPaperStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPaperItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "sectionLabel" TEXT,
    "marks" DECIMAL(7,2) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPaperItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationReceipt" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSession_schoolId_date_status_idx" ON "AttendanceSession"("schoolId", "date", "status");

-- CreateIndex
CREATE INDEX "AttendanceSession_schoolId_academicYearId_classId_sectionId_idx" ON "AttendanceSession"("schoolId", "academicYearId", "classId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_schoolId_academicYearId_classId_sectionId_key" ON "AttendanceSession"("schoolId", "academicYearId", "classId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_studentId_status_idx" ON "AttendanceRecord"("schoolId", "studentId", "status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_sessionId_idx" ON "AttendanceRecord"("schoolId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "ExamType_schoolId_status_idx" ON "ExamType"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamType_schoolId_code_key" ON "ExamType"("schoolId", "code");

-- CreateIndex
CREATE INDEX "GradingScheme_schoolId_isDefault_status_idx" ON "GradingScheme"("schoolId", "isDefault", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GradingScheme_schoolId_code_key" ON "GradingScheme"("schoolId", "code");

-- CreateIndex
CREATE INDEX "GradeRule_schoolId_gradingSchemeId_minimumPercentage_idx" ON "GradeRule"("schoolId", "gradingSchemeId", "minimumPercentage");

-- CreateIndex
CREATE UNIQUE INDEX "GradeRule_gradingSchemeId_grade_key" ON "GradeRule"("gradingSchemeId", "grade");

-- CreateIndex
CREATE INDEX "Exam_schoolId_academicYearId_status_idx" ON "Exam"("schoolId", "academicYearId", "status");

-- CreateIndex
CREATE INDEX "Exam_schoolId_startDate_endDate_idx" ON "Exam"("schoolId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_schoolId_academicYearId_name_key" ON "Exam"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "ExamSubject_schoolId_examId_classId_status_idx" ON "ExamSubject"("schoolId", "examId", "classId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_schoolId_examId_classId_subjectId_key" ON "ExamSubject"("schoolId", "examId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "MarkSheet_schoolId_status_updatedAt_idx" ON "MarkSheet"("schoolId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarkSheet_schoolId_examSubjectId_sectionId_key" ON "MarkSheet"("schoolId", "examSubjectId", "sectionId");

-- CreateIndex
CREATE INDEX "StudentMark_schoolId_studentId_idx" ON "StudentMark"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMark_markSheetId_studentId_key" ON "StudentMark"("markSheetId", "studentId");

-- CreateIndex
CREATE INDEX "StudentResult_schoolId_examId_resultStatus_idx" ON "StudentResult"("schoolId", "examId", "resultStatus");

-- CreateIndex
CREATE INDEX "StudentResult_schoolId_studentId_publishedAt_idx" ON "StudentResult"("schoolId", "studentId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentResult_schoolId_examId_studentId_key" ON "StudentResult"("schoolId", "examId", "studentId");

-- CreateIndex
CREATE INDEX "Chapter_schoolId_classId_subjectId_status_idx" ON "Chapter"("schoolId", "classId", "subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_schoolId_classId_subjectId_name_key" ON "Chapter"("schoolId", "classId", "subjectId", "name");

-- CreateIndex
CREATE INDEX "Topic_schoolId_chapterId_status_idx" ON "Topic"("schoolId", "chapterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_schoolId_chapterId_name_key" ON "Topic"("schoolId", "chapterId", "name");

-- CreateIndex
CREATE INDEX "Question_schoolId_classId_subjectId_status_idx" ON "Question"("schoolId", "classId", "subjectId", "status");

-- CreateIndex
CREATE INDEX "Question_schoolId_chapterId_topicId_questionType_idx" ON "Question"("schoolId", "chapterId", "topicId", "questionType");

-- CreateIndex
CREATE INDEX "Question_schoolId_difficulty_cognitiveLevel_idx" ON "Question"("schoolId", "difficulty", "cognitiveLevel");

-- CreateIndex
CREATE INDEX "QuestionOption_schoolId_questionId_idx" ON "QuestionOption"("schoolId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_label_key" ON "QuestionOption"("questionId", "label");

-- CreateIndex
CREATE INDEX "SpecificationGrid_schoolId_classId_subjectId_status_idx" ON "SpecificationGrid"("schoolId", "classId", "subjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SpecificationGrid_schoolId_academicYearId_classId_subjectId_key" ON "SpecificationGrid"("schoolId", "academicYearId", "classId", "subjectId", "examTypeId", "name");

-- CreateIndex
CREATE INDEX "SpecificationGridAllocation_schoolId_gridId_idx" ON "SpecificationGridAllocation"("schoolId", "gridId");

-- CreateIndex
CREATE INDEX "SpecificationGridAllocation_schoolId_chapterId_topicId_idx" ON "SpecificationGridAllocation"("schoolId", "chapterId", "topicId");

-- CreateIndex
CREATE INDEX "QuestionPaper_schoolId_academicYearId_classId_subjectId_idx" ON "QuestionPaper"("schoolId", "academicYearId", "classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaper_schoolId_gridId_setCode_key" ON "QuestionPaper"("schoolId", "gridId", "setCode");

-- CreateIndex
CREATE INDEX "QuestionPaperItem_schoolId_paperId_idx" ON "QuestionPaperItem"("schoolId", "paperId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaperItem_paperId_questionId_key" ON "QuestionPaperItem"("paperId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaperItem_paperId_displayOrder_key" ON "QuestionPaperItem"("paperId", "displayOrder");

-- CreateIndex
CREATE INDEX "Notification_schoolId_userId_readAt_createdAt_idx" ON "Notification"("schoolId", "userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_schoolId_type_createdAt_idx" ON "Notification"("schoolId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationReceipt_schoolId_userId_readAt_idx" ON "NotificationReceipt"("schoolId", "userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReceipt_notificationId_userId_key" ON "NotificationReceipt"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamType" ADD CONSTRAINT "ExamType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingScheme" ADD CONSTRAINT "GradingScheme_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRule" ADD CONSTRAINT "GradeRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRule" ADD CONSTRAINT "GradeRule_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examTypeId_fkey" FOREIGN KEY ("examTypeId") REFERENCES "ExamType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSheet" ADD CONSTRAINT "MarkSheet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSheet" ADD CONSTRAINT "MarkSheet_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSheet" ADD CONSTRAINT "MarkSheet_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkSheet" ADD CONSTRAINT "MarkSheet_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMark" ADD CONSTRAINT "StudentMark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMark" ADD CONSTRAINT "StudentMark_markSheetId_fkey" FOREIGN KEY ("markSheetId") REFERENCES "MarkSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMark" ADD CONSTRAINT "StudentMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGrid" ADD CONSTRAINT "SpecificationGrid_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGrid" ADD CONSTRAINT "SpecificationGrid_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGrid" ADD CONSTRAINT "SpecificationGrid_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGrid" ADD CONSTRAINT "SpecificationGrid_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGrid" ADD CONSTRAINT "SpecificationGrid_examTypeId_fkey" FOREIGN KEY ("examTypeId") REFERENCES "ExamType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGridAllocation" ADD CONSTRAINT "SpecificationGridAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGridAllocation" ADD CONSTRAINT "SpecificationGridAllocation_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "SpecificationGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGridAllocation" ADD CONSTRAINT "SpecificationGridAllocation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationGridAllocation" ADD CONSTRAINT "SpecificationGridAllocation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "SpecificationGrid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaperItem" ADD CONSTRAINT "QuestionPaperItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaperItem" ADD CONSTRAINT "QuestionPaperItem_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "QuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaperItem" ADD CONSTRAINT "QuestionPaperItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

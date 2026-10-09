-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('COMMUNITY', 'INSTITUTIONAL', 'RELIGIOUS', 'SPECIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('GLOBAL', 'SCHOOL');

-- CreateEnum
CREATE TYPE "AcademicCalendar" AS ENUM ('BS', 'AD', 'BOTH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'SCHOOL_CREATED', 'SCHOOL_UPDATED', 'SCHOOL_ACTIVATED', 'SCHOOL_SUSPENDED', 'SCHOOL_ARCHIVED', 'SCHOOL_RESTORED', 'SCHOOL_ADMIN_CREATED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "iemisCode" TEXT,
    "type" "SchoolType" NOT NULL,
    "level" TEXT NOT NULL,
    "establishmentYear" INTEGER,
    "registrationNumber" TEXT,
    "panVat" TEXT,
    "logoStorageKey" TEXT,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "localLevel" TEXT NOT NULL,
    "ward" INTEGER NOT NULL,
    "tole" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "principalName" TEXT NOT NULL,
    "principalPhone" TEXT NOT NULL,
    "principalEmail" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'TRIAL',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "calendarPreference" "AcademicCalendar" NOT NULL DEFAULT 'BOTH',
    "defaultAcademicYear" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "resultSystem" TEXT NOT NULL DEFAULT 'CONFIGURABLE_GPA',
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "examinationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "questionBankEnabled" BOOLEAN NOT NULL DEFAULT true,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "identityKey" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "mobile" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "identityKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "RoleScope" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "identityKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "userVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE UNIQUE INDEX "School_iemisCode_key" ON "School"("iemisCode");

-- CreateIndex
CREATE INDEX "School_status_idx" ON "School"("status");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE INDEX "School_district_idx" ON "School"("district");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSetting_schoolId_key" ON "SchoolSetting"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "User_identityKey_key" ON "User"("identityKey");

-- CreateIndex
CREATE INDEX "User_schoolId_status_idx" ON "User"("schoolId", "status");

-- CreateIndex
CREATE INDEX "User_normalizedEmail_idx" ON "User"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_normalizedUsername_key" ON "User"("schoolId", "normalizedUsername");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_normalizedEmail_key" ON "User"("schoolId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Role_identityKey_key" ON "Role"("identityKey");

-- CreateIndex
CREATE INDEX "Role_schoolId_scope_idx" ON "Role"("schoolId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Role_schoolId_code_key" ON "Role"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_identityKey_key" ON "Permission"("identityKey");

-- CreateIndex
CREATE INDEX "Permission_schoolId_idx" ON "Permission"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_schoolId_code_key" ON "Permission"("schoolId", "code");

-- CreateIndex
CREATE INDEX "UserRole_schoolId_userId_idx" ON "UserRole"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_schoolId_roleId_idx" ON "RolePermission"("schoolId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_expiresAt_idx" ON "Session"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_schoolId_expiresAt_idx" ON "Session"("schoolId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "SchoolSetting" ADD CONSTRAINT "SchoolSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

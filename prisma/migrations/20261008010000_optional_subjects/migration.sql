ALTER TABLE "ClassSubject" ADD COLUMN "isOptional" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentEnrollment" ADD COLUMN "optionalSubjectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { SessionContext } from "./session";

type Group = {
  academicYearId: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  isClassTeacher: boolean;
};
const assignments = cache(async (schoolId: string, userId: string) =>
  prisma.teacherAssignment.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      teacher: { userId, status: "ACTIVE" },
    },
    select: {
      academicYearId: true,
      classId: true,
      sectionId: true,
      subjectId: true,
      isClassTeacher: true,
    },
  }),
);

export async function academicAccess(
  session: Pick<SessionContext, "roles"> & {
    schoolId: string;
    user: { id: string };
  },
) {
  const unrestricted =
    session.roles.has("SCHOOL_ADMIN") || session.roles.has("EXAM_COORDINATOR");
  const groups: Group[] = unrestricted
    ? []
    : await assignments(session.schoolId, session.user.id);
  const enrollmentWhere = unrestricted
    ? {}
    : {
        OR: groups.map((group) => ({
          academicYearId: group.academicYearId,
          classId: group.classId,
          ...(group.sectionId ? { sectionId: group.sectionId } : {}),
        })),
      };
  return {
    unrestricted,
    groups,
    enrollmentWhere,
    studentWhere: unrestricted
      ? {}
      : { enrollments: { some: enrollmentWhere } },
    examSubjectWhere: unrestricted
      ? {}
      : {
          OR: groups.map((group) => ({
            exam: { academicYearId: group.academicYearId },
            classId: group.classId,
            ...(group.isClassTeacher ? {} : { subjectId: group.subjectId }),
          })),
        },
    allows(
      year: string,
      classId: string,
      sectionId: string,
      subjectId?: string,
    ) {
      return (
        unrestricted ||
        groups.some(
          (group) =>
            group.academicYearId === year &&
            group.classId === classId &&
            (!group.sectionId || group.sectionId === sectionId) &&
            (!subjectId ||
              group.subjectId === subjectId ||
              group.isClassTeacher),
        )
      );
    },
  };
}

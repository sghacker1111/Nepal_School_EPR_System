import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { StudentForm } from "@/modules/students/components/student-form";
const date = (value: Date | null) => value?.toISOString().slice(0, 10) ?? "";
export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await requireSchoolPage("student.edit");
  const { studentId } = await params;
  const [student, years, classes, sections] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      include: {
        guardians: { include: { guardian: true } },
        enrollments: { orderBy: { enrollmentDate: "desc" }, take: 1 },
      },
    }),
    prisma.academicYear.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.section.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, classId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!student) notFound();
  const father = student.guardians.find(
    (v) => v.relationship === "FATHER",
  )?.guardian;
  const mother = student.guardians.find(
    (v) => v.relationship === "MOTHER",
  )?.guardian;
  const primary = student.guardians.find((v) => v.isPrimary)?.guardian;
  const primaryLink = student.guardians.find((v) => v.isPrimary);
  const full = (v: typeof father) =>
    v
      ? `${v.firstName} ${v.middleName ?? ""} ${v.lastName}`.replace(
          /\s+/g,
          " ",
        )
      : "";
  const current = student.enrollments[0];
  const {
    guardians: _guardians,
    enrollments: _enrollments,
    metadata: _metadata,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    archivedAt: _archivedAt,
    ...studentValues
  } = student;
  void [
    _guardians,
    _enrollments,
    _metadata,
    _createdAt,
    _updatedAt,
    _archivedAt,
  ];
  const values: Record<string, string | number | boolean | null | undefined> = {
    ...studentValues,
    dateOfBirthAd: date(student.dateOfBirthAd),
    admissionDate: date(student.admissionDate),
    emergencyContact:
      student.metadata &&
      typeof student.metadata === "object" &&
      !Array.isArray(student.metadata) &&
      typeof student.metadata.emergencyContact === "string"
        ? student.metadata.emergencyContact
        : "",
    fatherName: full(father),
    fatherOccupation: father?.occupation,
    fatherEducation: father?.education,
    fatherMobile: father?.mobile,
    motherName: full(mother),
    motherOccupation: mother?.occupation,
    motherEducation: mother?.education,
    motherMobile: mother?.mobile,
    guardianName: full(primary),
    guardianRelationship: primaryLink?.relationship ?? "GUARDIAN",
    guardianMobile: primary?.mobile,
    guardianEmail: primary?.email,
    classId: current?.classId,
    sectionId: current?.sectionId,
    academicYearId: current?.academicYearId,
    rollNumber: current?.rollNumber,
  };
  return (
    <>
      <PageHeader
        eyebrow={student.studentId}
        title="Edit student profile"
        description="Update the master profile while preserving existing enrollment history."
      />
      <StudentForm
        years={years}
        classes={classes}
        sections={sections}
        initial={{ id: student.id, userId: student.userId, values }}
      />
    </>
  );
}

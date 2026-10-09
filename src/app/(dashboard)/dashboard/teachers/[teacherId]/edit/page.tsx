import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { TeacherForm } from "@/modules/teachers/components/teacher-form";
export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const session = await requireSchoolPage("teacher.edit");
  const { teacherId } = await params;
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId: session.schoolId },
  });
  if (!teacher) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Teacher management"
        title={`Edit ${teacher.firstName} ${teacher.lastName}`}
        description="Profile and access changes remain scoped to the authenticated school."
      />
      <TeacherForm
        initial={{
          ...teacher,
          dateOfBirth: teacher.dateOfBirth?.toISOString().slice(0, 10) ?? "",
          joiningDate: teacher.joiningDate.toISOString().slice(0, 10),
        }}
      />
    </>
  );
}

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { StudentForm } from "@/modules/students/components/student-form";
export default async function NewStudentPage() {
  const session = await requireSchoolPage("student.create");
  const [years, classes, sections] = await Promise.all([
    prisma.academicYear.findMany({
      where: {
        schoolId: session.schoolId,
        status: { in: ["ACTIVE", "PLANNED"] },
      },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.section.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true, classId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Student management"
        title="Add student"
        description="A sectioned student record with guardian, address, academic, IEMIS-style, health, and optional portal access details."
      />
      {years.length && classes.length && sections.length ? (
        <StudentForm years={years} classes={classes} sections={sections} />
      ) : (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="font-semibold">Academic setup is required first.</p>
          <p className="mt-2 text-sm text-slate-500">
            Create an academic year, class, and section before enrolling a
            student.
          </p>
        </div>
      )}
    </>
  );
}

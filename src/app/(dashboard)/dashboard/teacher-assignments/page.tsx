import { Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { AssignmentForm } from "@/modules/teachers/components/assignment-form";
export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolPage("teacher.view");
  const { edit } = await searchParams;
  const [items, years, teachers, classes, sections, subjects, selected] =
    await Promise.all([
      prisma.teacherAssignment.findMany({
        where: { schoolId: session.schoolId },
        include: {
          academicYear: true,
          teacher: true,
          class: true,
          section: true,
          subject: true,
        },
        orderBy: [
          { academicYear: { startDate: "desc" } },
          { class: { displayOrder: "asc" } },
        ],
      }),
      prisma.academicYear.findMany({
        where: {
          schoolId: session.schoolId,
          status: { in: ["ACTIVE", "PLANNED"] },
        },
        select: { id: true, name: true },
        orderBy: { startDate: "desc" },
      }),
      prisma.teacher.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { normalizedName: "asc" },
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
      prisma.subject.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      edit
        ? prisma.teacherAssignment.findFirst({
            where: { id: edit, schoolId: session.schoolId },
          })
        : null,
    ]);
  const links = await prisma.classSubject.findMany({
    where: { schoolId: session.schoolId, status: "ACTIVE" },
    select: { academicYearId: true, classId: true, subjectId: true },
  });
  const canAssign = session.permissions.has("teacher.assign");
  const teacherOptions = teachers.map((item) => ({
    id: item.id,
    name: `${item.firstName} ${item.lastName}`,
  }));
  const ready =
    years.length && teachers.length && classes.length && subjects.length;
  return (
    <>
      <PageHeader
        eyebrow="Teacher management"
        title="Teacher assignments"
        description="Assign teachers to an academic year, class, optional section, and subject; designate one class teacher per group."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Assignment register</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Teacher</th>
                    <th className="px-5 py-3">Year</th>
                    <th className="px-5 py-3">Class / section</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Role</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-semibold">
                        {item.teacher.firstName} {item.teacher.lastName}
                      </td>
                      <td className="px-5 py-4">{item.academicYear.name}</td>
                      <td className="px-5 py-4">
                        {item.class.name} {item.section?.name ?? "All"}
                      </td>
                      <td className="px-5 py-4">{item.subject.name}</td>
                      <td className="px-5 py-4">
                        {item.isClassTeacher ? (
                          <Badge variant="success">Class teacher</Badge>
                        ) : (
                          <Badge variant="outline">Subject teacher</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className={canAssign ? undefined : "hidden"}
                        >
                          <Link
                            href={`/dashboard/teacher-assignments?edit=${item.id}`}
                          >
                            <Pencil />
                            Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!items.length && (
              <p className="py-14 text-center font-semibold">
                No teacher assignments yet
              </p>
            )}
          </CardContent>
        </Card>
        <Card className={canAssign ? undefined : "hidden"}>
          <CardHeader>
            <CardTitle>
              {selected ? "Edit assignment" : "New assignment"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ready ? (
              <AssignmentForm
                key={selected?.id ?? "new"}
                links={links}
                years={years}
                teachers={teacherOptions}
                classes={classes}
                sections={sections}
                subjects={subjects}
                initial={selected ?? undefined}
              />
            ) : (
              <p className="text-sm text-slate-600">
                Create academic setup and at least one active teacher first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

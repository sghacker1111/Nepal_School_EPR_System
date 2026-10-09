import { CurriculumReference } from "@/modules/academic/components/curriculum-reference";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ClassSubjectForm } from "@/modules/academic/components/resource-forms";
import { requireSchoolPage } from "@/modules/auth/page-session";
export default async function ClassSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolPage("academic.view");
  const { edit } = await searchParams;
  const [items, years, classes, subjects, selected] = await Promise.all([
    prisma.classSubject.findMany({
      where: { schoolId: session.schoolId },
      include: { academicYear: true, class: true, subject: true },
      orderBy: [
        { academicYear: { startDate: "desc" } },
        { class: { displayOrder: "asc" } },
        { displayOrder: "asc" },
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
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    edit
      ? prisma.classSubject.findFirst({
          where: { id: edit, schoolId: session.schoolId },
        })
      : null,
  ]);
  const canManage = session.permissions.has("academic.manage");
  const ready = years.length && classes.length && subjects.length;
  const selectedInput = selected
    ? {
        ...selected,
        creditHour: selected.creditHour ? Number(selected.creditHour) : null,
      }
    : undefined;
  return (
    <>
      <PageHeader
        eyebrow="Academic setup"
        title="Class subjects"
        description="Assign only the subjects taught by each class for a specific academic year."
      />
      <CurriculumReference />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_500px]">
        <Card>
          <CardHeader>
            <CardTitle>Subject assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Year</th>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Full marks</th>
                    <th className="px-5 py-3">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">{item.academicYear.name}</td>
                      <td className="px-5 py-4">{item.class.name}</td>
                      <td className="px-5 py-4 font-semibold">
                        {item.subject.name}
                      </td>
                      <td className="px-5 py-4">{item.fullMarks}</td>
                      <td className="px-5 py-4">
                        <Badge variant="outline">{item.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className={canManage ? undefined : "hidden"}
                        >
                          <Link
                            href={`/dashboard/class-subjects?edit=${item.id}`}
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
                No class subjects assigned
              </p>
            )}
          </CardContent>
        </Card>
        <Card className={canManage ? undefined : "hidden"}>
          <CardHeader>
            <CardTitle>
              {selected ? "Edit assignment" : "Assign subject"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ready ? (
              <ClassSubjectForm
                years={years}
                classes={classes}
                subjects={subjects}
                initial={selectedInput}
              />
            ) : (
              <p className="text-sm text-slate-600">
                Create an active academic year, class, and subject first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

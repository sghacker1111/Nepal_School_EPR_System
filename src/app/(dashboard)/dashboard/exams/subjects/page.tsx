import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { ExamSubjectForm } from "@/modules/exams/components/exam-forms";

export default async function ExamSubjectsPage() {
  const session = await requireSchoolPage("exam.view");
  const [exams, classes, subjects, configured] = await Promise.all([
    prisma.exam.findMany({
      where: {
        schoolId: session.schoolId,
        status: { notIn: ["LOCKED", "PUBLISHED"] },
      },
      include: { academicYear: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.examSubject.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      include: {
        exam: true,
        class: true,
        subject: true,
        _count: { select: { markSheets: true } },
      },
      orderBy: [
        { exam: { startDate: "desc" } },
        { class: { displayOrder: "asc" } },
        { subject: { name: "asc" } },
      ],
    }),
  ]);
  const links = await prisma.classSubject.findMany({
    where: { schoolId: session.schoolId, status: "ACTIVE" },
    select: {
      academicYearId: true,
      classId: true,
      subjectId: true,
      theoryMarks: true,
      practicalMarks: true,
      internalMarks: true,
      creditHour: true,
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="Examinations"
        title="Exam subject configuration"
        description="Set theory, practical, internal, pass, credit-hour, date, and duration limits per class subject."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/exams">Back to exams</Link>
          </Button>
        }
      />
      {session.permissions.has("exam.manage") && (
        <Card>
          <CardHeader>
            <CardTitle>Configure subject</CardTitle>
          </CardHeader>
          <CardContent>
            <ExamSubjectForm
              links={links.map((link) => ({
                ...link,
                creditHour:
                  link.creditHour === null ? null : Number(link.creditHour),
              }))}
              exams={exams.map((exam) => ({
                id: exam.id,
                academicYearId: exam.academicYearId,
                name: `${exam.name} · ${exam.academicYear.name}`,
              }))}
              classes={classes}
              subjects={subjects}
            />
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Configured subjects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {configured.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Class / Subject</th>
                    <th className="px-4 py-3">Theory</th>
                    <th className="px-4 py-3">Practical</th>
                    <th className="px-4 py-3">Internal</th>
                    <th className="px-4 py-3">Pass / Credit</th>
                    <th className="px-4 py-3">Sheets</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {configured.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold">
                        {item.exam.name}
                      </td>
                      <td className="px-4 py-3">
                        {item.class.name} · {item.subject.name}
                      </td>
                      <td className="px-4 py-3">
                        {item.theoryFullMarks.toString()}
                      </td>
                      <td className="px-4 py-3">
                        {item.practicalFullMarks.toString()}
                      </td>
                      <td className="px-4 py-3">
                        {item.internalFullMarks.toString()}
                      </td>
                      <td className="px-4 py-3">
                        {item.passMarks?.toString() ?? "—"} /{" "}
                        {item.creditHour.toString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {item._count.markSheets}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-14 text-center text-sm text-slate-500">
              No exam subjects configured.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

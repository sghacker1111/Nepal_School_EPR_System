import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ROLE_CODES } from "@/modules/auth/constants";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { PrintButton } from "@/modules/exams/components/print-button";

export default async function StudentReportCardPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const session = await requireSchoolPage("result.view");
  if (!session.roles.has(ROLE_CODES.STUDENT)) redirect("/access-denied");
  const { resultId } = await params;
  const result = await prisma.studentResult.findFirst({
    where: {
      id: resultId,
      schoolId: session.schoolId,
      resultStatus: "PUBLISHED",
      student: { userId: session.user.id },
    },
    include: {
      school: true,
      student: true,
      enrollment: {
        include: { academicYear: true, class: true, section: true },
      },
      exam: {
        include: {
          subjects: {
            include: {
              subject: true,
              markSheets: { include: { marks: true } },
            },
          },
        },
      },
    },
  });
  if (!result) notFound();
  const subjectRows = result.exam.subjects
    .filter((subject) => subject.classId === result.enrollment.classId)
    .flatMap((subject) =>
      subject.markSheets
        .filter((sheet) => sheet.sectionId === result.enrollment.sectionId)
        .flatMap((sheet) =>
          sheet.marks
            .filter((mark) => mark.studentId === result.studentId)
            .map((mark) => ({
              subject: subject.subject.name,
              theory: mark.theoryMarks?.toString() ?? "—",
              practical: mark.practicalMarks?.toString() ?? "—",
              internal: mark.internalMarks?.toString() ?? "—",
              total: mark.totalMarks?.toString() ?? mark.specialStatus ?? "—",
              grade: mark.grade ?? "—",
              point: mark.gradePoint?.toString() ?? "—",
              credit: subject.creditHour.toString(),
            })),
        ),
    );
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/student">Back</Link>
            </Button>
            <PrintButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 py-8 print:p-0">
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="p-6 sm:p-10">
            <header className="border-b-2 border-slate-900 pb-5 text-center">
              <p className="text-2xl font-black uppercase tracking-wide">
                {result.school.name}
              </p>
              <p className="mt-1 text-sm">
                {result.school.address} · {result.school.district}, Nepal
              </p>
              <p className="mt-4 text-xl font-bold">Academic Progress Report</p>
              <p>
                {result.exam.name} · Academic Year{" "}
                {result.enrollment.academicYear.name}
              </p>
            </header>
            <div className="grid gap-x-8 gap-y-2 border-b py-5 text-sm sm:grid-cols-2">
              <p>
                <strong>Student:</strong> {result.student.firstName}{" "}
                {result.student.middleName} {result.student.lastName}
              </p>
              <p>
                <strong>Student ID:</strong> {result.student.studentId}
              </p>
              <p>
                <strong>Class:</strong> {result.enrollment.class.name}{" "}
                {result.enrollment.section.name}
              </p>
              <p>
                <strong>Roll:</strong> {result.enrollment.rollNumber ?? "—"}
              </p>
            </div>
            <div className="overflow-x-auto py-5">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-2 text-left">Subject</th>
                    <th className="border p-2">Theory</th>
                    <th className="border p-2">Practical</th>
                    <th className="border p-2">Internal</th>
                    <th className="border p-2">Total</th>
                    <th className="border p-2">Grade</th>
                    <th className="border p-2">GP</th>
                    <th className="border p-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((row) => (
                    <tr key={row.subject}>
                      <td className="border p-2 font-semibold">
                        {row.subject}
                      </td>
                      <td className="border p-2 text-center">{row.theory}</td>
                      <td className="border p-2 text-center">
                        {row.practical}
                      </td>
                      <td className="border p-2 text-center">{row.internal}</td>
                      <td className="border p-2 text-center">{row.total}</td>
                      <td className="border p-2 text-center">{row.grade}</td>
                      <td className="border p-2 text-center">{row.point}</td>
                      <td className="border p-2 text-center">{row.credit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 rounded-xl bg-slate-50 p-5 text-sm sm:grid-cols-4">
              <p>
                <span className="block text-xs uppercase text-slate-500">
                  Percentage
                </span>
                <strong className="text-xl">
                  {result.percentage.toString()}%
                </strong>
              </p>
              <p>
                <span className="block text-xs uppercase text-slate-500">
                  GPA
                </span>
                <strong className="text-xl">{result.gpa.toString()}</strong>
              </p>
              <p>
                <span className="block text-xs uppercase text-slate-500">
                  Final grade
                </span>
                <strong className="text-xl">{result.finalGrade}</strong>
              </p>
              <p>
                <span className="block text-xs uppercase text-slate-500">
                  Outcome
                </span>
                <Badge
                  variant={result.outcome === "PASS" ? "success" : "warning"}
                >
                  {result.outcome}
                </Badge>
              </p>
            </div>
            <p className="mt-5 text-sm">
              <strong>Attendance:</strong> {result.presentDays ?? 0} /{" "}
              {result.attendanceDays ?? 0} days
            </p>
            <div className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
              <p className="border-t pt-2">Class Teacher Signature</p>
              <p className="border-t pt-2">Principal Signature</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

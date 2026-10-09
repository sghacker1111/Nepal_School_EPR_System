import { academicAccess } from "@/modules/auth/academic-access";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { PrintButton } from "@/modules/exams/components/print-button";

export default async function ReportCardPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const session = await requireSchoolPage("result.view");
  const access = await academicAccess(session);
  const { resultId } = await params;
  const identity = await prisma.studentResult.findFirst({
    where: {
      id: resultId,
      schoolId: session.schoolId,
      enrollment: access.enrollmentWhere,
    },
    select: {
      studentId: true,
      enrollment: { select: { classId: true, sectionId: true } },
    },
  });
  if (!identity) notFound();
  const result = await prisma.studentResult.findFirst({
    where: {
      id: resultId,
      schoolId: session.schoolId,
      enrollment: access.enrollmentWhere,
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
            where: { classId: identity.enrollment.classId },
            include: {
              subject: true,
              markSheets: {
                where: { sectionId: identity.enrollment.sectionId },
                include: {
                  marks: { where: { studentId: identity.studentId } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!result) notFound();
  const subjectRows = result.exam.subjects
    .filter((item) => item.classId === result.enrollment.classId)
    .flatMap((item) =>
      item.markSheets
        .filter((sheet) => sheet.sectionId === result.enrollment.sectionId)
        .flatMap((sheet) =>
          sheet.marks
            .filter((mark) => mark.studentId === result.studentId)
            .map((mark) => ({
              subject: item.subject.name,
              theory: mark.theoryMarks?.toString() ?? "—",
              practical: mark.practicalMarks?.toString() ?? "—",
              internal: mark.internalMarks?.toString() ?? "—",
              total: mark.totalMarks?.toString() ?? mark.specialStatus ?? "—",
              grade: mark.grade ?? "—",
              point: mark.gradePoint?.toString() ?? "—",
              credit: item.creditHour.toString(),
            })),
        ),
    );
  return (
    <>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Results"
          title="Printable report card"
          description="Use the browser print dialog to print or save a standards-based PDF."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/results">Back</Link>
              </Button>
              <PrintButton />
            </div>
          }
        />
      </div>
      <Card className="mx-auto max-w-5xl print:border-0 print:shadow-none">
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
            <p>
              <strong>Date of birth:</strong>{" "}
              {result.student.dateOfBirthBs ??
                result.student.dateOfBirthAd?.toLocaleDateString() ??
                "—"}
            </p>
            <p>
              <strong>Issue date:</strong>{" "}
              {result.issueDate?.toLocaleDateString() ??
                new Date().toLocaleDateString()}
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
                    <td className="border p-2 font-semibold">{row.subject}</td>
                    <td className="border p-2 text-center">{row.theory}</td>
                    <td className="border p-2 text-center">{row.practical}</td>
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
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <strong>Attendance:</strong> {result.presentDays ?? 0} /{" "}
              {result.attendanceDays ?? 0} days
            </p>
            <p>
              <strong>Teacher remark:</strong> {result.teacherRemark ?? "—"}
            </p>
            <p>
              <strong>Principal remark:</strong> {result.principalRemark ?? "—"}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-12 text-center text-sm">
            <p className="border-t pt-2">Class Teacher Signature</p>
            <p className="border-t pt-2">Principal Signature</p>
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">
            Computer-generated report. Grading follows the school-configured
            scheme.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

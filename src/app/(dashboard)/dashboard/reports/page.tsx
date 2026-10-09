import { Download, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getAttendanceReport } from "@/modules/attendance/service";
import { requireSchoolPage } from "@/modules/auth/page-session";

export default async function ReportsPage() {
  const session = await requireSchoolPage("report.view");
  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });
  const [
    students,
    teachers,
    enrollments,
    attendanceGroups,
    resultGroups,
    examCount,
    approvedQuestions,
    paperCount,
  ] = await Promise.all([
    prisma.student.count({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
    }),
    prisma.teacher.count({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
    }),
    prisma.studentEnrollment.count({
      where: {
        schoolId: session.schoolId,
        status: "ACTIVE",
        ...(currentYear ? { academicYearId: currentYear.id } : {}),
      },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        schoolId: session.schoolId,
        session: {
          status: { in: ["SUBMITTED", "LOCKED"] },
          ...(currentYear ? { academicYearId: currentYear.id } : {}),
        },
      },
      _count: true,
    }),
    prisma.studentResult.groupBy({
      by: ["outcome"],
      where: {
        schoolId: session.schoolId,
        ...(currentYear ? { exam: { academicYearId: currentYear.id } } : {}),
      },
      _count: true,
    }),
    prisma.exam.count({
      where: {
        schoolId: session.schoolId,
        ...(currentYear ? { academicYearId: currentYear.id } : {}),
      },
    }),
    prisma.question.count({
      where: { schoolId: session.schoolId, status: "APPROVED" },
    }),
    prisma.questionPaper.count({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
    }),
  ]);
  const attendance = Object.fromEntries(
    attendanceGroups.map((group) => [group.status, group._count]),
  );
  const totalAttendance =
    attendanceGroups.reduce((sum, group) => sum + group._count, 0) -
    (attendance.HOLIDAY ?? 0);
  const overallAttendance = totalAttendance
    ? (
        (((attendance.PRESENT ?? 0) + (attendance.LATE ?? 0)) /
          totalAttendance) *
        100
      ).toFixed(2)
    : "0.00";
  const attendanceRows = await getAttendanceReport({
    schoolId: session.schoolId,
    academicYearId: currentYear?.id,
  });
  const frequentAbsence = [...attendanceRows]
    .sort((a, b) => b.absent - a.absent)
    .slice(0, 10);
  return (
    <>
      <PageHeader
        eyebrow="Phase 8"
        title="School reports"
        description="Operational overview for enrollment, attendance, examinations, results, question bank, and paper generation."
        actions={
          <Button asChild>
            <a href="/api/reports/school-summary">
              <Download />
              Download Excel report
            </a>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active students", value: students },
          { label: "Active teachers", value: teachers },
          { label: "Current enrollments", value: enrollments },
          { label: "Overall attendance", value: `${overallAttendance}%` },
          { label: "Exams", value: examCount },
          { label: "Approved questions", value: approvedQuestions },
          { label: "Question papers", value: paperCount },
          {
            label: "Academic year",
            value: currentYear?.name ?? "Not selected",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendanceGroups.length ? (
              attendanceGroups.map((group) => (
                <div
                  key={group.status}
                  className="flex items-center justify-between border-b pb-2 text-sm"
                >
                  <span>{group.status}</span>
                  <strong>{group._count}</strong>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No submitted attendance.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Result outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resultGroups.length ? (
              resultGroups.map((group) => (
                <div
                  key={group.outcome}
                  className="flex items-center justify-between border-b pb-2 text-sm"
                >
                  <span>{group.outcome}</span>
                  <Badge
                    variant={group.outcome === "PASS" ? "success" : "warning"}
                  >
                    {group._count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No calculated results.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>
            <TrendingUp className="mr-2 inline size-5" />
            Students requiring attendance follow-up
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {frequentAbsence.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll</th>
                    <th className="px-4 py-3">Working days</th>
                    <th className="px-4 py-3">Absent</th>
                    <th className="px-4 py-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {frequentAbsence.map((row) => (
                    <tr key={row.studentId}>
                      <td className="px-4 py-3 font-semibold">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3">{row.rollNumber ?? "—"}</td>
                      <td className="px-4 py-3">{row.workingDays}</td>
                      <td className="px-4 py-3 text-red-700">{row.absent}</td>
                      <td className="px-4 py-3">{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              Attendance follow-up will appear after submitted sessions.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

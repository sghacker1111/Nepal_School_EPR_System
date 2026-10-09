import { academicAccess } from "@/modules/auth/academic-access";
import { FileText } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { ExamWorkflowForm } from "@/modules/exams/components/workflow-form";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const session = await requireSchoolPage("result.view");
  const access = await academicAccess(session);
  const { examId } = await searchParams;
  const exams = await prisma.exam.findMany({
    where: { schoolId: session.schoolId },
    include: {
      academicYear: true,
      _count: { select: { results: true, subjects: true } },
    },
    orderBy: { startDate: "desc" },
  });
  const selectedId = examId ?? exams[0]?.id;
  const results = selectedId
    ? await prisma.studentResult.findMany({
        where: {
          schoolId: session.schoolId,
          examId: selectedId,
          enrollment: access.enrollmentWhere,
        },
        include: {
          student: true,
          enrollment: { include: { class: true, section: true } },
        },
        orderBy: [
          { enrollment: { class: { displayOrder: "asc" } } },
          { enrollment: { rollNumber: "asc" } },
          { student: { normalizedName: "asc" } },
        ],
      })
    : [];
  const selected = exams.find((exam) => exam.id === selectedId);
  const canPublish = session.permissions.has("result.publish");
  return (
    <>
      <PageHeader
        eyebrow="Results"
        title="Result calculation and publication"
        description="Centralized deterministic GPA calculation, attendance totals, report cards, and controlled publication."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/exams">Exam setup</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-5">
          <form method="get" className="flex flex-wrap gap-3">
            <select
              name="examId"
              defaultValue={selectedId ?? ""}
              className="h-10 min-w-72 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} · {exam.academicYear.name}
                </option>
              ))}
            </select>
            <Button type="submit">View results</Button>
          </form>
        </CardContent>
      </Card>
      {selected && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-slate-500">Exam status</p>
              <Badge
                className="mt-2"
                variant={
                  selected.status === "PUBLISHED" ? "success" : "outline"
                }
              >
                {selected.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-slate-500">
                Configured subjects
              </p>
              <p className="mt-1 text-2xl font-bold">
                {selected._count.subjects}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-slate-500">
                Calculated results
              </p>
              <p className="mt-1 text-2xl font-bold">{results.length}</p>
            </CardContent>
          </Card>
        </div>
      )}
      {selected &&
        canPublish &&
        !["PUBLISHED", "LOCKED"].includes(selected.status) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <ExamWorkflowForm
              id={selected.id}
              intent="calculate"
              label="Calculate complete results"
            />
            {selected.status !== "PUBLISHED" && (
              <ExamWorkflowForm
                id={selected.id}
                intent="publish"
                label="Publish results"
              />
            )}
          </div>
        )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Student results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {results.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class / Roll</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">GPA / Grade</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td className="px-4 py-3 font-semibold">
                        {result.student.firstName} {result.student.middleName}{" "}
                        {result.student.lastName}
                      </td>
                      <td className="px-4 py-3">
                        {result.enrollment.class.name}{" "}
                        {result.enrollment.section.name} ·{" "}
                        {result.enrollment.rollNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {result.totalObtainedMarks.toString()} /{" "}
                        {result.totalFullMarks.toString()}
                      </td>
                      <td className="px-4 py-3">
                        {result.percentage.toString()}%
                      </td>
                      <td className="px-4 py-3">
                        {result.gpa.toString()} · {result.finalGrade}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            result.outcome === "PASS" ? "success" : "warning"
                          }
                        >
                          {result.outcome}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/results/${result.id}/report-card`}
                          >
                            <FileText />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-14 text-center text-sm text-slate-500">
              No complete results calculated for this exam.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

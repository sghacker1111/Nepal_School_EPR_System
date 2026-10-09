import { ClipboardCheck, FileSpreadsheet, GraduationCap } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import {
  ExamForm,
  ExamTypeForm,
  GradingSchemeForm,
} from "@/modules/exams/components/exam-forms";

export default async function ExamsPage() {
  const session = await requireSchoolPage("exam.view");
  const [years, types, schemes, exams] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    }),
    prisma.examType.findMany({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
    }),
    prisma.gradingScheme.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      include: { _count: { select: { rules: true } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.exam.findMany({
      where: { schoolId: session.schoolId },
      include: {
        academicYear: true,
        examType: true,
        gradingScheme: true,
        _count: { select: { subjects: true, results: true } },
      },
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
    }),
  ]);
  const canManage = session.permissions.has("exam.manage");
  return (
    <>
      <PageHeader
        eyebrow="Phase 5"
        title="Examinations and grading"
        description="Configure exam types, school grading rules, exam periods, subjects, marks, and publication."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/exams/subjects">
                <ClipboardCheck />
                Exam subjects
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/exams/marks">
                <FileSpreadsheet />
                Marks entry
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/results">
                <GraduationCap />
                Results
              </Link>
            </Button>
          </div>
        }
      />
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Exam type</CardTitle>
            </CardHeader>
            <CardContent>
              <ExamTypeForm />
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Configurable grading scheme</CardTitle>
            </CardHeader>
            <CardContent>
              <GradingSchemeForm />
            </CardContent>
          </Card>
        </div>
      )}
      {canManage && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Create or update an exam</CardTitle>
          </CardHeader>
          <CardContent>
            <ExamForm
              years={years}
              types={types.map(({ id, name }) => ({ id, name }))}
              schemes={schemes}
            />
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Exam register</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {exams.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Year / Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Grading</th>
                    <th className="px-4 py-3">Subjects / Results</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td className="px-4 py-4 font-semibold">{exam.name}</td>
                      <td className="px-4 py-4">
                        {exam.academicYear.name}
                        <span className="block text-xs text-slate-500">
                          {exam.examType.name}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {exam.startDate.toLocaleDateString()} –{" "}
                        {exam.endDate.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        {exam.gradingScheme?.name ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {exam._count.subjects} / {exam._count.results}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            exam.status === "PUBLISHED" ? "success" : "outline"
                          }
                        >
                          {exam.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-14 text-center text-sm text-slate-500">
              Create an exam type and grading scheme, then add the first exam.
            </p>
          )}
        </CardContent>
      </Card>
      {schemes.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Grading is configurable by each school. Administrators are responsible
          for matching the currently applicable Nepal standard.
        </p>
      )}
    </>
  );
}

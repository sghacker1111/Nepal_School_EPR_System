import { FileText } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { PaperGeneratorForm } from "@/modules/questions/components/question-forms";

export default async function PaperGeneratorPage() {
  const session = await requireSchoolPage("paper.view");
  const [grids, exams, papers] = await Promise.all([
    prisma.specificationGrid.findMany({
      where: { schoolId: session.schoolId, status: "VALID" },
      include: { class: true, subject: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.exam.findMany({
      where: { schoolId: session.schoolId, status: { not: "LOCKED" } },
      include: { academicYear: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.questionPaper.findMany({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
      include: {
        academicYear: true,
        class: true,
        subject: true,
        grid: true,
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Paper generation"
        title="Automatic question paper generator"
        description="Generate deterministic equivalent sets from approved questions while preserving locked questions on regeneration."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/exams/specification-grid">
              Specification grids
            </Link>
          </Button>
        }
      />
      {session.permissions.has("paper.generate") && (
        <Card>
          <CardHeader>
            <CardTitle>Generation controls</CardTitle>
          </CardHeader>
          <CardContent>
            <PaperGeneratorForm
              grids={grids.map((grid) => ({
                id: grid.id,
                name: `${grid.name} · ${grid.class.name} · ${grid.subject.name}`,
              }))}
              exams={exams.map((exam) => ({
                id: exam.id,
                name: `${exam.name} · ${exam.academicYear.name}`,
              }))}
            />
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Generated papers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {papers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Paper</th>
                    <th className="px-4 py-3">Class / Subject</th>
                    <th className="px-4 py-3">Set</th>
                    <th className="px-4 py-3">Questions</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Builder</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {papers.map((paper) => (
                    <tr key={paper.id}>
                      <td className="px-4 py-3 font-semibold">
                        {paper.title}
                        <span className="block text-xs font-normal text-slate-500">
                          {paper.grid.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {paper.class.name} · {paper.subject.name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">Set {paper.setCode}</Badge>
                      </td>
                      <td className="px-4 py-3">{paper._count.items}</td>
                      <td className="px-4 py-3">{paper.status}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/exams/papers/${paper.id}`}>
                            <FileText />
                            Open
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
              Generate a paper from a valid grid.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

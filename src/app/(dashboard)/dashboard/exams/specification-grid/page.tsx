import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { SpecificationGridForm } from "@/modules/questions/components/question-forms";

export default async function SpecificationGridPage() {
  const session = await requireSchoolPage("paper.view");
  const [years, classes, subjects, examTypes, chapters, topics, grids] =
    await Promise.all([
      prisma.academicYear.findMany({
        where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      }),
      prisma.class.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.subject.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
      prisma.examType.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
      prisma.chapter.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        include: { class: true, subject: true },
        orderBy: { name: "asc" },
      }),
      prisma.topic.findMany({
        where: { schoolId: session.schoolId, status: "ACTIVE" },
        include: { chapter: true },
        orderBy: { name: "asc" },
      }),
      prisma.specificationGrid.findMany({
        where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
        include: {
          academicYear: true,
          class: true,
          subject: true,
          examType: true,
          allocations: true,
          _count: { select: { papers: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  return (
    <>
      <PageHeader
        eyebrow="Phase 7"
        title="Specification grids"
        description="Define question distribution and require allocated marks to equal the exam full marks before generation."
        actions={
          <Button asChild>
            <Link href="/dashboard/exams/paper-generator">Paper generator</Link>
          </Button>
        }
      />
      {session.permissions.has("paper.manage") && (
        <Card>
          <CardHeader>
            <CardTitle>Create or update grid</CardTitle>
          </CardHeader>
          <CardContent>
            <SpecificationGridForm
              years={years}
              classes={classes}
              subjects={subjects}
              examTypes={examTypes.map(({ id, name }) => ({ id, name }))}
              chapters={chapters.map((item) => ({
                id: item.id,
                name: `${item.class.name} · ${item.subject.name} · ${item.name}`,
              }))}
              topics={topics.map((item) => ({
                id: item.id,
                name: `${item.chapter.name} · ${item.name}`,
              }))}
            />
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Saved grids</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {grids.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Grid</th>
                    <th className="px-4 py-3">Academic setup</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Allocations</th>
                    <th className="px-4 py-3">Papers</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grids.map((grid) => {
                    const allocated = grid.allocations.reduce(
                      (sum, row) => sum + Number(row.allocatedMarks),
                      0,
                    );
                    return (
                      <tr key={grid.id}>
                        <td className="px-4 py-3 font-semibold">
                          {grid.name}
                          <span className="block text-xs font-normal text-slate-500">
                            {grid.examType.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {grid.academicYear.name} · {grid.class.name} ·{" "}
                          {grid.subject.name}
                        </td>
                        <td className="px-4 py-3">
                          {allocated} / {grid.fullMarks.toString()}
                        </td>
                        <td className="px-4 py-3">{grid.allocations.length}</td>
                        <td className="px-4 py-3">{grid._count.papers}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              grid.status === "VALID" ? "success" : "warning"
                            }
                          >
                            {grid.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-14 text-center text-sm text-slate-500">
              No specification grids yet.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

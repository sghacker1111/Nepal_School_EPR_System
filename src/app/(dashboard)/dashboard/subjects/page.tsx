import { CurriculumReference } from "@/modules/academic/components/curriculum-reference";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SubjectForm } from "@/modules/academic/components/resource-forms";
import { requireSchoolPage } from "@/modules/auth/page-session";
export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolPage("academic.view");
  const { edit } = await searchParams;
  const [items, selected] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { name: "asc" },
    }),
    edit
      ? prisma.subject.findFirst({
          where: { id: edit, schoolId: session.schoolId },
        })
      : null,
  ]);
  const canManage = session.permissions.has("academic.manage");
  return (
    <>
      <PageHeader
        eyebrow="Academic setup"
        title="Subjects"
        description="Maintain subject definitions and their default marks configuration."
      />
      <CurriculumReference />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle>Subject directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Marks</th>
                    <th className="px-5 py-3">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-semibold">{item.name}</td>
                      <td className="px-5 py-4">{item.code}</td>
                      <td className="px-5 py-4">{item.subjectType}</td>
                      <td className="px-5 py-4">
                        {item.theoryFullMarks} + {item.practicalFullMarks} +{" "}
                        {item.internalFullMarks}
                      </td>
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
                          <Link href={`/dashboard/subjects?edit=${item.id}`}>
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
              <p className="py-14 text-center font-semibold">No subjects yet</p>
            )}
          </CardContent>
        </Card>
        <Card className={canManage ? undefined : "hidden"}>
          <CardHeader>
            <CardTitle>
              {selected ? `Edit ${selected.name}` : "Create subject"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectForm initial={selected ?? undefined} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SectionForm } from "@/modules/academic/components/resource-forms";
import { requireSchoolPage } from "@/modules/auth/page-session";
export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolPage("academic.view");
  const { edit } = await searchParams;
  const [items, classes, selected] = await Promise.all([
    prisma.section.findMany({
      where: { schoolId: session.schoolId },
      include: { class: true, _count: { select: { enrollments: true } } },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }],
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    edit
      ? prisma.section.findFirst({
          where: { id: edit, schoolId: session.schoolId },
        })
      : null,
  ]);
  const canManage = session.permissions.has("academic.manage");
  return (
    <>
      <PageHeader
        eyebrow="Academic setup"
        title="Sections"
        description="Organize each class into capacity-aware sections."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Section directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Section</th>
                    <th className="px-5 py-3">Capacity</th>
                    <th className="px-5 py-3">Enrollments</th>
                    <th className="px-5 py-3">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">{item.class.name}</td>
                      <td className="px-5 py-4 font-semibold">{item.name}</td>
                      <td className="px-5 py-4">{item.capacity ?? "—"}</td>
                      <td className="px-5 py-4">{item._count.enrollments}</td>
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
                          <Link href={`/dashboard/sections?edit=${item.id}`}>
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
              <p className="py-14 text-center font-semibold">No sections yet</p>
            )}
          </CardContent>
        </Card>
        <Card className={canManage ? undefined : "hidden"}>
          <CardHeader>
            <CardTitle>
              {selected ? "Edit section" : "Create section"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length ? (
              <SectionForm classes={classes} initial={selected ?? undefined} />
            ) : (
              <p className="text-sm text-slate-600">
                Create an active class before adding sections.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

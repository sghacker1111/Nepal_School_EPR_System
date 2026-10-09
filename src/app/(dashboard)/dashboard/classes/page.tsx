import { Pencil, School } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ClassForm } from "@/modules/academic/components/resource-forms";
import { requireSchoolPage } from "@/modules/auth/page-session";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolPage("academic.view");
  const { edit } = await searchParams;
  const [items, selected] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      include: {
        _count: {
          select: {
            sections: true,
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    edit
      ? prisma.class.findFirst({
          where: { id: edit, schoolId: session.schoolId },
        })
      : null,
  ]);
  const canManage = session.permissions.has("academic.manage");
  return (
    <>
      <PageHeader
        eyebrow="Academic setup"
        title="Classes"
        description="Define the school levels used by sections and enrollment history."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Class directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Level</th>
                      <th className="px-5 py-3">Sections</th>
                      <th className="px-5 py-3">Active enrollments</th>
                      <th className="px-5 py-3">Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4 font-semibold">{item.name}</td>
                        <td className="px-5 py-4">
                          {item.numericLevel ?? "—"}
                        </td>
                        <td className="px-5 py-4">{item._count.sections}</td>
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
                            <Link href={`/dashboard/classes?edit=${item.id}`}>
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
            ) : (
              <div className="py-14 text-center">
                <School className="mx-auto size-9 text-slate-300" />
                <p className="mt-3 font-semibold">No classes yet</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className={canManage ? undefined : "hidden"}>
          <CardHeader>
            <CardTitle>
              {selected ? `Edit ${selected.name}` : "Create class"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClassForm initial={selected ?? undefined} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { CalendarRange, Pencil } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { AcademicYearForm } from "@/modules/academic/components/resource-forms";
import { requireSchoolPage } from "@/modules/auth/page-session";

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolPage("academic.view");
  const { edit } = await searchParams;
  const [years, selected] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    }),
    edit
      ? prisma.academicYear.findFirst({
          where: { id: edit, schoolId: session.schoolId },
        })
      : null,
  ]);
  const canManage = session.permissions.has("academic.manage");
  return (
    <>
      <PageHeader
        eyebrow="Academic setup"
        title="Academic years"
        description="Maintain historical school years and select one current year for operational modules."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Configured years</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {years.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Academic year</th>
                      <th className="px-5 py-3">Period</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {years.map((year) => (
                      <tr key={year.id}>
                        <td className="px-5 py-4 font-semibold">
                          {year.name}
                          {year.isCurrent && (
                            <Badge className="ml-2" variant="success">
                              Current
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {year.startDate.toLocaleDateString()} –{" "}
                          {year.endDate.toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline">{year.status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className={canManage ? undefined : "hidden"}
                          >
                            <Link
                              href={`/dashboard/academic-years?edit=${year.id}`}
                            >
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
                <CalendarRange className="mx-auto size-9 text-slate-300" />
                <p className="mt-3 font-semibold">No academic years yet</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className={canManage ? undefined : "hidden"}>
          <CardHeader>
            <CardTitle>
              {selected ? `Edit ${selected.name}` : "Create academic year"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AcademicYearForm
              initial={
                selected
                  ? {
                      ...selected,
                      startDate: selected.startDate.toISOString().slice(0, 10),
                      endDate: selected.endDate.toISOString().slice(0, 10),
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

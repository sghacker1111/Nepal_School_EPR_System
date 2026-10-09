import { Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSchoolPage("teacher.view");
  const { q = "", status = "" } = await searchParams;
  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId: session.schoolId,
      ...(status
        ? {
            status: status as
              | "ACTIVE"
              | "INACTIVE"
              | "ON_LEAVE"
              | "RESIGNED"
              | "ARCHIVED",
          }
        : {}),
      ...(q
        ? {
            OR: [
              { normalizedName: { contains: q.toLocaleLowerCase("en-US") } },
              { teacherCode: { contains: q, mode: "insensitive" } },
              { mobile: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { status: true, username: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { normalizedName: "asc" },
    take: 100,
  });
  const canCreate = session.permissions.has("teacher.create");
  const canEdit = session.permissions.has("teacher.edit");
  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Teachers"
        description="Manage teacher profiles, optional login accounts, employment status, and teaching assignments."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/dashboard/teachers/new">
                <Plus />
                Add teacher
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Card className="mb-6">
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                className="pl-9"
                placeholder="Search name, code, or mobile"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="RESIGNED">Resigned</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {teachers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Teacher</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Employment</th>
                    <th className="px-5 py-3">Assignments</th>
                    <th className="px-5 py-3">Login</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/teachers/${teacher.id}`}
                          className="font-semibold text-emerald-800 hover:underline"
                        >
                          {teacher.firstName} {teacher.middleName}{" "}
                          {teacher.lastName}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {teacher.teacherCode}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {teacher.mobile}
                        <p className="text-xs text-slate-500">
                          {teacher.email ?? "No email"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            teacher.status === "ACTIVE" ? "success" : "outline"
                          }
                        >
                          {teacher.status}
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">
                          {teacher.employmentType}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {teacher._count.assignments}
                      </td>
                      <td className="px-5 py-4">
                        {teacher.user ? (
                          <>
                            <Badge
                              variant={
                                teacher.user.status === "ACTIVE"
                                  ? "success"
                                  : "outline"
                              }
                            >
                              {teacher.user.status}
                            </Badge>
                            <p className="mt-1 text-xs">
                              @{teacher.user.username}
                            </p>
                          </>
                        ) : (
                          "Not created"
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canEdit && (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/dashboard/teachers/${teacher.id}/edit`}
                            >
                              Edit
                            </Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <UserRound className="mx-auto size-9 text-slate-300" />
              <p className="mt-3 font-semibold">No teachers found</p>
              <p className="mt-1 text-sm text-slate-500">
                Add the first teacher or adjust your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

function statusVariant(status: string) {
  return status === "ACTIVE"
    ? ("success" as const)
    : status === "TRIAL"
      ? ("warning" as const)
      : ("destructive" as const);
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const statuses = ["TRIAL", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
  const status = statuses.find((item) => item === params.status);
  const where = {
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query.toUpperCase() } },
            { district: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { students: true, teachers: true } } },
    }),
    prisma.school.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="Tenant management"
        title="Schools"
        description={`${total} school${total === 1 ? "" : "s"} match the current view.`}
        actions={
          <Button asChild>
            <Link href="/super-admin/schools/new">
              <Plus />
              Create school
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <form className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input
                name="q"
                defaultValue={query}
                className="pl-9"
                placeholder="Search name, school code, or district"
              />
            </div>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>
          {schools.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">School</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Principal</th>
                    <th className="px-5 py-3">Students</th>
                    <th className="px-5 py-3">Teachers</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schools.map((school) => (
                    <tr key={school.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {school.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {school.code} · {school.type}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{school.district}</p>
                        <p className="text-xs text-slate-500">
                          {school.localLevel}-{school.ward}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{school.principalName}</p>
                        <p className="text-xs text-slate-500">
                          {school.principalPhone}
                        </p>
                      </td>
                      <td className="px-5 py-4">{school._count.students}</td>
                      <td className="px-5 py-4">{school._count.teachers}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(school.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(school.status)}>
                          {school.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/super-admin/schools/${school.id}`}>
                            Manage
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Building2 className="mx-auto size-10 text-slate-300" />
              <h2 className="mt-4 font-semibold">No schools found</h2>
              <p className="mt-1 text-sm text-slate-500">
                Adjust the filters or create a new school.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between border-t px-5 py-4 text-sm text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                asChild={page > 1}
                disabled={page <= 1}
                size="sm"
                variant="outline"
              >
                {page > 1 ? (
                  <Link
                    href={`?q=${encodeURIComponent(query)}&status=${status ?? ""}&page=${page - 1}`}
                  >
                    Previous
                  </Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>
              <Button
                asChild={page < totalPages}
                disabled={page >= totalPages}
                size="sm"
                variant="outline"
              >
                {page < totalPages ? (
                  <Link
                    href={`?q=${encodeURIComponent(query)}&status=${status ?? ""}&page=${page + 1}`}
                  >
                    Next
                  </Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

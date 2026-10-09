import { academicAccess } from "@/modules/auth/academic-access";
import type { Prisma, StudentStatus } from "@/generated/prisma/client";
import { Archive, Download, Plus, Search, Upload, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
const statuses = [
  "ACTIVE",
  "INACTIVE",
  "TRANSFERRED",
  "GRADUATED",
  "DROPPED",
  "ARCHIVED",
];
export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    page?: string;
  }>;
}) {
  const session = await requireSchoolPage("student.view");
  const access = await academicAccess(session);
  const p = await searchParams;
  const page = Math.min(100000, Math.max(1, Math.floor(Number(p.page)) || 1));
  const take = 25;
  const normalizedQuery = p.q?.trim().toLocaleLowerCase("en-US");
  const enrollmentFilter: Prisma.StudentEnrollmentWhereInput = {
    ...access.enrollmentWhere,
    ...(p.academicYearId ? { academicYearId: p.academicYearId } : {}),
    ...(p.classId ? { classId: p.classId } : {}),
    ...(p.sectionId ? { sectionId: p.sectionId } : {}),
  };
  const where: Prisma.StudentWhereInput = {
    schoolId: session.schoolId,
    ...(p.status && statuses.includes(p.status)
      ? { status: p.status as StudentStatus }
      : {}),
    ...(Object.keys(enrollmentFilter).length
      ? { enrollments: { some: enrollmentFilter } }
      : {}),
    ...(normalizedQuery
      ? {
          OR: [
            { normalizedName: { contains: normalizedQuery } },
            { nameInNepali: { contains: p.q!.trim() } },
            { iemisId: { contains: p.q!.trim(), mode: "insensitive" } },
            { admissionNumber: { contains: p.q!.trim(), mode: "insensitive" } },
            { studentId: { contains: p.q!.trim(), mode: "insensitive" } },
            { mobile: { contains: p.q!.trim() } },
            {
              guardians: {
                some: {
                  guardian: {
                    OR: [
                      { normalizedName: { contains: normalizedQuery } },
                      { mobile: { contains: p.q!.trim() } },
                    ],
                  },
                },
              },
            },
            {
              enrollments: {
                some: {
                  rollNumber: { contains: p.q!.trim(), mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };
  const [students, total, years, classes, sections] = await Promise.all([
    prisma.student.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        admissionNumber: true,
        iemisId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        nameInNepali: true,
        status: true,
        guardians: {
          where: { isPrimary: true },
          take: 1,
          select: {
            guardian: {
              select: { firstName: true, lastName: true, mobile: true },
            },
          },
        },
        enrollments: {
          where: enrollmentFilter,
          include: { academicYear: true, class: true, section: true },
          orderBy: { academicYear: { startDate: "desc" } },
          take: 1,
        },
      },
      orderBy: { normalizedName: "asc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.student.count({ where }),
    prisma.academicYear.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.section.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, classId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const query = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(p))
      if (value && key !== "page") params.set(key, value);
    params.set("page", String(next));
    return `?${params}`;
  };
  const actions = (
    <>
      {session.permissions.has("student.import") && (
        <Button asChild variant="outline">
          <Link href="/dashboard/students/import">
            <Upload />
            Import
          </Link>
        </Button>
      )}
      {session.permissions.has("student.export") && (
        <Button asChild variant="outline">
          <Link href="/api/students/export">
            <Download />
            Export
          </Link>
        </Button>
      )}
      {session.permissions.has("student.create") && (
        <Button asChild>
          <Link href="/dashboard/students/new">
            <Plus />
            Add student
          </Link>
        </Button>
      )}
    </>
  );
  return (
    <>
      <PageHeader
        eyebrow="Student management"
        title="Students"
        description="Search tenant-scoped master records and enrollment history without loading the whole school into the browser."
        actions={actions}
      />
      <Card className="mb-6">
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input
                name="q"
                defaultValue={p.q}
                className="pl-9"
                placeholder="Name, IEMIS, admission, roll, parent, mobile"
              />
            </div>
            <select
              name="status"
              defaultValue={p.status ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {statuses.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              name="academicYearId"
              defaultValue={p.academicYearId ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All years</option>
              {years.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              name="classId"
              defaultValue={p.classId ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All classes</option>
              {classes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              name="sectionId"
              defaultValue={p.sectionId ?? ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">All sections</option>
              {sections
                .filter((v) => !p.classId || v.classId === p.classId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/students?status=ARCHIVED">
                <Archive />
                Archived students
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {students.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Identifiers</th>
                      <th className="px-5 py-3">Current/latest class</th>
                      <th className="px-5 py-3">Guardian</th>
                      <th className="px-5 py-3">Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s) => {
                      const e = s.enrollments[0];
                      const g = s.guardians[0]?.guardian;
                      return (
                        <tr key={s.id}>
                          <td className="px-5 py-4">
                            <Link
                              className="font-semibold text-emerald-800 hover:underline"
                              href={`/dashboard/students/${s.id}`}
                            >
                              {s.firstName} {s.middleName} {s.lastName}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {s.nameInNepali ?? ""}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {s.studentId}
                            <p className="text-xs text-slate-500">
                              Admission {s.admissionNumber}
                              {s.iemisId ? ` · IEMIS ${s.iemisId}` : ""}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {e
                              ? `${e.class.name} ${e.section.name}`
                              : "Not enrolled"}
                            <p className="text-xs text-slate-500">
                              {e
                                ? `${e.academicYear.name} · Roll ${e.rollNumber ?? "—"}`
                                : ""}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {g ? `${g.firstName} ${g.lastName}` : "—"}
                            <p className="text-xs text-slate-500">
                              {g?.mobile}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              variant={
                                s.status === "ACTIVE" ? "success" : "outline"
                              }
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            {session.permissions.has("student.edit") && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/dashboard/students/${s.id}/edit`}>
                                  Edit
                                </Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t px-5 py-4 text-sm">
                <span>
                  Showing {(page - 1) * take + 1}–{Math.min(page * take, total)}{" "}
                  of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    <Link href={query(page - 1)}>Previous</Link>
                  </Button>
                  <span className="px-2 py-2">
                    Page {page} of {pages}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className={
                      page >= pages ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    <Link href={query(page + 1)}>Next</Link>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <Users className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold">No students found</p>
              <p className="mt-1 text-sm text-slate-500">
                Add the first student or adjust the filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

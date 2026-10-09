import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { SchoolAdminPasswordReset } from "@/modules/schools/components/school-admin-password-reset";
import { SchoolStatusAction } from "@/modules/schools/components/school-status-action";

export default async function SchoolDetailsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      settings: true,
      users: {
        where: { roles: { some: { role: { code: "SCHOOL_ADMIN" } } } },
        include: { roles: { include: { role: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      _count: {
        select: {
          users: true,
          roles: true,
          sessions: true,
          students: true,
          teachers: true,
          academicYears: true,
        },
      },
    },
  });
  if (!school) notFound();

  return (
    <>
      <PageHeader
        eyebrow={school.code}
        title={school.name}
        description={`${school.type} · ${school.level} · Created ${formatDate(school.createdAt)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/super-admin/schools">
                <ArrowLeft />
                Schools
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/super-admin/schools/${school.id}/edit`}>
                <Pencil />
                Edit school
              </Link>
            </Button>
            {school.status !== "ACTIVE" && (
              <SchoolStatusAction schoolId={school.id} status="ACTIVE" />
            )}
            {school.status !== "SUSPENDED" && school.status !== "ARCHIVED" && (
              <SchoolStatusAction schoolId={school.id} status="SUSPENDED" />
            )}
            {school.status !== "ARCHIVED" ? (
              <SchoolStatusAction schoolId={school.id} status="ARCHIVED" />
            ) : (
              <SchoolStatusAction schoolId={school.id} status="TRIAL" />
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge
          variant={
            school.status === "ACTIVE"
              ? "success"
              : school.status === "TRIAL"
                ? "warning"
                : "destructive"
          }
        >
          {school.status}
        </Badge>
        <Badge variant="outline">{school.subscriptionPlan}</Badge>
        <Badge variant="outline">{school._count.students} students</Badge>
        <Badge variant="outline">{school._count.teachers} teachers</Badge>
        <Badge variant="outline">
          {school._count.academicYears} academic years
        </Badge>
        <Badge variant="outline">{school._count.users} users</Badge>
      </div>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Registered school and management details.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Info
                icon={Building2}
                label="Principal"
                value={school.principalName}
                detail={school.principalPhone}
              />
              <Info
                icon={MapPin}
                label="Address"
                value={`${school.localLevel}-${school.ward}, ${school.district}`}
                detail={school.address}
              />
              <Info
                icon={Mail}
                label="Email"
                value={school.email}
                detail={school.principalEmail ?? undefined}
              />
              <Info
                icon={Phone}
                label="Contact"
                value={school.mobile}
                detail={school.phone ?? undefined}
              />
              <Info
                icon={CalendarDays}
                label="Calendar"
                value={school.settings?.calendarPreference ?? "BOTH"}
                detail={`${school.settings?.timeZone ?? "Asia/Kathmandu"} · ${school.settings?.currency ?? "NPR"}`}
              />
              <Info
                icon={ShieldCheck}
                label="Tenant controls"
                value={`${school._count.roles} roles`}
                detail="Database sessions are revocable"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>
                School Admin accounts linked only to this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {school.users.length ? (
                <div className="divide-y">
                  {school.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {user.firstName.charAt(0)}
                        {user.lastName.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {user.firstName} {user.middleName} {user.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{user.username} · {user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            user.status === "ACTIVE" ? "success" : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                        {user.mustChangePassword && (
                          <Badge variant="warning">Password change due</Badge>
                        )}
                        <SchoolAdminPasswordReset
                          schoolId={school.id}
                          userId={user.id}
                          username={user.username}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Users className="mx-auto size-8 text-slate-300" />
                  <p className="mt-3 text-sm">
                    No School Administrator account found.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Audited lifecycle and access actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {school.auditLogs.length ? (
              <div className="space-y-5">
                {school.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="relative border-l-2 border-slate-200 pl-4"
                  >
                    <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-emerald-600" />
                    <p className="text-sm text-slate-700">{log.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName} · `
                        : ""}
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No activity recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
        {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
      </div>
    </div>
  );
}

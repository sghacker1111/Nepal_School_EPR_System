import {
  Activity,
  Building2,
  CircleCheckBig,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";

import { StatCard } from "@/components/dashboard/stat-card";
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

function statusVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "SUSPENDED" || status === "ARCHIVED")
    return "destructive" as const;
  return "warning" as const;
}

export default async function SuperAdminDashboardPage() {
  const [
    schoolCount,
    activeCount,
    suspendedCount,
    adminCount,
    recentSchools,
    recentActivity,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: "ACTIVE" } }),
    prisma.school.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({
      where: { roles: { some: { role: { code: "SCHOOL_ADMIN" } } } },
    }),
    prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Platform overview"
        title="Super Admin dashboard"
        description="Monitor school access and manage the multi-tenant platform from one secure console."
        actions={
          <Button asChild>
            <Link href="/super-admin/schools/new">
              <Plus />
              Create school
            </Link>
          </Button>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total schools"
          value={schoolCount}
          detail="All retained school records"
          icon={Building2}
        />
        <StatCard
          label="Active schools"
          value={activeCount}
          detail="Currently allowed to sign in"
          icon={CircleCheckBig}
          tone="blue"
        />
        <StatCard
          label="Suspended"
          value={suspendedCount}
          detail="School access is disabled"
          icon={ShieldAlert}
          tone="amber"
        />
        <StatCard
          label="School admins"
          value={adminCount}
          detail="Tenant administrator accounts"
          icon={Users}
          tone="slate"
        />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent schools</CardTitle>
              <CardDescription>
                Newest tenants added to the platform.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/super-admin/schools">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSchools.length ? (
              <div className="divide-y">
                {recentSchools.map((school) => (
                  <Link
                    key={school.id}
                    href={`/super-admin/schools/${school.id}`}
                    className="flex items-center gap-3 py-3 first:pt-0 hover:text-emerald-800"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-sm font-bold">
                      {school.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {school.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {school.code} · {school.district}
                      </span>
                    </span>
                    <Badge variant={statusVariant(school.status)}>
                      {school.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Building2 className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold">No schools yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Create the first school to begin.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Administrative activity</CardTitle>
            <CardDescription>
              Latest security-sensitive platform events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="space-y-4">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                      <Activity className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm leading-5 text-slate-700">
                        {log.description}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {log.user
                          ? `${log.user.firstName} ${log.user.lastName} · `
                          : ""}
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No administrative events recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

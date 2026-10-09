import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  KeyRound,
  School,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
import { requireSchoolPage } from "@/modules/auth/page-session";

export default async function SchoolDashboardPage() {
  const session = await requireSchoolPage("dashboard.view");
  if (
    !session.roles.has("SCHOOL_ADMIN") &&
    !session.roles.has("EXAM_COORDINATOR")
  )
    redirect("/teacher");
  const [
    studentCount,
    teacherCount,
    classSectionCount,
    currentYear,
    settings,
    recentActivity,
    attendanceCount,
    pendingMarks,
    publishedExams,
  ] = await Promise.all([
    prisma.student.count({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
    }),
    prisma.teacher.count({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
    }),
    prisma.section.count({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: session.schoolId, isCurrent: true },
      select: { name: true },
    }),
    prisma.schoolSetting.findUnique({ where: { schoolId: session.schoolId } }),
    prisma.auditLog.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.attendanceSession.count({
      where: {
        schoolId: session.schoolId,
        status: { in: ["SUBMITTED", "LOCKED"] },
      },
    }),
    prisma.markSheet.count({
      where: {
        schoolId: session.schoolId,
        status: { in: ["SUBMITTED", "VERIFIED"] },
      },
    }),
    prisma.exam.count({
      where: { schoolId: session.schoolId, status: "PUBLISHED" },
    }),
  ]);
  const setupProgress = Math.round(
    ([
      Boolean(currentYear),
      classSectionCount > 0,
      teacherCount > 0,
      studentCount > 0,
    ].filter(Boolean).length /
      4) *
      100,
  );

  return (
    <>
      <PageHeader
        eyebrow={session.school.code}
        title={`Welcome back, ${session.user.firstName}`}
        description={`${session.school.name} · Your dashboard is strictly scoped to this school.`}
        actions={
          <Badge
            variant={session.school.status === "ACTIVE" ? "success" : "warning"}
          >
            {session.school.status}
          </Badge>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={studentCount}
          detail="Current student master records"
          icon={GraduationCap}
        />
        <StatCard
          label="Active teachers"
          value={teacherCount}
          detail="Current teaching staff"
          icon={UserRound}
          tone="blue"
        />
        <StatCard
          label="Classes / sections"
          value={classSectionCount}
          detail="Active enrollment groups"
          icon={School}
          tone="amber"
        />
        <StatCard
          label="Academic year"
          value={
            currentYear?.name || settings?.defaultAcademicYear || "Not set"
          }
          detail={`${setupProgress}% setup profile`}
          icon={CalendarDays}
          tone="slate"
        />
        <StatCard
          label="Attendance sessions"
          value={attendanceCount}
          detail="Submitted or locked sessions"
          icon={CalendarCheck}
          tone="blue"
        />
        <StatCard
          label="Marks awaiting review"
          value={pendingMarks}
          detail="Submitted or verified sheets"
          icon={ClipboardCheck}
          tone="amber"
        />
        <StatCard
          label="Published exams"
          value={publishedExams}
          detail="Results visible to students"
          icon={GraduationCap}
        />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Foundation status</CardTitle>
            <CardDescription>
              Security controls enabled for your school workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Building2,
                title: "Tenant isolation",
                text: `All queries use ${session.school.code}'s authenticated school context.`,
              },
              {
                icon: KeyRound,
                title: "Secure access",
                text: "HttpOnly sessions, Argon2id passwords, lockout, and forced password changes.",
              },
              {
                icon: ShieldCheck,
                title: "Role permissions",
                text: "Server-enforced SCHOOL_ADMIN permissions are active.",
              },
              {
                icon: CalendarDays,
                title: "Nepal defaults",
                text: `${settings?.timeZone ?? "Asia/Kathmandu"} · ${settings?.currency ?? "NPR"} · ${settings?.calendarPreference ?? "BOTH"}`,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border bg-slate-50 p-4"
              >
                <item.icon className="size-5 text-emerald-700" />
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.text}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Audited events from this school.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="border-l-2 border-emerald-200 pl-3"
                  >
                    <p className="text-sm text-slate-700">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.createdAt.toLocaleString("en-NP", {
                        timeZone: "Asia/Kathmandu",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No activity yet.
              </p>
            )}
            {session.permissions.has("audit.view") && (
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link href="/dashboard/audit-logs">View audit history</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

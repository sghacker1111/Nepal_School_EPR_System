import { Bell, FileText, GraduationCap, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/modules/auth/actions";
import { ROLE_CODES } from "@/modules/auth/constants";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { getUserNotifications } from "@/modules/notifications/service";

export default async function StudentPortalPage() {
  const session = await requireSchoolPage("dashboard.view");
  if (!session.roles.has(ROLE_CODES.STUDENT)) redirect("/access-denied");
  const student = await prisma.student.findFirst({
    where: {
      schoolId: session.schoolId,
      userId: session.user.id,
      status: { not: "ARCHIVED" },
    },
    include: {
      guardians: {
        where: { isPrimary: true },
        include: { guardian: true },
        take: 1,
      },
      enrollments: {
        include: { academicYear: true, class: true, section: true },
        orderBy: { academicYear: { startDate: "desc" } },
      },
    },
  });
  if (!student) redirect("/access-denied");
  const [attendanceRecords, results, notifications] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        schoolId: session.schoolId,
        studentId: student.id,
        session: { status: { in: ["SUBMITTED", "LOCKED"] } },
      },
      select: { status: true },
    }),
    session.permissions.has("result.view") ? prisma.studentResult.findMany({
      where: {
        schoolId: session.schoolId,
        studentId: student.id,
        resultStatus: "PUBLISHED",
      },
      include: {
        exam: true,
        enrollment: {
          include: { academicYear: true, class: true, section: true },
        },
      },
      orderBy: { publishedAt: "desc" },
    }) : Promise.resolve([]),
    getUserNotifications(session.schoolId, session.user.id, 5),
  ]);
  const working = attendanceRecords.filter(
    (record) => record.status !== "HOLIDAY",
  ).length;
  const present = attendanceRecords.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE",
  ).length;
  const percentage = working ? ((present / working) * 100).toFixed(2) : "0.00";
  const current =
    student.enrollments.find((enrollment) => enrollment.status === "ACTIVE") ??
    student.enrollments[0];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <form action={logoutAction}>
            <Button type="submit" variant="ghost">
              <LogOut />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 py-8 sm:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Student portal · {session.school.code}
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Welcome, {student.firstName}
          </h1>
          <p className="mt-1 text-slate-600">
            Your profile, attendance, results, report cards, and notifications
            are read-only.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Current class</CardTitle>
            </CardHeader>
            <CardContent>
              {current ? (
                <>
                  <GraduationCap className="mb-3 size-8 text-emerald-700" />
                  <p className="text-2xl font-bold">
                    {current.class.name} {current.section.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {current.academicYear.name} · Roll{" "}
                    {current.rollNumber ?? "—"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No active enrollment.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{percentage}%</p>
              <p className="mt-1 text-sm text-slate-500">
                {present} present/late of {working} working days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Student ID:</strong> {student.studentId}
              </p>
              <p>
                <strong>Admission:</strong> {student.admissionNumber}
              </p>
              <p>
                <strong>IEMIS:</strong> {student.iemisId ?? "—"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge variant="success">{student.status}</Badge>
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Published results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {results.length ? (
              <div className="divide-y">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm"
                  >
                    <div className="min-w-52">
                      <strong>{result.exam.name}</strong>
                      <span className="block text-xs text-slate-500">
                        {result.enrollment.academicYear.name} ·{" "}
                        {result.enrollment.class.name}{" "}
                        {result.enrollment.section.name}
                      </span>
                    </div>
                    <span>GPA {result.gpa.toString()}</span>
                    <span>Grade {result.finalGrade}</span>
                    <Badge
                      variant={
                        result.outcome === "PASS" ? "success" : "warning"
                      }
                    >
                      {result.outcome}
                    </Badge>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                    >
                      <Link href={`/student/results/${result.id}`}>
                        <FileText />
                        Report card
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No published results.
              </p>
            )}
          </CardContent>
        </Card>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-4 text-sm"
                  >
                    <strong>{enrollment.academicYear.name}</strong>
                    <span>
                      {enrollment.class.name} {enrollment.section.name}
                    </span>
                    <span>Roll {enrollment.rollNumber ?? "—"}</span>
                    <Badge variant="outline">{enrollment.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <Bell className="mr-2 inline size-5" />
                Recent notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{notification.title}</p>
                      {!notification.isRead && (
                        <Badge variant="success">New</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {notification.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No notifications.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

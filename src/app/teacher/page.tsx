import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  FileQuestion,
  LogOut,
} from "lucide-react";
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

export default async function TeacherPortalPage() {
  const session = await requireSchoolPage("dashboard.view");
  if (!session.roles.has(ROLE_CODES.TEACHER)) redirect("/access-denied");
  const [teacher, notifications, pendingSheets] = await Promise.all([
    prisma.teacher.findFirst({
      where: {
        schoolId: session.schoolId,
        userId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: {
            academicYear: true,
            class: true,
            section: true,
            subject: true,
          },
          orderBy: [
            { academicYear: { startDate: "desc" } },
            { class: { displayOrder: "asc" } },
          ],
        },
      },
    }),
    getUserNotifications(session.schoolId, session.user.id, 5),
    prisma.markSheet.count({
      where: {
        schoolId: session.schoolId,
        enteredById: session.user.id,
        status: { in: ["DRAFT", "SUBMITTED", "VERIFIED"] },
      },
    }),
  ]);
  if (!teacher) redirect("/access-denied");
  const shortcuts = [
    {
      label: "Take attendance",
      href: "/dashboard/attendance",
      icon: CalendarCheck,
      permission: "attendance.view",
    },
    {
      label: "Enter marks",
      href: "/dashboard/exams/marks",
      icon: ClipboardCheck,
      permission: "marks.enter",
    },
    {
      label: "Question bank",
      href: "/dashboard/question-bank",
      icon: FileQuestion,
      permission: "question.view",
    },
    {
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
      permission: "notification.view",
    },
  ].filter((item) => session.permissions.has(item.permission));
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
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Teacher portal · {session.school.code}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Welcome, {teacher.firstName}
        </h1>
        <p className="mt-1 text-slate-600">
          Teaching tools are scoped to your linked assignments.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher code</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {teacher.teacherCode}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {teacher.assignments.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Marks in workflow</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {pendingSheets}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="success">{teacher.status}</Badge>
            </CardContent>
          </Card>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((item) => (
            <Button
              asChild
              key={item.href}
              variant="outline"
              className="h-auto justify-start p-4"
            >
              <Link href={item.href}>
                <item.icon />
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Teaching assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teacher.assignments.length ? (
              <div className="divide-y">
                {teacher.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm"
                  >
                    <BookOpenCheck className="text-emerald-700" />
                    <strong>{assignment.academicYear.name}</strong>
                    <span>
                      {assignment.class.name}{" "}
                      {assignment.section?.name ?? "All sections"}
                    </span>
                    <span>{assignment.subject.name}</span>
                    {assignment.isClassTeacher && (
                      <Badge variant="success">Class teacher</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No active assignments.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent notifications</CardTitle>
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
            <Button asChild variant="outline">
              <Link href="/dashboard/notifications">Open inbox</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

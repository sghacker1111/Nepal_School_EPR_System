import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  FileClock,
  FileQuestion,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  School,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentSession } from "@/modules/auth/session";
import { redirect } from "next/navigation";

export default async function SchoolDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  if (session.isSuperAdmin || !session.school || !session.user.schoolId)
    redirect("/access-denied");
  if (!session.permissions.has("dashboard.view")) redirect("/access-denied");
  if (session.roles.has("STUDENT")) redirect("/student");
  const navigation = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="size-[18px]" />,
      permission: "dashboard.view",
    },
    {
      label: "Students",
      href: "/dashboard/students",
      icon: <GraduationCap className="size-[18px]" />,
      permission: "student.view",
    },
    {
      label: "Teachers",
      href: "/dashboard/teachers",
      icon: <UserRound className="size-[18px]" />,
      permission: "teacher.view",
    },
    {
      label: "Teacher Assignments",
      href: "/dashboard/teacher-assignments",
      icon: <BookOpenCheck className="size-[18px]" />,
      permission: "teacher.view",
    },
    {
      label: "Academic Years",
      href: "/dashboard/academic-years",
      icon: <CalendarRange className="size-[18px]" />,
      permission: "academic.view",
    },
    {
      label: "Classes",
      href: "/dashboard/classes",
      icon: <School className="size-[18px]" />,
      permission: "academic.view",
    },
    {
      label: "Sections",
      href: "/dashboard/sections",
      icon: <Users className="size-[18px]" />,
      permission: "academic.view",
    },
    {
      label: "Subjects",
      href: "/dashboard/subjects",
      icon: <LibraryBig className="size-[18px]" />,
      permission: "academic.view",
    },
    {
      label: "Class Subjects",
      href: "/dashboard/class-subjects",
      icon: <BookOpenCheck className="size-[18px]" />,
      permission: "academic.view",
    },
    {
      label: "Attendance",
      href: "/dashboard/attendance",
      icon: <CalendarCheck className="size-[18px]" />,
      permission: "attendance.view",
    },
    {
      label: "Examinations",
      href: "/dashboard/exams",
      icon: <ClipboardCheck className="size-[18px]" />,
      permission: "exam.view",
    },
    {
      label: "Results",
      href: "/dashboard/results",
      icon: <GraduationCap className="size-[18px]" />,
      permission: "result.view",
    },
    {
      label: "Question Bank",
      href: "/dashboard/question-bank",
      icon: <FileQuestion className="size-[18px]" />,
      permission: "question.view",
    },
    {
      label: "Specification Grids",
      href: "/dashboard/exams/specification-grid",
      icon: <FileStack className="size-[18px]" />,
      permission: "paper.view",
    },
    {
      label: "Paper Generator",
      href: "/dashboard/exams/paper-generator",
      icon: <FileStack className="size-[18px]" />,
      permission: "paper.view",
    },
    {
      label: "Reports",
      href: "/dashboard/reports",
      icon: <BarChart3 className="size-[18px]" />,
      permission: "report.view",
    },
    {
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: <Bell className="size-[18px]" />,
      permission: "notification.view",
    },
    {
      label: "Users & Permissions",
      href: "/dashboard/users",
      icon: <Users className="size-[18px]" />,
      permission: "user.view",
    },
    {
      label: "Audit History",
      href: "/dashboard/audit-logs",
      icon: <FileClock className="size-[18px]" />,
      permission: "audit.view",
    },
    {
      label: "Account Security",
      href: "/dashboard/security",
      icon: <ShieldCheck className="size-[18px]" />,
      permission: "dashboard.view",
    },
    {
      label: "School Settings",
      href: "/dashboard/settings",
      icon: <Settings className="size-[18px]" />,
      permission: "school.settings.manage",
    },
  ]
    .filter((item) => session.permissions.has(item.permission))
    .map(({ permission: _permission, ...item }) => {
      void _permission;
      return item;
    });
  return (
    <DashboardShell
      navigation={navigation}
      user={session.user}
      contextLabel={session.school.code}
      contextDetail={session.school.name}
    >
      {children}
    </DashboardShell>
  );
}

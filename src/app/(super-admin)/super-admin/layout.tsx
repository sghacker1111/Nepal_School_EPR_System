import {
  Building2,
  FileClock,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentSession } from "@/modules/auth/session";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/super-admin/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  if (!session.isSuperAdmin || session.user.schoolId)
    redirect("/access-denied");
  const navigation = [
    {
      label: "Dashboard",
      href: "/super-admin",
      icon: <LayoutDashboard className="size-[18px]" />,
    },
    {
      label: "Schools",
      href: "/super-admin/schools",
      icon: <Building2 className="size-[18px]" />,
    },
    {
      label: "School Admins",
      href: "/super-admin/school-admins",
      icon: <Users className="size-[18px]" />,
    },
    {
      label: "Audit Logs",
      href: "/super-admin/audit-logs",
      icon: <FileClock className="size-[18px]" />,
    },
    {
      label: "Security",
      href: "/super-admin/security",
      icon: <ShieldCheck className="size-[18px]" />,
    },
  ];
  return (
    <DashboardShell
      navigation={navigation}
      user={session.user}
      contextLabel="Platform console"
      contextDetail="Super Administration"
    >
      {children}
    </DashboardShell>
  );
}

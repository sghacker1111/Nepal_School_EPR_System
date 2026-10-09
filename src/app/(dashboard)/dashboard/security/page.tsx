import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSchoolPage } from "@/modules/auth/page-session";

export default async function SchoolSecurityPage() {
  const session = await requireSchoolPage();
  return (
    <>
      <PageHeader
        eyebrow={session.school.code}
        title="Account security"
        description="Security posture for your authenticated school workspace."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: LockKeyhole,
            title: "Tenant-bound session",
            text: `This session is cryptographically random and bound to ${session.school.name}.`,
          },
          {
            icon: KeyRound,
            title: "Password protection",
            text: "Passwords cannot be retrieved. Resets create a one-time temporary password and revoke sessions.",
          },
          {
            icon: ShieldCheck,
            title: "Server permissions",
            text: `${session.permissions.size} permissions are enforced server-side for your current roles.`,
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <item.icon className="size-6 text-emerald-700" />
              <CardTitle className="mt-3">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

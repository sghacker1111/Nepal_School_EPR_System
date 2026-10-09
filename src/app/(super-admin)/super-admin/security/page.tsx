import { Database, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlatformSecurityPage() {
  const controls = [
    {
      icon: KeyRound,
      title: "Argon2id password hashing",
      body: "Passwords are one-way hashed with 64 MiB memory cost, three iterations, and no plaintext password column.",
    },
    {
      icon: LockKeyhole,
      title: "Server-side sessions",
      body: "Opaque tokens live in Secure HttpOnly cookies; only SHA-256 token hashes are stored in PostgreSQL.",
    },
    {
      icon: Database,
      title: "Tenant ownership",
      body: "School-owned queries derive schoolId from the verified session. Browser-supplied tenant authority is never accepted.",
    },
    {
      icon: ShieldCheck,
      title: "Defense in depth",
      body: "Proxy performs an early cookie gate while every protected layout, service, and mutation performs server authorization.",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Platform protection"
        title="Security controls"
        description="Operational visibility into the controls enforced by this Phase 1 foundation."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {controls.map((control) => (
          <Card key={control.title}>
            <CardHeader>
              <span className="mb-2 grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <control.icon />
              </span>
              <CardTitle>{control.title}</CardTitle>
              <CardDescription>{control.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Enabled
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

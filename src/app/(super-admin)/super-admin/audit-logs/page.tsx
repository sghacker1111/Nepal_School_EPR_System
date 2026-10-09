import { AuditTable } from "@/components/audit/audit-table";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export default async function PlatformAuditLogsPage() {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { firstName: true, lastName: true } },
      school: { select: { name: true, code: true } },
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="Security evidence"
        title="Platform audit logs"
        description="The 200 most recent administrative and authentication events. Passwords and secrets are never recorded."
      />
      <AuditTable rows={rows} showSchool />
    </>
  );
}

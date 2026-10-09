import { AuditTable } from "@/components/audit/audit-table";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";

export default async function SchoolAuditLogsPage() {
  const session = await requireSchoolPage("audit.view");
  const rows = await prisma.auditLog.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  return (
    <>
      <PageHeader
        eyebrow={session.school.code}
        title="Audit history"
        description="The 200 most recent security-sensitive events for this school only."
      />
      <AuditTable rows={rows} />
    </>
  );
}

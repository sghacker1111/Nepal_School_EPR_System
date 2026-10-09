import { PageHeader } from "@/components/layout/page-header";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { ImportWorkflow } from "@/modules/students/components/import-workflow";
export default async function StudentImportPage() {
  await requireSchoolPage("student.import");
  return (
    <>
      <PageHeader
        eyebrow="Student management"
        title="Import students from Excel"
        description="Validate first, review duplicate and field errors, then explicitly confirm the tenant-scoped transaction."
      />
      <ImportWorkflow />
    </>
  );
}

import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { SchoolSettingsForm } from "@/modules/schools/components/school-settings-form";

export default async function SchoolSettingsPage() {
  const session = await requireSchoolPage("school.settings.manage");
  const settings = await prisma.schoolSetting.findUnique({
    where: { schoolId: session.schoolId },
  });
  if (!settings) notFound();
  return (
    <>
      <PageHeader
        eyebrow={session.school.code}
        title="School settings"
        description="Configure regional defaults and module availability for this school only."
      />
      <SchoolSettingsForm settings={settings} />
    </>
  );
}

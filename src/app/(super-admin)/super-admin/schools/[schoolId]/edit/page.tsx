import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { EditSchoolForm } from "@/modules/schools/components/edit-school-form";

export default async function EditSchoolPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) notFound();
  return (
    <>
      <PageHeader
        eyebrow={school.code}
        title="Edit school profile"
        description="Update official tenant information. Every saved change is audited."
        actions={
          <Button asChild variant="outline">
            <Link href={`/super-admin/schools/${school.id}`}>
              <ArrowLeft />
              School details
            </Link>
          </Button>
        }
      />
      <EditSchoolForm school={school} />
    </>
  );
}

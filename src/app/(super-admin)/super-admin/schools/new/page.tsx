import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CreateSchoolForm } from "@/modules/schools/components/create-school-form";

export default function CreateSchoolPage() {
  return (
    <>
      <PageHeader
        eyebrow="New tenant"
        title="Create a school"
        description="Create the school, its secure settings, RBAC role, and first School Administrator in one database transaction."
        actions={
          <Button asChild variant="outline">
            <Link href="/super-admin/schools">
              <ArrowLeft />
              Back to schools
            </Link>
          </Button>
        }
      />
      <CreateSchoolForm />
    </>
  );
}

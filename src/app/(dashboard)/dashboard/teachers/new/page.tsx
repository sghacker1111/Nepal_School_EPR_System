import { PageHeader } from "@/components/layout/page-header";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { TeacherForm } from "@/modules/teachers/components/teacher-form";
export default async function NewTeacherPage() {
  await requireSchoolPage("teacher.create");
  return (
    <>
      <PageHeader
        eyebrow="Teacher management"
        title="Add teacher"
        description="Create a professional profile and optionally issue secure first-login credentials."
      />
      <TeacherForm />
    </>
  );
}

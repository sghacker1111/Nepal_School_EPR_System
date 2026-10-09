import { Archive, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { archiveTeacherAction } from "@/modules/teachers/actions";
export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const session = await requireSchoolPage("teacher.view");
  const { teacherId } = await params;
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId: session.schoolId },
    include: {
      user: true,
      assignments: {
        include: {
          academicYear: true,
          class: true,
          section: true,
          subject: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!teacher) notFound();
  const canEdit = session.permissions.has("teacher.edit");
  const canArchive = session.permissions.has("teacher.archive");
  return (
    <>
      <PageHeader
        eyebrow={teacher.teacherCode}
        title={`${teacher.firstName} ${teacher.middleName ?? ""} ${teacher.lastName}`}
        description={`${teacher.qualification ?? "Teacher"} · ${teacher.mobile}`}
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className={canEdit ? undefined : "hidden"}
            >
              <Link href={`/dashboard/teachers/${teacher.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            {teacher.status !== "ARCHIVED" && canArchive && (
              <form action={archiveTeacherAction}>
                <input type="hidden" name="teacherId" value={teacher.id} />
                <Button type="submit" variant="destructive">
                  <Archive />
                  Archive teacher
                </Button>
              </form>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Status:</strong>{" "}
              <Badge variant="outline">{teacher.status}</Badge>
            </p>
            <p>
              <strong>Email:</strong> {teacher.email ?? "—"}
            </p>
            <p>
              <strong>Address:</strong> {teacher.address ?? "—"}
            </p>
            <p>
              <strong>Specialization:</strong> {teacher.specialization ?? "—"}
            </p>
            <p>
              <strong>Joined:</strong>{" "}
              {teacher.joiningDate.toLocaleDateString()}
            </p>
            <p>
              <strong>Login:</strong>{" "}
              {teacher.user ? `@${teacher.user.username}` : "Not created"}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teaching assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teacher.assignments.length ? (
              <div className="divide-y">
                {teacher.assignments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-sm"
                  >
                    <strong>{item.academicYear.name}</strong>
                    <span>
                      {item.class.name} {item.section?.name ?? "All"}
                    </span>
                    <span>{item.subject.name}</span>
                    {item.isClassTeacher && (
                      <Badge variant="success">Class teacher</Badge>
                    )}
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No assignments yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

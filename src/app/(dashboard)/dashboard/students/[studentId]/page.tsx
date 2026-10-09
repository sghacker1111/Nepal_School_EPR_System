import { OptionalSubjectsForm } from "@/modules/students/components/optional-subjects-form";
import { academicAccess } from "@/modules/auth/academic-access";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { EnrollmentForm } from "@/modules/students/components/enrollment-form";
import { StudentStatusActions } from "@/modules/students/components/student-actions";
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await requireSchoolPage("student.view");
  const access = await academicAccess(session);
  const { studentId } = await params;
  const [student, years, classes, sections] = await Promise.all([
    prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: session.schoolId,
        ...access.studentWhere,
      },
      include: {
        user: {
          select: { username: true, status: true, mustChangePassword: true },
        },
        guardians: { include: { guardian: true } },
        enrollments: {
          where: access.enrollmentWhere,
          include: { academicYear: true, class: true, section: true },
          orderBy: { academicYear: { startDate: "desc" } },
        },
      },
    }),
    prisma.academicYear.findMany({
      where: {
        schoolId: session.schoolId,
        status: { in: ["ACTIVE", "PLANNED"] },
      },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.section.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      select: { id: true, name: true, classId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!student) notFound();
  const active = student.enrollments.find((v) => v.status === "ACTIVE");
  const optionalSubjects = await prisma.classSubject.findMany({
    where: { schoolId: session.schoolId, isOptional: true, status: "ACTIVE" },
    select: {
      academicYearId: true,
      classId: true,
      subjectId: true,
      subject: { select: { name: true } },
    },
  });
  const canEdit = session.permissions.has("student.edit");
  const canArchive = session.permissions.has("student.archive");
  const canRestore = session.permissions.has("student.restore");
  const canEnroll = session.permissions.has("student.enroll");
  const formattedPermanent = [
    student.permanentTole,
    student.permanentLocalLevel,
    student.permanentDistrict,
    student.permanentProvince,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <>
      <PageHeader
        eyebrow={`${student.studentId} · Admission ${student.admissionNumber}`}
        title={`${student.firstName} ${student.middleName ?? ""} ${student.lastName}`}
        description={
          active
            ? `${active.class.name} ${active.section.name} · Roll ${active.rollNumber ?? "—"} · ${active.academicYear.name}`
            : "No active class enrollment"
        }
        actions={
          <Button
            asChild
            variant="outline"
            className={canEdit ? undefined : "hidden"}
          >
            <Link href={`/dashboard/students/${student.id}/edit`}>
              <Pencil />
              Edit profile
            </Link>
          </Button>
        }
      />
      <div className="mb-6">
        <StudentStatusActions
          studentId={student.id}
          status={student.status}
          hasActiveEnrollment={Boolean(active)}
          canArchive={canArchive}
          canRestore={canRestore}
          canEnroll={canEnroll}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Student profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Status:</strong>{" "}
              <Badge
                variant={student.status === "ACTIVE" ? "success" : "outline"}
              >
                {student.status}
              </Badge>
            </p>
            <p>
              <strong>IEMIS ID:</strong> {student.iemisId ?? "—"}
            </p>
            <p>
              <strong>Name in Nepali:</strong> {student.nameInNepali ?? "—"}
            </p>
            <p>
              <strong>Date of birth:</strong>{" "}
              {student.dateOfBirthAd?.toLocaleDateString() ??
                student.dateOfBirthBs ??
                "—"}
            </p>
            <p>
              <strong>Gender:</strong> {student.gender}
            </p>
            <p>
              <strong>Blood group:</strong> {student.bloodGroup ?? "—"}
            </p>
            <p>
              <strong>Mobile:</strong> {student.mobile ?? "—"}
            </p>
            <p>
              <strong>Portal account:</strong>{" "}
              {student.user
                ? `@${student.user.username} (${student.user.status})`
                : "Not created"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Family and guardians</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.guardians.length ? (
              student.guardians.map((link) => (
                <div key={link.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <strong>
                      {link.guardian.firstName} {link.guardian.middleName}{" "}
                      {link.guardian.lastName}
                    </strong>
                    <Badge variant="outline">{link.relationship}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {link.guardian.mobile}
                    {link.guardian.email ? ` · ${link.guardian.email}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {link.guardian.occupation ?? ""}{" "}
                    {link.isPrimary ? "· Primary guardian" : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No guardian records.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Address and wellbeing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Permanent:</strong>{" "}
              {student.permanentAddress ?? (formattedPermanent || "—")}
            </p>
            <p>
              <strong>Temporary:</strong>{" "}
              {student.temporarySameAsPermanent
                ? "Same as permanent"
                : (student.temporaryAddress ?? "—")}
            </p>
            <p>
              <strong>Nationality:</strong> {student.nationality}
            </p>
            <p>
              <strong>Scholarship:</strong>{" "}
              {student.scholarshipStatus
                ? (student.scholarshipCategory ?? "Yes")
                : "No"}
            </p>
            <p>
              <strong>Disability:</strong>{" "}
              {student.disabilityStatus
                ? (student.disabilityType ?? "Specified")
                : "No"}
            </p>
            <p>
              <strong>Allergies:</strong> {student.allergies ?? "—"}
            </p>
            <p>
              <strong>Medical notes:</strong> {student.medicalNotes ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Enrollment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {student.enrollments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Academic year</th>
                    <th className="px-5 py-3">Class</th>
                    <th className="px-5 py-3">Section</th>
                    <th className="px-5 py-3">Roll</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {student.enrollments.map((v) => (
                    <tr key={v.id}>
                      <td className="px-5 py-4 font-semibold">
                        {v.academicYear.name}
                      </td>
                      <td className="px-5 py-4">{v.class.name}</td>
                      <td className="px-5 py-4">{v.section.name}</td>
                      <td className="px-5 py-4">{v.rollNumber ?? "—"}</td>
                      <td className="px-5 py-4">
                        {v.enrollmentDate.toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline">{v.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              No enrollment history.
            </p>
          )}
        </CardContent>
      </Card>
      {canEnroll &&
        student.enrollments
          .filter(
            (enrollment) =>
              enrollment.status === "ACTIVE" &&
              optionalSubjects.some(
                (option) =>
                  option.academicYearId === enrollment.academicYearId &&
                  option.classId === enrollment.classId,
              ),
          )
          .map((enrollment) => (
            <Card key={enrollment.id} className="mt-6">
              <CardHeader>
                <CardTitle>
                  Optional subjects · {enrollment.academicYear.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OptionalSubjectsForm
                  enrollmentId={enrollment.id}
                  selected={enrollment.optionalSubjectIds}
                  options={optionalSubjects
                    .filter(
                      (option) =>
                        option.academicYearId === enrollment.academicYearId &&
                        option.classId === enrollment.classId,
                    )
                    .map((option) => ({
                      id: option.subjectId,
                      name: option.subject.name,
                    }))}
                />
              </CardContent>
            </Card>
          ))}
      {session.permissions.has("student.enroll") &&
        student.status !== "ARCHIVED" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Promote or enroll for another year</CardTitle>
            </CardHeader>
            <CardContent>
              <EnrollmentForm
                studentId={student.id}
                years={years}
                classes={classes}
                sections={sections}
              />
            </CardContent>
          </Card>
        )}
    </>
  );
}

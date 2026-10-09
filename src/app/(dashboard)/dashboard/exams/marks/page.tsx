import { academicAccess } from "@/modules/auth/academic-access";
import { MarkSheetPicker } from "@/components/forms/academic-picker";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { ExamWorkflowForm } from "@/modules/exams/components/workflow-form";
import { MarkSheetForm } from "@/modules/exams/components/mark-sheet";

export default async function MarksEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSchoolPage("exam.view");
  const query = await searchParams;
  const access = await academicAccess(session);
  const subjectScope = access.examSubjectWhere;
  const examSubjects = await prisma.examSubject.findMany({
    where: { schoolId: session.schoolId, status: "ACTIVE", ...subjectScope },
    include: {
      exam: { include: { academicYear: true } },
      class: true,
      subject: true,
    },
    orderBy: [
      { exam: { startDate: "desc" } },
      { class: { displayOrder: "asc" } },
      { subject: { name: "asc" } },
    ],
  });
  const queryClassId = examSubjects.find(
    (item) => item.id === query.examSubjectId,
  )?.classId;
  const sections = await prisma.section.findMany({
    where: {
      schoolId: session.schoolId,
      status: "ACTIVE",
      ...(queryClassId ? { classId: queryClassId } : {}),
    },
    include: { class: true },
    orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }],
  });
  const selectedSubject = examSubjects.find(
    (item) => item.id === query.examSubjectId,
  );
  const selectedSection = sections.find(
    (item) =>
      item.id === query.sectionId && item.classId === selectedSubject?.classId,
  );
  const ready =
    selectedSubject &&
    selectedSection &&
    access.allows(
      selectedSubject.exam.academicYearId,
      selectedSubject.classId,
      selectedSection.id,
      selectedSubject.subjectId,
    );
  const classSubject = ready
    ? await prisma.classSubject.findFirst({
        where: {
          schoolId: session.schoolId,
          academicYearId: selectedSubject.exam.academicYearId,
          classId: selectedSubject.classId,
          subjectId: selectedSubject.subjectId,
        },
        select: { isOptional: true },
      })
    : null;
  const [enrollments, sheet] = ready
    ? await Promise.all([
        prisma.studentEnrollment.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId: selectedSubject.exam.academicYearId,
            classId: selectedSubject.classId,
            sectionId: selectedSection.id,
            status: "ACTIVE",
            student: { status: "ACTIVE" },
            ...(classSubject?.isOptional
              ? { optionalSubjectIds: { has: selectedSubject.subjectId } }
              : {}),
          },
          include: { student: true },
          orderBy: [
            { rollNumber: "asc" },
            { student: { normalizedName: "asc" } },
          ],
        }),
        prisma.markSheet.findUnique({
          where: {
            schoolId_examSubjectId_sectionId: {
              schoolId: session.schoolId,
              examSubjectId: selectedSubject.id,
              sectionId: selectedSection.id,
            },
          },
          include: { marks: true },
        }),
      ])
    : [[], null];
  const markByStudent = new Map(
    sheet?.marks.map((mark) => [mark.studentId, mark]) ?? [],
  );
  const editable =
    session.permissions.has("marks.enter") &&
    (!sheet || sheet.status === "DRAFT");
  return (
    <>
      <PageHeader
        eyebrow="Examinations"
        title="Marks entry and verification"
        description="Keyboard-friendly component marks with assignment scope, limits, calculation, submission, verification, approval, and audited unlock."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/exams">Back to exams</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Select mark sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-3">
            <MarkSheetPicker
              subjects={examSubjects.map((item) => ({
                id: item.id,
                name: `${item.exam.name} · ${item.class.name} · ${item.subject.name}`,
                classId: item.classId,
                sectionIds: access.unrestricted
                  ? undefined
                  : sections
                      .filter((section) =>
                        access.allows(
                          item.exam.academicYearId,
                          item.classId,
                          section.id,
                          item.subjectId,
                        ),
                      )
                      .map((section) => section.id),
              }))}
              sections={sections}
              initial={query}
            />
            <Button type="submit">Load mark sheet</Button>
          </form>
        </CardContent>
      </Card>
      {ready && (
        <Card className="mt-5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>
                  {selectedSubject.exam.name} · {selectedSubject.class.name}{" "}
                  {selectedSection.name} · {selectedSubject.subject.name}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {enrollments.length} enrolled students
                </p>
              </div>
              <Badge
                variant={
                  sheet?.status === "APPROVED" || sheet?.status === "PUBLISHED"
                    ? "success"
                    : "outline"
                }
              >
                {sheet?.status ?? "NEW DRAFT"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {enrollments.length ? (
              <>
                <MarkSheetForm
                  key={`${selectedSubject.id}:${selectedSection.id}:${sheet?.updatedAt.toISOString() ?? "new"}`}
                  examSubjectId={selectedSubject.id}
                  sectionId={selectedSection.id}
                  readOnly={!editable}
                  limits={{
                    theory: Number(selectedSubject.theoryFullMarks),
                    practical: Number(selectedSubject.practicalFullMarks),
                    internal: Number(selectedSubject.internalFullMarks),
                  }}
                  rows={enrollments.map((enrollment) => {
                    const mark = markByStudent.get(enrollment.studentId);
                    return {
                      id: enrollment.studentId,
                      name: [
                        enrollment.student.firstName,
                        enrollment.student.middleName,
                        enrollment.student.lastName,
                      ]
                        .filter(Boolean)
                        .join(" "),
                      roll: enrollment.rollNumber,
                      theory: mark?.theoryMarks?.toString() ?? "",
                      practical: mark?.practicalMarks?.toString() ?? "",
                      internal: mark?.internalMarks?.toString() ?? "",
                      special: mark?.specialStatus ?? "",
                      remarks: mark?.remarks ?? "",
                    };
                  })}
                />
                {sheet && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
                    {sheet.status === "DRAFT" &&
                      session.permissions.has("marks.enter") && (
                        <ExamWorkflowForm
                          id={sheet.id}
                          intent="submit"
                          label="Submit for verification"
                        />
                      )}
                    {sheet.status === "SUBMITTED" &&
                      session.permissions.has("marks.verify") && (
                        <ExamWorkflowForm
                          id={sheet.id}
                          intent="verify"
                          label="Verify marks"
                        />
                      )}
                    {sheet.status === "VERIFIED" &&
                      session.permissions.has("marks.approve") && (
                        <ExamWorkflowForm
                          id={sheet.id}
                          intent="approve"
                          label="Approve and lock"
                        />
                      )}
                    {["APPROVED", "PUBLISHED", "LOCKED"].includes(
                      sheet.status,
                    ) &&
                      session.permissions.has("marks.unlock") && (
                        <ExamWorkflowForm
                          id={sheet.id}
                          intent="unlock"
                          label="Unlock to draft"
                        />
                      )}
                  </div>
                )}
              </>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No active students are enrolled in this section.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

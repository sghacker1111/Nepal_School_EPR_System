import { academicAccess } from "@/modules/auth/academic-access";
import { AcademicPicker } from "@/components/forms/academic-picker";
import { nepalToday, parseDateInput } from "@/lib/date-input";
import { CalendarCheck, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/forms/action-form";
import { lockAttendanceFormAction } from "@/modules/attendance/actions";
import { AttendanceSheet } from "@/modules/attendance/components/attendance-sheet";
import { ROLE_CODES } from "@/modules/auth/constants";
import { requireSchoolPage } from "@/modules/auth/page-session";

const selectClass = "h-10 w-full rounded-lg border bg-white px-3 text-sm";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSchoolPage("attendance.view");
  const access = await academicAccess(session);
  const query = await searchParams;
  const isAdmin = session.roles.has(ROLE_CODES.SCHOOL_ADMIN);
  const assignmentFilter = isAdmin
    ? {}
    : {
        teacherAssignments: {
          some: {
            teacher: { userId: session.user.id },
            status: "ACTIVE" as const,
          },
        },
      };
  const [years, classes, sections] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    }),
    prisma.class.findMany({
      where: {
        schoolId: session.schoolId,
        status: "ACTIVE",
        ...assignmentFilter,
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.section.findMany({
      where: {
        schoolId: session.schoolId,
        status: "ACTIVE",
        ...(query.classId ? { classId: query.classId } : {}),
      },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }],
    }),
  ]);
  const academicYearId =
    query.academicYearId ?? years.find((year) => year.isCurrent)?.id ?? "";
  const classId = query.classId ?? "";
  const sectionId = query.sectionId ?? "";
  const date = query.date ?? nepalToday();
  const ready = Boolean(
    academicYearId &&
    classId &&
    sectionId &&
    parseDateInput(date) &&
    access.allows(academicYearId, classId, sectionId),
  );
  const [enrollments, attendance] = ready
    ? await Promise.all([
        prisma.studentEnrollment.findMany({
          where: {
            schoolId: session.schoolId,
            academicYearId,
            classId,
            sectionId,
            status: "ACTIVE",
            student: { status: "ACTIVE" },
          },
          include: { student: true },
          orderBy: [
            { rollNumber: "asc" },
            { student: { normalizedName: "asc" } },
          ],
        }),
        prisma.attendanceSession.findUnique({
          where: {
            schoolId_academicYearId_classId_sectionId_date: {
              schoolId: session.schoolId,
              academicYearId,
              classId,
              sectionId,
              date: new Date(`${date}T00:00:00.000Z`),
            },
          },
          include: { records: true },
        }),
      ])
    : [[], null];
  const recordByStudent = new Map(
    attendance?.records.map((record) => [record.studentId, record]) ?? [],
  );
  const canManage = session.permissions.has("attendance.manage");
  const canLock =
    session.permissions.has("attendance.lock") &&
    attendance &&
    attendance.status === "SUBMITTED";
  return (
    <>
      <PageHeader
        eyebrow="Phase 4"
        title="Daily attendance"
        description="Take one tenant-safe attendance session per class, section, and date."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/attendance/reports">Attendance reports</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Select attendance group</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 md:grid-cols-5">
            <AcademicPicker
              years={years}
              classes={classes}
              sections={sections}
              groups={access.unrestricted ? undefined : access.groups}
              initial={{ academicYearId, classId, sectionId }}
            />
            <input
              type="date"
              name="date"
              defaultValue={date}
              className={selectClass}
              required
            />
            <Button type="submit">
              <CalendarCheck />
              Load students
            </Button>
          </form>
        </CardContent>
      </Card>
      {ready && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Attendance sheet</CardTitle>
              <div className="flex gap-2">
                {attendance && (
                  <Badge variant="outline">{attendance.status}</Badge>
                )}
                {canLock && (
                  <ActionForm
                    action={lockAttendanceFormAction.bind(null, attendance.id)}
                  >
                    <Button size="sm" variant="outline">
                      <LockKeyhole />
                      Lock
                    </Button>
                  </ActionForm>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {enrollments.length && canManage ? (
              <AttendanceSheet
                key={`${academicYearId}:${classId}:${sectionId}:${date}`}
                academicYearId={academicYearId}
                classId={classId}
                sectionId={sectionId}
                date={date}
                locked={attendance?.status === "LOCKED"}
                students={enrollments.map((enrollment) => {
                  const record = recordByStudent.get(enrollment.studentId);
                  return {
                    id: enrollment.studentId,
                    name: [
                      enrollment.student.firstName,
                      enrollment.student.middleName,
                      enrollment.student.lastName,
                    ]
                      .filter(Boolean)
                      .join(" "),
                    rollNumber: enrollment.rollNumber,
                    status: record?.status ?? "PRESENT",
                    remarks: record?.remarks ?? "",
                  };
                })}
              />
            ) : (
              <div className="py-12 text-center">
                <CalendarCheck className="mx-auto size-9 text-slate-300" />
                <p className="mt-3 font-semibold">
                  {enrollments.length
                    ? "Attendance is read-only for your role."
                    : "No active students in this class."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

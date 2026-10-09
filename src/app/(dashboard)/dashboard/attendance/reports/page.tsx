import { academicAccess } from "@/modules/auth/academic-access";
import { parseDateInput } from "@/lib/date-input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getAttendanceReport } from "@/modules/attendance/service";
import { requireSchoolPage } from "@/modules/auth/page-session";

const inputClass = "h-10 w-full rounded-lg border bg-white px-3 text-sm";

export default async function AttendanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSchoolPage("attendance.report");
  const access = await academicAccess(session);
  const query = await searchParams;
  const [years, classes, sections] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { startDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.section.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }],
    }),
  ]);
  const rows = await getAttendanceReport({
    schoolId: session.schoolId,
    scope: access.enrollmentWhere,
    academicYearId: query.academicYearId || undefined,
    classId: query.classId || undefined,
    sectionId: query.sectionId || undefined,
    from: parseDateInput(query.from),
    to: parseDateInput(query.to),
  });
  const totals = rows.reduce(
    (sum, row) => ({
      working: sum.working + row.workingDays,
      present: sum.present + row.present,
      absent: sum.absent + row.absent,
      late: sum.late + row.late,
      leave: sum.leave + row.leave,
    }),
    { working: 0, present: 0, absent: 0, late: 0, leave: 0 },
  );
  return (
    <>
      <PageHeader
        eyebrow="Attendance"
        title="Attendance reports"
        description="Daily, monthly, student, class, absence, and date-range totals from submitted sessions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
          >
            <select
              name="academicYearId"
              defaultValue={query.academicYearId ?? ""}
              className={inputClass}
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            <select
              name="classId"
              defaultValue={query.classId ?? ""}
              className={inputClass}
            >
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              name="sectionId"
              defaultValue={query.sectionId ?? ""}
              className={inputClass}
            >
              <option value="">All sections</option>
              {sections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class.name} · {item.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              defaultValue={query.from ?? ""}
              className={inputClass}
              aria-label="From date"
            />
            <input
              type="date"
              name="to"
              defaultValue={query.to ?? ""}
              className={inputClass}
              aria-label="To date"
            />
            <Button type="submit">Generate report</Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries({
          "Working records": totals.working,
          Present: totals.present,
          Absent: totals.absent,
          Late: totals.late,
          Leave: totals.leave,
        }).map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Student attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Roll</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Working</th>
                    <th className="px-4 py-3">Present</th>
                    <th className="px-4 py-3">Absent</th>
                    <th className="px-4 py-3">Late</th>
                    <th className="px-4 py-3">Leave</th>
                    <th className="px-4 py-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.studentId}>
                      <td className="px-4 py-3">{row.rollNumber ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3">{row.workingDays}</td>
                      <td className="px-4 py-3">{row.present}</td>
                      <td className="px-4 py-3 text-red-700">{row.absent}</td>
                      <td className="px-4 py-3">{row.late}</td>
                      <td className="px-4 py-3">{row.leave}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={row.percentage >= 75 ? "success" : "warning"}
                        >
                          {row.percentage}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-14 text-center text-sm text-slate-500">
              No submitted attendance matches these filters.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

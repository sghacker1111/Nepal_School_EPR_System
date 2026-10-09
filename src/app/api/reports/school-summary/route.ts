import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/modules/auth/session";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
  row.alignment = { vertical: "middle" };
}

export async function GET() {
  const session = await requireSchoolContext("report.view");
  const [students, attendance, results] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: session.schoolId }, include: { enrollments: { include: { academicYear: true, class: true, section: true }, orderBy: { academicYear: { startDate: "desc" } }, take: 1 }, guardians: { where: { isPrimary: true }, include: { guardian: true }, take: 1 } }, orderBy: { normalizedName: "asc" } }),
    prisma.attendanceSession.findMany({ where: { schoolId: session.schoolId, status: { in: ["SUBMITTED", "LOCKED"] } }, include: { academicYear: true, class: true, section: true, records: true }, orderBy: { date: "desc" }, take: 500 }),
    prisma.studentResult.findMany({ where: { schoolId: session.schoolId }, include: { exam: true, student: true, enrollment: { include: { academicYear: true, class: true, section: true } } }, orderBy: { calculatedAt: "desc" }, take: 5000 }),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nepal School ERP";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Summary");
  summary.addRows([["School", session.school.name], ["School code", session.school.code], ["Generated", new Date().toISOString()], ["Students", students.length], ["Attendance sessions", attendance.length], ["Results", results.length]]);
  summary.getColumn(1).font = { bold: true };
  summary.columns = [{ width: 24 }, { width: 48 }];

  const studentSheet = workbook.addWorksheet("Students");
  studentSheet.columns = [
    { header: "Student ID", key: "studentId", width: 18 }, { header: "Admission No.", key: "admission", width: 18 }, { header: "Student", key: "name", width: 30 }, { header: "IEMIS", key: "iemis", width: 18 }, { header: "Status", key: "status", width: 14 }, { header: "Academic Year", key: "year", width: 16 }, { header: "Class", key: "class", width: 14 }, { header: "Section", key: "section", width: 14 }, { header: "Roll", key: "roll", width: 12 }, { header: "Guardian", key: "guardian", width: 28 }, { header: "Guardian Mobile", key: "mobile", width: 18 },
  ];
  styleHeader(studentSheet.getRow(1));
  students.forEach((student) => { const enrollment = student.enrollments[0]; const guardian = student.guardians[0]?.guardian; studentSheet.addRow({ studentId: student.studentId, admission: student.admissionNumber, name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "), iemis: student.iemisId ?? "", status: student.status, year: enrollment?.academicYear.name ?? "", class: enrollment?.class.name ?? "", section: enrollment?.section.name ?? "", roll: enrollment?.rollNumber ?? "", guardian: guardian ? [guardian.firstName, guardian.middleName, guardian.lastName].filter(Boolean).join(" ") : "", mobile: guardian?.mobile ?? "" }); });
  studentSheet.autoFilter = { from: "A1", to: "K1" }; studentSheet.views = [{ state: "frozen", ySplit: 1 }];

  const attendanceSheet = workbook.addWorksheet("Attendance");
  attendanceSheet.columns = [{ header: "Date", key: "date", width: 15 }, { header: "Academic Year", key: "year", width: 16 }, { header: "Class", key: "class", width: 14 }, { header: "Section", key: "section", width: 14 }, { header: "Status", key: "status", width: 14 }, { header: "Present", key: "present", width: 12 }, { header: "Absent", key: "absent", width: 12 }, { header: "Late", key: "late", width: 12 }, { header: "Leave", key: "leave", width: 12 }];
  styleHeader(attendanceSheet.getRow(1));
  attendance.forEach((item) => { const count = (status: string) => item.records.filter((record) => record.status === status).length; attendanceSheet.addRow({ date: item.date.toISOString().slice(0, 10), year: item.academicYear.name, class: item.class.name, section: item.section.name, status: item.status, present: count("PRESENT"), absent: count("ABSENT"), late: count("LATE"), leave: count("LEAVE") }); });
  attendanceSheet.autoFilter = { from: "A1", to: "I1" }; attendanceSheet.views = [{ state: "frozen", ySplit: 1 }];

  const resultSheet = workbook.addWorksheet("Results");
  resultSheet.columns = [{ header: "Exam", key: "exam", width: 28 }, { header: "Academic Year", key: "year", width: 16 }, { header: "Student ID", key: "studentId", width: 18 }, { header: "Student", key: "student", width: 30 }, { header: "Class", key: "class", width: 14 }, { header: "Section", key: "section", width: 14 }, { header: "Marks", key: "marks", width: 14 }, { header: "Full Marks", key: "full", width: 14 }, { header: "Percentage", key: "percentage", width: 14 }, { header: "GPA", key: "gpa", width: 10 }, { header: "Grade", key: "grade", width: 10 }, { header: "Outcome", key: "outcome", width: 14 }, { header: "Publication", key: "status", width: 14 }];
  styleHeader(resultSheet.getRow(1));
  results.forEach((result) => resultSheet.addRow({ exam: result.exam.name, year: result.enrollment.academicYear.name, studentId: result.student.studentId, student: [result.student.firstName, result.student.middleName, result.student.lastName].filter(Boolean).join(" "), class: result.enrollment.class.name, section: result.enrollment.section.name, marks: Number(result.totalObtainedMarks), full: Number(result.totalFullMarks), percentage: Number(result.percentage), gpa: Number(result.gpa), grade: result.finalGrade, outcome: result.outcome, status: result.resultStatus }));
  resultSheet.autoFilter = { from: "A1", to: "M1" }; resultSheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${session.school.code}-school-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}

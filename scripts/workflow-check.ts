import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/modules/auth/password";
import { createSchoolWithAdministrator } from "../src/modules/schools/service";
import { createSchoolSchema } from "../src/modules/schools/validation";
import {
  saveAcademicYear,
  saveClass,
  saveSection,
  saveSubject,
  saveClassSubject,
} from "../src/modules/academic/service";
import {
  saveTeacher,
  saveTeacherAssignment,
  archiveTeacher,
} from "../src/modules/teachers/service";
import { teacherSchema } from "../src/modules/teachers/validation";
import {
  saveStudent,
  saveEnrollment,
  saveOptionalSubjects,
} from "../src/modules/students/service";
import { studentSchema } from "../src/modules/students/validation";
import {
  saveAttendanceSheet,
  lockAttendanceSession,
} from "../src/modules/attendance/service";
import {
  saveExamType,
  saveGradingScheme,
  saveExam,
  saveExamSubject,
  saveMarkSheet,
  changeMarkSheetStatus,
  publishExamResults,
  unlockMarkSheet,
} from "../src/modules/exams/service";
import { CDC_GRADE_RULES } from "../src/modules/academic/curriculum";
import { saveManagedUser } from "../src/modules/users/service";
import {
  saveChapter,
  saveQuestion,
  approveQuestion,
  saveSpecificationGrid,
  generateQuestionPapers,
} from "../src/modules/questions/service";
import { questionSchema } from "../src/modules/questions/validation";
import { academicAccess } from "../src/modules/auth/academic-access";

if (!process.env.DATABASE_URL?.includes(":55433/"))
  throw new Error("Refusing to run fixtures on a non-test database.");
const password = "Workflow@Test2026";
let checks = 0;
async function rejects(work: Promise<unknown>, match: RegExp) {
  await assert.rejects(work, match);
  checks++;
}
const owner = await prisma.user.create({
  data: {
    identityKey: "test:owner",
    username: "owner",
    normalizedUsername: "owner",
    firstName: "Test",
    lastName: "Owner",
    passwordHash: await hashPassword(password),
    mustChangePassword: false,
  },
});
const schoolInput = createSchoolSchema.parse({
  name: "Workflow Test School",
  code: "TESTERP",
  type: "COMMUNITY",
  level: "Secondary",
  province: "Bagmati",
  district: "Kathmandu",
  localLevel: "Kathmandu",
  ward: 1,
  address: "Test address Nepal",
  mobile: "9800000000",
  email: "school@example.test",
  principalName: "Test Principal",
  principalPhone: "9800000001",
  calendarPreference: "BOTH",
  defaultLanguage: "en",
  status: "ACTIVE",
  attendanceEnabled: true,
  examinationEnabled: true,
  questionBankEnabled: true,
  adminFullName: "School Admin",
  adminUsername: "admin",
  adminEmail: "admin@example.test",
  adminMobile: "9800000002",
  temporaryPassword: password,
  confirmPassword: password,
});
const created = await createSchoolWithAdministrator(schoolInput, owner.id, {});
const admin = await prisma.user.findFirstOrThrow({
  where: { schoolId: created.schoolId, normalizedUsername: "admin" },
});
await prisma.user.update({
  where: { id: admin.id },
  data: { mustChangePassword: false },
});
const actor = {
  schoolId: created.schoolId,
  userId: admin.id,
  isSchoolAdmin: true,
  metadata: {},
};
const year = await saveAcademicYear(
  {
    name: "2083/84",
    startDate: new Date("2026-04-14"),
    endDate: new Date("2027-04-13"),
    isCurrent: true,
    status: "ACTIVE",
  },
  actor,
);
const schoolClass = await saveClass(
  { name: "Class 10", numericLevel: 10, displayOrder: 10, status: "ACTIVE" },
  actor,
);
const section = await saveSection(
  { classId: schoolClass.id, name: "A", capacity: 40, status: "ACTIVE" },
  actor,
);
const sectionB = await saveSection(
  { classId: schoolClass.id, name: "B", status: "ACTIVE" },
  actor,
);
const subject = await saveSubject(
  {
    name: "English",
    code: "ENG",
    subjectType: "MIXED",
    theoryFullMarks: 75,
    practicalFullMarks: 0,
    internalFullMarks: 25,
    status: "ACTIVE",
  },
  actor,
);
const teacher = await saveTeacher(
  teacherSchema.parse({
    teacherCode: "T001",
    firstName: "Test",
    lastName: "Teacher",
    gender: "NOT_SPECIFIED",
    mobile: "9800000003",
    joiningDate: "2026-04-14",
    employmentType: "PERMANENT",
    status: "ACTIVE",
    createLogin: true,
    username: "teacher",
    temporaryPassword: password,
    confirmPassword: password,
  }),
  actor,
);
const assignment = {
  academicYearId: year.id,
  classId: schoolClass.id,
  subjectId: subject.id,
  teacherId: teacher.id,
  sectionId: section.id,
  isClassTeacher: true,
  status: "ACTIVE" as const,
};
await rejects(saveTeacherAssignment(assignment, actor), /Class subjects first/);
await saveClassSubject(
  {
    academicYearId: year.id,
    classId: schoolClass.id,
    subjectId: subject.id,
    fullMarks: 100,
    theoryMarks: 75,
    practicalMarks: 0,
    internalMarks: 25,
    creditHour: 5,
    displayOrder: 1,
    status: "ACTIVE",
  },
  actor,
);
await saveTeacherAssignment(assignment, actor);
assert.equal(
  await prisma.userRole.count({
    where: { userId: teacher.userId!, role: { code: "CLASS_TEACHER" } },
  }),
  1,
);
checks++;

const studentInput = studentSchema.parse({
  studentId: "S001",
  admissionNumber: "ADM001",
  firstName: "Test",
  lastName: "Student",
  gender: "NOT_SPECIFIED",
  nationality: "Nepali",
  dateOfBirthAd: "2011-01-01",
  admissionDate: "2026-04-14",
  academicYearId: year.id,
  classId: schoolClass.id,
  sectionId: section.id,
  enrollmentDate: "2026-04-14",
  rollNumber: "1",
  guardianName: "Test Guardian",
  guardianMobile: "9800000004",
  guardianRelationship: "GUARDIAN",
  temporarySameAsPermanent: true,
  scholarshipStatus: false,
  transportationRequired: false,
  hostelStatus: false,
  disabilityStatus: false,
  duplicateOverride: false,
  createLogin: true,
  username: "student",
  temporaryPassword: password,
  confirmPassword: password,
  status: "ACTIVE",
});
const student = await saveStudent(studentInput, actor);
const student2 = await prisma.student.create({
  data: {
    schoolId: actor.schoolId,
    studentId: "S002",
    admissionNumber: "ADM002",
    firstName: "Second",
    lastName: "Student",
    normalizedName: "second student",
    gender: "NOT_SPECIFIED",
    admissionDate: new Date("2026-04-14"),
    createdById: admin.id,
  },
});
await saveEnrollment(
  {
    studentId: student2.id,
    academicYearId: year.id,
    classId: schoolClass.id,
    sectionId: section.id,
    enrollmentDate: new Date("2026-04-14"),
    rollNumber: "2",
    status: "ACTIVE",
  },
  actor,
);
const elective = await saveSubject(
  {
    name: "Computer Science",
    code: "CS",
    subjectType: "THEORY",
    theoryFullMarks: 100,
    practicalFullMarks: 0,
    internalFullMarks: 0,
    status: "ACTIVE",
  },
  actor,
);
await saveClassSubject(
  {
    academicYearId: year.id,
    classId: schoolClass.id,
    subjectId: elective.id,
    fullMarks: 100,
    theoryMarks: 100,
    practicalMarks: 0,
    internalMarks: 0,
    creditHour: 4,
    displayOrder: 2,
    status: "ACTIVE",
    isOptional: true,
  },
  actor,
);
const studentEdit = { ...studentInput, id: student.id, createLogin: false };
await saveStudent(
  {
    ...studentEdit,
    fatherName: "Test Father",
    fatherMobile: "9800000091",
    fatherOccupation: "Teacher",
    fatherEducation: "Bachelor",
    guardianName: "Test Father",
    guardianMobile: "9800000091",
    guardianRelationship: "FATHER",
  },
  actor,
);
const parentLinks = await prisma.studentGuardian.findMany({
  where: { studentId: student.id },
  include: { guardian: true },
});
assert.equal(
  parentLinks.length,
  1,
  "Changing the primary guardian must unlink the obsolete contact",
);
assert.equal(
  parentLinks[0].guardian.education,
  "Bachelor",
  "Primary parent details must not be erased",
);
assert.equal(parentLinks[0].isPrimary, true);
checks++;
await prisma.studentGuardian.create({
  data: {
    schoolId: actor.schoolId,
    studentId: student2.id,
    guardianId: parentLinks[0].guardianId,
    relationship: "FATHER",
    isPrimary: true,
  },
});
await saveStudent(
  {
    ...studentEdit,
    fatherName: "Updated Father",
    fatherMobile: "9800000092",
    fatherOccupation: "Farmer",
    fatherEducation: "Bachelor",
    guardianName: "",
    guardianMobile: "",
    guardianRelationship: "FATHER",
  },
  actor,
);
assert.equal(
  (
    await prisma.guardian.findUniqueOrThrow({
      where: { id: parentLinks[0].guardianId },
    })
  ).mobile,
  "9800000091",
  "A student edit must not silently update a shared guardian on another profile",
);
checks++;
await saveStudent(studentEdit, actor);
assert.equal(
  await prisma.studentGuardian.count({ where: { studentId: student.id } }),
  1,
  "Cleared parent fields must not leave stale linked parents",
);
checks++;
const enrollment = await prisma.studentEnrollment.findFirstOrThrow({
  where: { studentId: student.id, academicYearId: year.id },
});
await rejects(
  saveOptionalSubjects(enrollment.id, [subject.id], actor),
  /optional subject/,
);
await saveOptionalSubjects(enrollment.id, [elective.id], actor);
assert.deepEqual(
  (
    await prisma.studentEnrollment.findUniqueOrThrow({
      where: { id: enrollment.id },
    })
  ).optionalSubjectIds,
  [elective.id],
);
checks++;
const attendanceInput = {
  academicYearId: year.id,
  classId: schoolClass.id,
  sectionId: section.id,
  date: new Date("2026-10-08"),
  submit: false,
  records: [
    { studentId: student.id, status: "ABSENT" as const },
    { studentId: student2.id, status: "PRESENT" as const },
  ],
};
await rejects(
  saveAttendanceSheet(
    { ...attendanceInput, records: attendanceInput.records.slice(0, 1) },
    actor,
  ),
  /Every attendance row/,
);
const attendance = await saveAttendanceSheet(attendanceInput, actor);
await rejects(lockAttendanceSession(attendance.id, actor), /Submit a complete/);
await saveAttendanceSheet({ ...attendanceInput, submit: true }, actor);
assert.equal(
  await prisma.notification.count({
    where: { userId: student.userId!, type: "ATTENDANCE" },
  }),
  1,
);
checks++;
// A competing write commits after the preflight read, before the lock transaction.
const attendanceTransactionOriginal = prisma.$transaction.bind(prisma);
prisma.$transaction = (async (
  work: Parameters<typeof attendanceTransactionOriginal>[0],
  options?: Parameters<typeof attendanceTransactionOriginal>[1],
) => {
  prisma.$transaction = attendanceTransactionOriginal;
  await prisma.attendanceSession.update({
    where: { id: attendance.id },
    data: { status: "DRAFT" },
  });
  return attendanceTransactionOriginal(work, options);
}) as typeof prisma.$transaction;
await rejects(lockAttendanceSession(attendance.id, actor), /Submit a complete/);
prisma.$transaction = attendanceTransactionOriginal;
await saveAttendanceSheet({ ...attendanceInput, submit: true }, actor);
await lockAttendanceSession(attendance.id, actor);
await rejects(
  saveAttendanceSheet({ ...attendanceInput, submit: true }, actor),
  /locked/,
);
await rejects(
  saveEnrollment(
    {
      studentId: student.id,
      academicYearId: year.id,
      classId: schoolClass.id,
      sectionId: sectionB.id,
      enrollmentDate: new Date("2026-04-14"),
      status: "ACTIVE",
    },
    actor,
  ),
  /attendance or marks/,
);
const examType = await saveExamType(
  { code: "FINAL", name: "Final", weight: 100, status: "ACTIVE" },
  actor,
);
const grading = await saveGradingScheme(
  {
    name: "CDC reference",
    code: "CDC",
    isDefault: true,
    rules: CDC_GRADE_RULES,
  },
  actor,
);
const exam = await saveExam(
  {
    name: "Final test",
    academicYearId: year.id,
    examTypeId: examType.id,
    gradingSchemeId: grading.id,
    startDate: new Date("2026-10-08"),
    endDate: new Date("2026-10-20"),
    status: "MARK_ENTRY",
  },
  actor,
);
const configuration = {
  examId: exam.id,
  classId: schoolClass.id,
  subjectId: subject.id,
  theoryFullMarks: 75,
  practicalFullMarks: 0,
  internalFullMarks: 25,
  theoryPassMarks: 26.25,
  internalPassMarks: 10,
  creditHour: 5,
};
const examSubject = await saveExamSubject(configuration, actor);
const electiveExam = await saveExamSubject(
  {
    examId: exam.id,
    classId: schoolClass.id,
    subjectId: elective.id,
    theoryFullMarks: 100,
    practicalFullMarks: 0,
    internalFullMarks: 0,
    creditHour: 4,
  },
  actor,
);
await rejects(
  saveMarkSheet(
    {
      examSubjectId: electiveExam.id,
      sectionId: section.id,
      rows: [
        { studentId: student.id, theoryMarks: 90 },
        { studentId: student2.id, theoryMarks: 90 },
      ],
    },
    actor,
  ),
  /actively enrolled/,
);
const electiveSheet = await saveMarkSheet(
  {
    examSubjectId: electiveExam.id,
    sectionId: section.id,
    rows: [{ studentId: student.id, theoryMarks: 90 }],
  },
  actor,
);
for (const status of ["SUBMITTED", "VERIFIED", "APPROVED"] as const)
  await changeMarkSheetStatus(electiveSheet.id, status, actor);
await rejects(
  saveOptionalSubjects(enrollment.id, [], actor),
  /after marks exist/,
);
const markInput = {
  examSubjectId: examSubject.id,
  sectionId: section.id,
  rows: [
    { studentId: student.id, theoryMarks: 65, internalMarks: 22 },
    { studentId: student2.id, specialStatus: "WITHHELD" as const },
  ],
};
await rejects(publishExamResults(exam.id, actor), /incomplete/);
await rejects(
  saveMarkSheet({ ...markInput, rows: markInput.rows.slice(0, 1) }, actor),
  /every actively enrolled/,
);
const sheet = await saveMarkSheet(markInput, actor);
await rejects(saveExamSubject(configuration, actor), /configuration is frozen/);
await rejects(
  saveGradingScheme(
    { name: "Changed", code: "CDC", isDefault: true, rules: CDC_GRADE_RULES },
    actor,
  ),
  /already used/,
);
await changeMarkSheetStatus(sheet.id, "SUBMITTED", actor);
await rejects(saveMarkSheet(markInput, actor), /Unlock/);
await changeMarkSheetStatus(sheet.id, "VERIFIED", actor);
await changeMarkSheetStatus(sheet.id, "APPROVED", actor);
assert.equal(await publishExamResults(exam.id, actor), 1);
checks++;
assert.equal(
  (
    await prisma.studentResult.findFirstOrThrow({
      where: { studentId: student2.id },
    })
  ).resultStatus,
  "WITHHELD",
);
checks++;
await unlockMarkSheet(sheet.id, "Correction requested by administrator", actor);
assert.equal(
  await prisma.studentResult.count({
    where: { examId: exam.id, resultStatus: "PUBLISHED" },
  }),
  0,
);
checks++;
await saveMarkSheet(markInput, actor);
for (const status of ["SUBMITTED", "VERIFIED", "APPROVED"] as const)
  await changeMarkSheetStatus(sheet.id, status, actor);
await publishExamResults(exam.id, actor);
const staff = await saveManagedUser(
  {
    firstName: "Exam",
    lastName: "Coordinator",
    username: "coordinator",
    role: "EXAM_COORDINATOR",
    status: "ACTIVE",
    temporaryPassword: password,
  },
  actor,
);
await saveManagedUser(
  {
    id: staff.id,
    firstName: "Exam",
    lastName: "Coordinator",
    username: "coordinator",
    role: "EXAM_COORDINATOR",
    status: "SUSPENDED",
  },
  actor,
);
assert.equal(
  (await prisma.user.findUniqueOrThrow({ where: { id: staff.id } }))
    .sessionVersion,
  2,
);
checks++;
await rejects(
  saveManagedUser(
    {
      id: admin.id,
      firstName: "School",
      lastName: "Admin",
      username: "admin",
      role: "SCHOOL_ADMIN",
      status: "INACTIVE",
    },
    actor,
  ),
  /Another administrator/,
);
const foreign = await createSchoolWithAdministrator(
  { ...schoolInput, code: "OTHERSCHOOL", name: "Other Test School" },
  owner.id,
  {},
);
await rejects(
  saveSection(
    { classId: schoolClass.id, name: "Foreign", status: "ACTIVE" },
    { ...actor, schoolId: foreign.schoolId },
  ),
  /belonging to your school/,
);
const chapter = await saveChapter(
  {
    classId: schoolClass.id,
    subjectId: subject.id,
    name: "Reading",
    displayOrder: 1,
    status: "ACTIVE",
  },
  actor,
);
const questionInput = questionSchema.parse({
  classId: schoolClass.id,
  subjectId: subject.id,
  chapterId: chapter.id,
  questionType: "SHORT",
  questionText: "Read and answer this example question.",
  marks: 2,
  difficulty: "EASY",
  cognitiveLevel: "KNOWLEDGE",
  options: [],
});
const question = await saveQuestion(questionInput, actor);
await rejects(
  approveQuestion(question.id, actor),
  /answer or marking guidance/,
);
await saveQuestion(
  { ...questionInput, id: question.id, answer: "Example marking guidance." },
  actor,
);
await approveQuestion(question.id, actor);
await rejects(
  saveQuestion(
    { ...questionInput, id: question.id, answer: "Changed answer." },
    actor,
  ),
  /Only draft/,
);
const secondQuestion = await saveQuestion(
  {
    ...questionInput,
    questionText: "A second question to avoid duplicate selection.",
    difficulty: "HARD",
    answer: "Second answer.",
  },
  actor,
);
await approveQuestion(secondQuestion.id, actor);
const grid = await saveSpecificationGrid(
  {
    academicYearId: year.id,
    classId: schoolClass.id,
    subjectId: subject.id,
    examTypeId: examType.id,
    name: "Matching regression",
    fullMarks: 4,
    durationMinutes: 30,
    saveAsDraft: false,
    allocations: [
      { marksPerQuestion: 2, questionCount: 1 },
      { marksPerQuestion: 2, questionCount: 1, difficulty: "EASY" },
    ],
  },
  actor,
);
const papers = await generateQuestionPapers(
  {
    gridId: grid.id,
    examId: exam.id,
    title: "Test question paper",
    setCodes: ["A", "B"],
  },
  actor,
);
assert.equal(papers.length, 2);
assert.equal(
  await prisma.questionPaperItem.count({ where: { paperId: papers[0] } }),
  2,
);
checks += 2;
const hardItem = await prisma.questionPaperItem.findFirstOrThrow({
  where: { paperId: papers[1], questionId: secondQuestion.id },
});
await prisma.questionPaperItem.update({
  where: { id: hardItem.id },
  data: { isLocked: true },
});
await prisma.question.update({
  where: { id: secondQuestion.id },
  data: { status: "ARCHIVED" },
});
const third = await saveQuestion(
  {
    ...questionInput,
    questionText: "Another difficult question available for regeneration.",
    difficulty: "HARD",
    answer: "Third answer.",
  },
  actor,
);
await approveQuestion(third.id, actor);
const firstBefore = (
  await prisma.questionPaperItem.findMany({
    where: { paperId: papers[0] },
    orderBy: { displayOrder: "asc" },
  })
).map((item) => item.questionId);
await rejects(
  generateQuestionPapers(
    {
      gridId: grid.id,
      examId: exam.id,
      title: "Changed paper",
      setCodes: ["A", "B"],
    },
    actor,
  ),
  /locked question/,
);
assert.deepEqual(
  (
    await prisma.questionPaperItem.findMany({
      where: { paperId: papers[0] },
      orderBy: { displayOrder: "asc" },
    })
  ).map((item) => item.questionId),
  firstBefore,
);
checks++;
// Restoring the test question keeps the browser preview usable.
await prisma.question.update({
  where: { id: secondQuestion.id },
  data: { status: "APPROVED" },
});
await rejects(
  saveEnrollment(
    {
      studentId: student.id,
      academicYearId: year.id,
      classId: schoolClass.id,
      sectionId: section.id,
      enrollmentDate: new Date("2030-01-01"),
      status: "ACTIVE",
    },
    actor,
  ),
  /within.*academic year/,
);
const activeAssignment = await prisma.teacherAssignment.findFirstOrThrow({
  where: { teacherId: teacher.id },
});
await saveManagedUser(
  {
    id: teacher.userId!,
    firstName: "Test",
    lastName: "Teacher",
    username: "teacher",
    role: "CLASS_TEACHER",
    status: "ACTIVE",
  },
  actor,
);
await saveTeacherAssignment(
  { ...assignment, id: activeAssignment.id, isClassTeacher: false },
  actor,
);
assert.equal(
  await prisma.userRole.count({
    where: { userId: teacher.userId!, role: { code: "TEACHER" } },
  }),
  1,
  "Removing class responsibility must preserve teaching access",
);
checks++;
await saveTeacherAssignment(
  { ...assignment, id: activeAssignment.id, isClassTeacher: true },
  actor,
);
await saveManagedUser(
  {
    id: teacher.userId!,
    firstName: "Test",
    lastName: "Teacher",
    username: "teacher",
    role: "TEACHER",
    status: "ACTIVE",
  },
  actor,
);
assert.equal(
  await prisma.userRole.count({
    where: { userId: teacher.userId!, role: { code: "CLASS_TEACHER" } },
  }),
  1,
  "Routine account edits must retain assignment-derived access",
);
checks++;
const lateTeacherInput = teacherSchema.parse({
  teacherCode: "T002",
  firstName: "Late",
  lastName: "Login",
  gender: "NOT_SPECIFIED",
  mobile: "9800000008",
  joiningDate: "2026-04-14",
  employmentType: "PERMANENT",
  status: "ACTIVE",
  createLogin: false,
});
const lateTeacher = await saveTeacher(lateTeacherInput, actor);
await saveTeacherAssignment(
  { ...assignment, teacherId: lateTeacher.id, sectionId: sectionB.id },
  actor,
);
const linkedLate = await saveTeacher(
  {
    ...lateTeacherInput,
    id: lateTeacher.id,
    createLogin: true,
    username: "late",
    temporaryPassword: password,
    confirmPassword: password,
  },
  actor,
);
assert.equal(
  await prisma.userRole.count({
    where: { userId: linkedLate.userId!, role: { code: "CLASS_TEACHER" } },
  }),
  1,
  "Creating login after assignment must grant class teacher access",
);
checks++;
await saveManagedUser(
  {
    id: linkedLate.userId!,
    firstName: "Late",
    lastName: "Login",
    username: "late",
    role: "SCHOOL_ADMIN",
    status: "ACTIVE",
  },
  actor,
);
await prisma.user.update({
  where: { id: admin.id },
  data: { status: "INACTIVE" },
});
await rejects(
  archiveTeacher(lateTeacher.id, { ...actor, userId: linkedLate.userId! }),
  /at least one active school administrator/,
);
await rejects(
  saveTeacher(
    { ...lateTeacherInput, id: lateTeacher.id, status: "INACTIVE" },
    { ...actor, userId: linkedLate.userId! },
  ),
  /at least one active school administrator/,
);
await prisma.user.update({
  where: { id: admin.id },
  data: { status: "ACTIVE" },
});
const extraSubject = await saveSubject(
  {
    name: "Local subject",
    code: "LOCAL",
    subjectType: "THEORY",
    theoryFullMarks: 100,
    practicalFullMarks: 0,
    internalFullMarks: 0,
    status: "ACTIVE",
  },
  actor,
);
await saveClassSubject(
  {
    academicYearId: year.id,
    classId: schoolClass.id,
    subjectId: extraSubject.id,
    fullMarks: 100,
    theoryMarks: 100,
    practicalMarks: 0,
    internalMarks: 0,
    displayOrder: 3,
    status: "ACTIVE",
  },
  actor,
);
// Simulate publication committing after the initial exam read but before its transaction.
await prisma.exam.update({
  where: { id: exam.id },
  data: { status: "MARK_ENTRY" },
});
const transactionOriginal = prisma.$transaction.bind(prisma);
prisma.$transaction = (async (
  work: Parameters<typeof transactionOriginal>[0],
  options?: Parameters<typeof transactionOriginal>[1],
) => {
  prisma.$transaction = transactionOriginal;
  await prisma.exam.update({
    where: { id: exam.id },
    data: { status: "PUBLISHED" },
  });
  return transactionOriginal(work, options);
}) as typeof prisma.$transaction;
await rejects(
  saveExamSubject({ ...configuration, subjectId: extraSubject.id }, actor),
  /Published or locked/,
);
assert.equal(
  await prisma.examSubject.count({
    where: { examId: exam.id, subjectId: extraSubject.id },
  }),
  0,
);
checks++;
prisma.$transaction = transactionOriginal;
const teacherContext = {
  schoolId: actor.schoolId,
  user: { id: teacher.userId! },
  roles: new Set(["TEACHER"]),
} as Parameters<typeof academicAccess>[0];
const scope = await academicAccess(teacherContext);
assert.equal(scope.allows(year.id, schoolClass.id, section.id), true);
assert.equal(scope.allows(year.id, schoolClass.id, sectionB.id), false);
checks += 2;
await prisma.user.updateMany({
  where: { schoolId: actor.schoolId, status: "ACTIVE" },
  data: { mustChangePassword: false },
});
console.log(
  JSON.stringify({
    checks,
    schoolCode: "TESTERP",
    username: "admin",
    password,
    classId: schoolClass.id,
    yearId: year.id,
    sectionId: section.id,
    examSubjectId: examSubject.id,
    examId: exam.id,
    studentId: student.id,
    teacherId: teacher.id,
  }),
);
await prisma.$disconnect();

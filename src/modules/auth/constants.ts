export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  TEACHER: "TEACHER",
  CLASS_TEACHER: "CLASS_TEACHER",
  EXAM_COORDINATOR: "EXAM_COORDINATOR",
  STUDENT: "STUDENT",
} as const;

export const SCHOOL_PERMISSIONS = [
  ["dashboard.view", "View dashboard"],
  ["school.view", "View school profile"],
  ["school.settings.manage", "Manage school settings"],
  ["user.view", "View school users"],
  ["user.manage", "Manage school users"],
  ["role.view", "View roles and permissions"],
  ["role.manage", "Manage roles and permissions"],
  ["audit.view", "View school audit history"],
  ["academic.view", "View academic setup"],
  ["academic.manage", "Manage academic setup"],
  ["teacher.view", "View teachers"],
  ["teacher.create", "Create teachers"],
  ["teacher.edit", "Edit teachers"],
  ["teacher.archive", "Archive teachers"],
  ["teacher.assign", "Manage teacher assignments"],
  ["student.view", "View students"],
  ["student.create", "Create students"],
  ["student.edit", "Edit students"],
  ["student.archive", "Archive students"],
  ["student.restore", "Restore archived students"],
  ["student.enroll", "Manage student enrollments"],
  ["student.import", "Import students"],
  ["student.export", "Export students"],
  ["student.duplicate.override", "Override duplicate student warnings"],
  ["attendance.view", "View attendance"],
  ["attendance.manage", "Take and update attendance"],
  ["attendance.lock", "Lock attendance sessions"],
  ["attendance.report", "View attendance reports"],
  ["exam.view", "View examinations"],
  ["exam.manage", "Manage examination setup"],
  ["marks.enter", "Enter assigned student marks"],
  ["marks.verify", "Verify submitted marks"],
  ["marks.approve", "Approve marks"],
  ["marks.unlock", "Unlock approved or locked marks"],
  ["result.view", "View results and report cards"],
  ["result.publish", "Calculate and publish results"],
  ["question.view", "View the question bank"],
  ["question.manage", "Create and update questions"],
  ["question.approve", "Approve question-bank questions"],
  ["paper.view", "View specification grids and question papers"],
  ["paper.manage", "Manage specification grids"],
  ["paper.generate", "Generate and edit question papers"],
  ["report.view", "View school reports"],
  ["notification.view", "View notifications"],
  ["notification.manage", "Create school notifications"],
] as const;

export const PHASE_ONE_PERMISSIONS = SCHOOL_PERMISSIONS;

export const TEACHER_PERMISSIONS = [
  "dashboard.view",
  "academic.view",
  "teacher.view",
  "student.view",
  "attendance.view",
  "attendance.manage",
  "attendance.report",
  "exam.view",
  "marks.enter",
  "result.view",
  "question.view",
  "question.manage",
  "paper.view",
  "notification.view",
] as const;

export const STUDENT_PERMISSIONS = [
  "dashboard.view",
  "result.view",
  "notification.view",
] as const;

export const CLASS_TEACHER_PERMISSIONS = [
  ...TEACHER_PERMISSIONS,
  "marks.verify",
] as const;

export const EXAM_COORDINATOR_PERMISSIONS = [
  "dashboard.view",
  "academic.view",
  "teacher.view",
  "student.view",
  "attendance.view",
  "attendance.report",
  "exam.view",
  "exam.manage",
  "marks.enter",
  "marks.verify",
  "marks.approve",
  "result.view",
  "result.publish",
  "question.view",
  "question.approve",
  "paper.view",
  "paper.manage",
  "paper.generate",
  "report.view",
  "notification.view",
] as const;

export const LOGIN_FAILURE_MESSAGE =
  "Invalid school code, username, or password.";
export const SUPER_ADMIN_LOGIN_FAILURE_MESSAGE =
  "Invalid username or password.";
export const SCHOOL_UNAVAILABLE_MESSAGE =
  "Your school's account is currently unavailable. Please contact the system administrator.";

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

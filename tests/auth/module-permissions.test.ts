import { describe, expect, it } from "vitest";
import { modulePermissions } from "../../src/modules/auth/module-permissions";

const permissions = new Set([
  "dashboard.view",
  "attendance.view",
  "attendance.manage",
  "exam.manage",
  "marks.enter",
  "result.publish",
  "question.manage",
  "paper.generate",
  "school.settings.manage",
]);
describe("school module availability", () => {
  it("removes disabled module access without blocking settings or the dashboard", () => {
    expect([
      ...modulePermissions(permissions, {
        attendanceEnabled: false,
        examinationEnabled: false,
        questionBankEnabled: false,
      }),
    ]).toEqual(["dashboard.view", "school.settings.manage"]);
  });
  it("keeps unrelated modules enabled", () => {
    const allowed = modulePermissions(permissions, {
      attendanceEnabled: false,
      examinationEnabled: true,
      questionBankEnabled: true,
    });
    expect(allowed.has("attendance.manage")).toBe(false);
    expect(allowed.has("marks.enter")).toBe(true);
    expect(allowed.has("paper.generate")).toBe(true);
  });
});

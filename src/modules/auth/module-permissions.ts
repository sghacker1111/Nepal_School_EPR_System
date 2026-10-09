export type ModuleSettings = {
  attendanceEnabled: boolean;
  examinationEnabled: boolean;
  questionBankEnabled: boolean;
};
export function modulePermissions(
  permissions: ReadonlySet<string>,
  settings: ModuleSettings | null | undefined,
) {
  if (!settings) return new Set(permissions);
  return new Set(
    [...permissions].filter((permission) => {
      if (!settings.attendanceEnabled && permission.startsWith("attendance."))
        return false;
      if (
        !settings.examinationEnabled &&
        /^(exam|marks|result)\./.test(permission)
      )
        return false;
      if (
        !settings.questionBankEnabled &&
        /^(question|paper)\./.test(permission)
      )
        return false;
      return true;
    }),
  );
}

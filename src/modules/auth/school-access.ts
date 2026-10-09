export function isSchoolLoginAllowed(status: string) {
  return status === "ACTIVE" || status === "TRIAL";
}

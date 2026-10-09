export type DuplicateConfidence = "HIGH" | "MEDIUM";
export type DuplicateSource = {
  id: string;
  studentId: string;
  admissionNumber: string;
  iemisId?: string | null;
  birthRegistrationNumber?: string | null;
  registrationNumber?: string | null;
  normalizedName: string;
  dateOfBirthAd?: Date | null;
  previousSchool?: string | null;
  guardians: {
    relationship: string;
    guardian: { normalizedName: string; mobile: string };
  }[];
};
export type DuplicateProbe = {
  iemisId?: string;
  birthRegistrationNumber?: string;
  registrationNumber?: string;
  normalizedName: string;
  dateOfBirthAd?: Date;
  fatherName?: string;
  motherName?: string;
  guardianMobile?: string;
  previousSchool?: string;
};
export type DuplicateMatch = {
  id: string;
  studentId: string;
  admissionNumber: string;
  confidence: DuplicateConfidence;
  reasons: string[];
};
const normalized = (value?: string | null) =>
  value?.trim().toLocaleLowerCase("en-US") || "";
const sameDate = (left?: Date | null, right?: Date | null) =>
  Boolean(
    left &&
      right &&
      left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10),
  );
export function evaluateStudentDuplicate(
  candidate: DuplicateSource,
  probe: DuplicateProbe,
): DuplicateMatch | null {
  const reasons: string[] = [];
  let high = false;
  if (
    probe.iemisId &&
    normalized(candidate.iemisId) === normalized(probe.iemisId)
  ) {
    reasons.push("Same IEMIS ID");
    high = true;
  }
  if (
    probe.birthRegistrationNumber &&
    normalized(candidate.birthRegistrationNumber) ===
      normalized(probe.birthRegistrationNumber)
  ) {
    reasons.push("Same birth registration number");
    high = true;
  }
  if (
    probe.registrationNumber &&
    normalized(candidate.registrationNumber) ===
      normalized(probe.registrationNumber)
  )
    reasons.push("Same registration number");
  const sameName = candidate.normalizedName === probe.normalizedName;
  const dob = sameDate(candidate.dateOfBirthAd, probe.dateOfBirthAd);
  const father = candidate.guardians.some(
    (item) =>
      item.relationship === "FATHER" &&
      normalized(item.guardian.normalizedName) === normalized(probe.fatherName),
  );
  const mother = candidate.guardians.some(
    (item) =>
      item.relationship === "MOTHER" &&
      normalized(item.guardian.normalizedName) === normalized(probe.motherName),
  );
  const mobile = Boolean(
    probe.guardianMobile &&
      candidate.guardians.some(
        (item) => item.guardian.mobile === probe.guardianMobile,
      ),
  );
  if (sameName && dob) reasons.push("Same full name and date of birth");
  if (sameName && father) reasons.push("Same full name and father name");
  if (dob && father && mother) reasons.push("Same date of birth and parents");
  if (mobile) reasons.push("Same guardian mobile");
  if (
    sameName &&
    probe.previousSchool &&
    normalized(candidate.previousSchool) === normalized(probe.previousSchool)
  )
    reasons.push("Same name and previous school");
  if (!reasons.length) return null;
  const medium = reasons.some((reason) =>
    [
      "Same full name and date of birth",
      "Same full name and father name",
      "Same date of birth and parents",
      "Same guardian mobile",
      "Same registration number",
    ].includes(reason),
  );
  if (!high && !medium) return null;
  return {
    id: candidate.id,
    studentId: candidate.studentId,
    admissionNumber: candidate.admissionNumber,
    confidence: high ? "HIGH" : "MEDIUM",
    reasons,
  };
}

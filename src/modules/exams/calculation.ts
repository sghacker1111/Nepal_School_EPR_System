export type GradeRuleValue = {
  minimumPercentage: number;
  maximumPercentage: number;
  grade: string;
  gradePoint: number;
  description?: string | null;
};

export type CalculatedGrade = {
  grade: string;
  gradePoint: number;
  description: string | null;
};

export function calculateGrade(
  percentage: number,
  rules: GradeRuleValue[],
): CalculatedGrade {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    throw new Error("Percentage must be between 0 and 100.");
  const normalized = Number(percentage.toFixed(2));
  const rule = [...rules]
    .sort((a, b) => b.minimumPercentage - a.minimumPercentage)
    .find(
      (candidate) =>
        normalized >= candidate.minimumPercentage &&
        normalized <= candidate.maximumPercentage,
    );
  if (!rule) return { grade: "NG", gradePoint: 0, description: "Not graded" };
  return {
    grade: rule.grade,
    gradePoint: rule.gradePoint,
    description: rule.description ?? null,
  };
}

export function calculateSubjectResult(input: {
  theoryMarks?: number | null;
  practicalMarks?: number | null;
  internalMarks?: number | null;
  theoryFullMarks: number;
  practicalFullMarks: number;
  internalFullMarks: number;
  passMarks?: number | null;
  theoryPassMarks?: number | null;
  practicalPassMarks?: number | null;
  internalPassMarks?: number | null;
  specialStatus?: "ABSENT" | "WITHHELD" | "EXEMPTED" | null;
  rules: GradeRuleValue[];
}) {
  const fullMarks =
    input.theoryFullMarks + input.practicalFullMarks + input.internalFullMarks;
  if (fullMarks <= 0) throw new Error("Full marks must be greater than zero.");
  if (input.specialStatus) {
    return {
      totalMarks: null,
      percentage: null,
      grade:
        input.specialStatus === "EXEMPTED"
          ? "EX"
          : input.specialStatus === "ABSENT"
            ? "AB"
            : "WH",
      gradePoint: null,
      passed: input.specialStatus === "EXEMPTED",
    };
  }
  const components = [
    [input.theoryMarks, input.theoryFullMarks, input.theoryPassMarks],
    [input.practicalMarks, input.practicalFullMarks, input.practicalPassMarks],
    [input.internalMarks, input.internalFullMarks, input.internalPassMarks],
  ];
  for (const [mark, full, pass] of components) {
    if (
      full === undefined ||
      full === null ||
      !Number.isFinite(full) ||
      full < 0
    )
      throw new Error("Invalid component full marks.");
    if (full > 0 && mark == null)
      throw new Error(
        "Enter every required mark component or choose a special status.",
      );
    if (mark != null && (!Number.isFinite(mark) || mark < 0 || mark > full))
      throw new Error(
        "Marks must be between zero and the component full marks.",
      );
    if (pass != null && (!Number.isFinite(pass) || pass < 0 || pass > full))
      throw new Error("Invalid component pass marks.");
  }
  const totalMarks =
    (input.theoryMarks ?? 0) +
    (input.practicalMarks ?? 0) +
    (input.internalMarks ?? 0);
  const percentage = Number(((totalMarks / fullMarks) * 100).toFixed(2));
  const grade = calculateGrade(percentage, input.rules);
  const passed =
    grade.gradePoint > 0 &&
    (input.passMarks == null || totalMarks >= input.passMarks) &&
    components.every(([mark, , pass]) => pass == null || (mark ?? 0) >= pass);
  return {
    totalMarks: Number(totalMarks.toFixed(2)),
    percentage,
    grade: passed ? grade.grade : "NG",
    gradePoint: passed ? grade.gradePoint : 0,
    passed,
  };
}

export function calculateGpa(
  subjects: Array<{
    gradePoint: number | null;
    creditHour: number;
    passed: boolean;
  }>,
) {
  if (!subjects.length) return { gpa: 0, passed: false };
  if (
    subjects.some(
      (subject) =>
        !Number.isFinite(subject.creditHour) || subject.creditHour <= 0,
    )
  )
    throw new Error("Credit hours must be positive.");
  if (subjects.some((subject) => !subject.passed))
    return { gpa: 0, passed: false };
  const included = subjects.filter((subject) => subject.gradePoint !== null);
  const credits = included.reduce(
    (sum, subject) => sum + subject.creditHour,
    0,
  );
  const gpa = credits
    ? included.reduce(
        (sum, subject) => sum + (subject.gradePoint ?? 0) * subject.creditHour,
        0,
      ) / credits
    : 0;
  return {
    gpa: Number(gpa.toFixed(2)),
    passed: subjects.every((subject) => subject.passed),
  };
}

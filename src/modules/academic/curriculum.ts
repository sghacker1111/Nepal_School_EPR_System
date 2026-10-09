/** CDC Secondary Education Curriculum 2078, general stream, printed page 7.
 * These are subject/credit references, not a universal assessment policy.
 */
export const CDC_SOURCE =
  "https://moecdc.gov.np/content/201/secondary-education-curssions--2078--class-9-10--mandatory/";
export const CDC_GENERAL_SECONDARY = [
  { code: "NEPALI", name: "Nepali", creditHour: 5 },
  { code: "ENGLISH", name: "English", creditHour: 5 },
  { code: "MATH", name: "Mathematics", creditHour: 5 },
  { code: "SCIENCE_TECH", name: "Science and Technology", creditHour: 5 },
  { code: "SOCIAL", name: "Social Studies", creditHour: 4 },
] as const;

export const CDC_GRADE_RULES = [
  { minimumPercentage: 90, maximumPercentage: 100, grade: "A+", gradePoint: 4 },
  {
    minimumPercentage: 80,
    maximumPercentage: 89.99,
    grade: "A",
    gradePoint: 3.6,
  },
  {
    minimumPercentage: 70,
    maximumPercentage: 79.99,
    grade: "B+",
    gradePoint: 3.2,
  },
  {
    minimumPercentage: 60,
    maximumPercentage: 69.99,
    grade: "B",
    gradePoint: 2.8,
  },
  {
    minimumPercentage: 50,
    maximumPercentage: 59.99,
    grade: "C+",
    gradePoint: 2.4,
  },
  {
    minimumPercentage: 40,
    maximumPercentage: 49.99,
    grade: "C",
    gradePoint: 2,
  },
  {
    minimumPercentage: 35,
    maximumPercentage: 39.99,
    grade: "D",
    gradePoint: 1.6,
  },
  {
    minimumPercentage: 0,
    maximumPercentage: 34.99,
    grade: "NG",
    gradePoint: 0,
  },
];

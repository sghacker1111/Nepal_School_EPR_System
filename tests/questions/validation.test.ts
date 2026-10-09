import { describe, expect, it } from "vitest";
import {
  questionSchema,
  specificationGridSchema,
} from "@/modules/questions/validation";

const ids = [
  "cm1234567890123456789012",
  "cm1234567890123456789013",
  "cm1234567890123456789014",
  "cm1234567890123456789015",
];
const baseQuestion = {
  classId: ids[0],
  subjectId: ids[1],
  chapterId: ids[2],
  questionType: "MCQ",
  questionText: "Which option is correct?",
  marks: 1,
  difficulty: "MEDIUM",
  cognitiveLevel: "UNDERSTANDING",
  options: [
    { label: "A", text: "Wrong", isCorrect: false },
    { label: "B", text: "Correct", isCorrect: true },
  ],
};

describe("question bank and grid validation", () => {
  it("requires exactly one correct MCQ option", () => {
    expect(questionSchema.safeParse(baseQuestion).success).toBe(true);
    expect(
      questionSchema.safeParse({
        ...baseQuestion,
        options: baseQuestion.options.map((option) => ({
          ...option,
          isCorrect: true,
        })),
      }).success,
    ).toBe(false);
  });

  it("accepts structured specification allocations", () => {
    expect(
      specificationGridSchema.safeParse({
        academicYearId: ids[0],
        classId: ids[1],
        subjectId: ids[2],
        examTypeId: ids[3],
        name: "Final grid",
        fullMarks: 75,
        durationMinutes: 180,
        saveAsDraft: false,
        allocations: [
          { questionType: "SHORT", marksPerQuestion: 5, questionCount: 15 },
        ],
      }).success,
    ).toBe(true);
  });
});

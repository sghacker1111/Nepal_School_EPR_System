import { allocateQuestions } from "./allocation";
import { createHash } from "node:crypto";
import {
  AuditAction,
  Prisma,
  type CognitiveLevel,
  type DifficultyLevel,
  type QuestionType,
} from "@/generated/prisma/client";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { RequestMetadata } from "@/modules/audit/service";
import type {
  ChapterInput,
  PaperGenerationInput,
  QuestionInput,
  SpecificationGridInput,
  TopicInput,
} from "@/modules/questions/validation";

type QuestionActor = {
  schoolId: string;
  userId: string;
  metadata: RequestMetadata;
};
const optional = <T>(value: T | "" | undefined) =>
  value === "" || value === undefined ? null : value;
function conflict(error: unknown, message: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    throw new ConflictError(message);
  throw error;
}

export async function saveChapter(input: ChapterInput, actor: QuestionActor) {
  const [schoolClass, subject] = await Promise.all([
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    prisma.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId },
    }),
  ]);
  if (!schoolClass || !subject)
    throw new ValidationError("Class and subject must belong to your school.");
  try {
    return await prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter.upsert({
        where: {
          schoolId_classId_subjectId_name: {
            schoolId: actor.schoolId,
            classId: input.classId,
            subjectId: input.subjectId,
            name: input.name,
          },
        },
        update: {
          code: input.code || null,
          displayOrder: input.displayOrder,
          status: input.status,
        },
        create: {
          schoolId: actor.schoolId,
          classId: input.classId,
          subjectId: input.subjectId,
          name: input.name,
          code: input.code || null,
          displayOrder: input.displayOrder,
          status: input.status,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.CHAPTER_SAVED,
          entityType: "Chapter",
          entityId: chapter.id,
          description: `Saved chapter ${chapter.name} for ${schoolClass.name} ${subject.name}.`,
          ...actor.metadata,
        },
      });
      return chapter;
    });
  } catch (error) {
    conflict(error, "That chapter already exists for the class and subject.");
  }
}

export async function saveTopic(input: TopicInput, actor: QuestionActor) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: input.chapterId, schoolId: actor.schoolId },
  });
  if (!chapter)
    throw new ValidationError("Chapter must belong to your school.");
  try {
    return await prisma.$transaction(async (tx) => {
      const topic = await tx.topic.upsert({
        where: {
          schoolId_chapterId_name: {
            schoolId: actor.schoolId,
            chapterId: input.chapterId,
            name: input.name,
          },
        },
        update: { displayOrder: input.displayOrder, status: input.status },
        create: {
          schoolId: actor.schoolId,
          chapterId: input.chapterId,
          name: input.name,
          displayOrder: input.displayOrder,
          status: input.status,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.TOPIC_SAVED,
          entityType: "Topic",
          entityId: topic.id,
          description: `Saved topic ${topic.name}.`,
          ...actor.metadata,
        },
      });
      return topic;
    });
  } catch (error) {
    conflict(error, "That topic already exists in the chapter.");
  }
}

export async function saveQuestion(input: QuestionInput, actor: QuestionActor) {
  const [schoolClass, subject, chapter, topic] = await Promise.all([
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    prisma.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId },
    }),
    prisma.chapter.findFirst({
      where: {
        id: input.chapterId,
        schoolId: actor.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
      },
    }),
    input.topicId
      ? prisma.topic.findFirst({
          where: {
            id: input.topicId,
            schoolId: actor.schoolId,
            chapterId: input.chapterId,
          },
        })
      : Promise.resolve(null),
  ]);
  if (!schoolClass || !subject || !chapter || (input.topicId && !topic))
    throw new ValidationError(
      "Question hierarchy must belong to the selected school, class, and subject.",
    );
  return prisma.$transaction(async (tx) => {
    if (input.id) {
      await tx.$queryRaw`SELECT id FROM "Question" WHERE id = ${input.id} AND "schoolId" = ${actor.schoolId} FOR UPDATE`;
      const existing = await tx.question.findFirst({
        where: { id: input.id, schoolId: actor.schoolId },
      });
      if (!existing) throw new NotFoundError("Question not found.");
      if (existing.status !== "DRAFT")
        throw new ValidationError(
          "Only draft questions can be edited. Create a new question to preserve approved papers.",
        );
      await tx.questionOption.deleteMany({
        where: { schoolId: actor.schoolId, questionId: existing.id },
      });
    }
    const data = {
      schoolId: actor.schoolId,
      classId: input.classId,
      subjectId: input.subjectId,
      chapterId: input.chapterId,
      topicId: optional(input.topicId),
      questionType: input.questionType,
      questionText: input.questionText,
      marks: input.marks,
      difficulty: input.difficulty,
      cognitiveLevel: input.cognitiveLevel,
      estimatedMinutes: optional(input.estimatedMinutes),
      specificationGroup: input.specificationGroup || null,
      learningOutcome: input.learningOutcome || null,
      curriculumCode: input.curriculumCode || null,
      answer: input.answer || null,
      solution: input.solution || null,
      options: {
        create: input.options.map((option) => ({
          schoolId: actor.schoolId,
          label: option.label.toUpperCase(),
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      },
    };
    const question = input.id
      ? await tx.question.update({ where: { id: input.id }, data })
      : await tx.question.create({
          data: { ...data, createdById: actor.userId },
        });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.QUESTION_SAVED,
        entityType: "Question",
        entityId: question.id,
        description: `Created ${question.questionType} question for ${schoolClass.name} ${subject.name}.`,
        newValue: {
          marks: question.marks.toString(),
          difficulty: question.difficulty,
          cognitiveLevel: question.cognitiveLevel,
        },
        ...actor.metadata,
      },
    });
    return question;
  });
}

export async function approveQuestion(
  questionId: string,
  actor: QuestionActor,
) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, schoolId: actor.schoolId },
  });
  if (!question) throw new NotFoundError("Question not found.");
  if (question.status !== "DRAFT")
    throw new ValidationError("Only draft questions can be approved.");
  if (question.questionType !== "MCQ" && !question.answer && !question.solution)
    throw new ValidationError(
      "Add an answer or marking guidance before approval.",
    );
  return prisma.$transaction(async (tx) => {
    const approved = await tx.question.update({
      where: { id: question.id },
      data: {
        status: "APPROVED",
        approvedById: actor.userId,
        approvedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.QUESTION_APPROVED,
        entityType: "Question",
        entityId: approved.id,
        description: "Approved a question for paper generation.",
        ...actor.metadata,
      },
    });
    return approved;
  });
}

export async function saveSpecificationGrid(
  input: SpecificationGridInput,
  actor: QuestionActor,
) {
  const [year, schoolClass, subject, examType] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId: actor.schoolId },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    prisma.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId },
    }),
    prisma.examType.findFirst({
      where: { id: input.examTypeId, schoolId: actor.schoolId },
    }),
  ]);
  if (!year || !schoolClass || !subject || !examType)
    throw new ValidationError(
      "Grid academic selections must belong to your school.",
    );
  for (const allocation of input.allocations) {
    if (
      allocation.chapterId &&
      !(await prisma.chapter.findFirst({
        where: {
          id: allocation.chapterId,
          schoolId: actor.schoolId,
          classId: input.classId,
          subjectId: input.subjectId,
        },
      }))
    )
      throw new ValidationError(
        "Every allocated chapter must match the selected class and subject.",
      );
    if (
      allocation.topicId &&
      !(await prisma.topic.findFirst({
        where: {
          id: allocation.topicId,
          schoolId: actor.schoolId,
          chapterId: allocation.chapterId || undefined,
          chapter: { classId: input.classId, subjectId: input.subjectId },
        },
      }))
    )
      throw new ValidationError(
        "Every allocated topic must match its chapter.",
      );
  }
  const allocatedMarks = input.allocations.reduce(
    (sum, row) => sum + row.marksPerQuestion * row.questionCount,
    0,
  );
  const matches = Math.abs(allocatedMarks - input.fullMarks) < 0.001;
  if (!input.saveAsDraft && !matches)
    throw new ValidationError(
      `Allocated marks are ${allocatedMarks}; required marks are ${input.fullMarks}. Save as draft or correct the difference.`,
    );
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.specificationGrid.findUnique({
        where: {
          schoolId_academicYearId_classId_subjectId_examTypeId_name: {
            schoolId: actor.schoolId,
            academicYearId: input.academicYearId,
            classId: input.classId,
            subjectId: input.subjectId,
            examTypeId: input.examTypeId,
            name: input.name,
          },
        },
      });
      if (
        existing &&
        (await tx.questionPaper.count({
          where: { schoolId: actor.schoolId, gridId: existing.id },
        }))
      )
        throw new ValidationError(
          "This grid has generated papers. Save a new grid name to preserve them.",
        );
      const grid = existing
        ? await tx.specificationGrid.update({
            where: { id: existing.id },
            data: {
              fullMarks: input.fullMarks,
              durationMinutes: input.durationMinutes,
              status: matches && !input.saveAsDraft ? "VALID" : "DRAFT",
            },
          })
        : await tx.specificationGrid.create({
            data: {
              schoolId: actor.schoolId,
              academicYearId: input.academicYearId,
              classId: input.classId,
              subjectId: input.subjectId,
              examTypeId: input.examTypeId,
              name: input.name,
              fullMarks: input.fullMarks,
              durationMinutes: input.durationMinutes,
              status: matches && !input.saveAsDraft ? "VALID" : "DRAFT",
              createdById: actor.userId,
            },
          });
      await tx.specificationGridAllocation.deleteMany({
        where: { schoolId: actor.schoolId, gridId: grid.id },
      });
      await tx.specificationGridAllocation.createMany({
        data: input.allocations.map((row) => ({
          schoolId: actor.schoolId,
          gridId: grid.id,
          chapterId: optional(row.chapterId),
          topicId: optional(row.topicId),
          questionType: optional(row.questionType) as QuestionType | null,
          cognitiveLevel: optional(row.cognitiveLevel) as CognitiveLevel | null,
          difficulty: optional(row.difficulty) as DifficultyLevel | null,
          marksPerQuestion: row.marksPerQuestion,
          questionCount: row.questionCount,
          allocatedMarks: row.marksPerQuestion * row.questionCount,
        })),
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.SPECIFICATION_GRID_SAVED,
          entityType: "SpecificationGrid",
          entityId: grid.id,
          description: `Saved specification grid ${grid.name}: allocated ${allocatedMarks} of ${input.fullMarks} marks.`,
          newValue: {
            allocatedMarks,
            fullMarks: input.fullMarks,
            status: grid.status,
          },
          ...actor.metadata,
        },
      });
      return grid;
    });
  } catch (error) {
    conflict(
      error,
      "A specification grid with that name already exists for this selection.",
    );
  }
}

function stableScore(id: string, setCode: string) {
  return createHash("sha256").update(`${setCode}:${id}`).digest("hex");
}
function matchesAllocation(
  question: {
    chapterId: string;
    topicId: string | null;
    questionType: QuestionType;
    cognitiveLevel: CognitiveLevel;
    difficulty: DifficultyLevel;
    marks: Prisma.Decimal;
  },
  allocation: {
    chapterId: string | null;
    topicId: string | null;
    questionType: QuestionType | null;
    cognitiveLevel: CognitiveLevel | null;
    difficulty: DifficultyLevel | null;
    marksPerQuestion: Prisma.Decimal;
  },
) {
  return (
    (!allocation.chapterId || question.chapterId === allocation.chapterId) &&
    (!allocation.topicId || question.topicId === allocation.topicId) &&
    (!allocation.questionType ||
      question.questionType === allocation.questionType) &&
    (!allocation.cognitiveLevel ||
      question.cognitiveLevel === allocation.cognitiveLevel) &&
    (!allocation.difficulty || question.difficulty === allocation.difficulty) &&
    Number(question.marks) === Number(allocation.marksPerQuestion)
  );
}

export async function generateQuestionPapers(
  input: PaperGenerationInput,
  actor: QuestionActor,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "SpecificationGrid" WHERE id = ${input.gridId} AND "schoolId" = ${actor.schoolId} FOR UPDATE`;
      const grid = await tx.specificationGrid.findFirst({
        where: { id: input.gridId, schoolId: actor.schoolId },
        include: { allocations: true },
      });
      if (!grid || grid.status !== "VALID")
        throw new ValidationError(
          "Only a valid specification grid can generate papers.",
        );
      if (
        input.passMarks !== undefined &&
        input.passMarks > Number(grid.fullMarks)
      )
        throw new ValidationError("Pass marks cannot exceed full marks.");
      if (
        input.examId &&
        !(await tx.exam.findFirst({
          where: {
            id: input.examId,
            schoolId: actor.schoolId,
            academicYearId: grid.academicYearId,
            examTypeId: grid.examTypeId,
          },
        }))
      )
        throw new ValidationError(
          "The selected exam does not match this school and academic year.",
        );
      const questions = await tx.question.findMany({
        where: {
          schoolId: actor.schoolId,
          classId: grid.classId,
          subjectId: grid.subjectId,
          status: "APPROVED",
        },
      });
      const generated: string[] = [];
      for (const rawSet of new Set(
        input.setCodes.map((code) => code.toUpperCase()),
      )) {
        const setCode = rawSet.toUpperCase();
        const paperId = await (async () => {
          const existing = await tx.questionPaper.findUnique({
            where: {
              schoolId_gridId_setCode: {
                schoolId: actor.schoolId,
                gridId: grid.id,
                setCode,
              },
            },
            include: {
              items: { where: { isLocked: true }, include: { question: true } },
            },
          });
          const paper = existing
            ? await tx.questionPaper.update({
                where: { id: existing.id },
                data: {
                  examId: optional(input.examId),
                  title: input.title,
                  passMarks: optional(input.passMarks),
                  instructions: input.instructions || null,
                  status: "DRAFT",
                },
              })
            : await tx.questionPaper.create({
                data: {
                  schoolId: actor.schoolId,
                  academicYearId: grid.academicYearId,
                  classId: grid.classId,
                  subjectId: grid.subjectId,
                  examId: optional(input.examId),
                  gridId: grid.id,
                  title: input.title,
                  setCode,
                  fullMarks: grid.fullMarks,
                  passMarks: optional(input.passMarks),
                  durationMinutes: grid.durationMinutes,
                  instructions: input.instructions || null,
                  generatedById: actor.userId,
                },
              });
          if (existing)
            await tx.questionPaperItem.deleteMany({
              where: { paperId: paper.id, isLocked: false },
            });
          const locked = existing?.items ?? [];
          for (let index = 0; index < locked.length; index += 1)
            await tx.questionPaperItem.update({
              where: { id: locked[index].id },
              data: { displayOrder: 10000 + index },
            });
          const slots = grid.allocations.flatMap((allocation) =>
            Array.from({ length: allocation.questionCount }, () => allocation),
          );
          const candidates = slots.map((allocation) =>
            questions
              .filter((question) => matchesAllocation(question, allocation))
              .sort((a, b) =>
                stableScore(a.id, setCode).localeCompare(
                  stableScore(b.id, setCode),
                ),
              )
              .map((question) => question.id),
          );
          let selected: string[];
          try {
            selected = allocateQuestions(
              candidates,
              locked.map((item) => item.questionId),
            );
          } catch (error) {
            throw new ValidationError(
              error instanceof Error
                ? error.message
                : "Grid allocation failed.",
            );
          }
          let order = 1;
          for (const [index, questionId] of selected.entries()) {
            const existingItem = locked.find(
              (item) => item.questionId === questionId,
            );
            if (existingItem)
              await tx.questionPaperItem.update({
                where: { id: existingItem.id },
                data: {
                  displayOrder: order++,
                  marks: slots[index].marksPerQuestion,
                },
              });
            else
              await tx.questionPaperItem.create({
                data: {
                  schoolId: actor.schoolId,
                  paperId: paper.id,
                  questionId,
                  displayOrder: order++,
                  marks: slots[index].marksPerQuestion,
                },
              });
          }
          await tx.auditLog.create({
            data: {
              schoolId: actor.schoolId,
              userId: actor.userId,
              action: AuditAction.QUESTION_PAPER_GENERATED,
              entityType: "QuestionPaper",
              entityId: paper.id,
              description: `Generated question paper Set ${setCode} from ${grid.name}.`,
              newValue: {
                setCode,
                fullMarks: grid.fullMarks.toString(),
                questionCount: order - 1,
              },
              ...actor.metadata,
            },
          });
          return paper.id;
        })();
        generated.push(paperId);
      }
      return generated;
    },
    { timeout: 60000 },
  );
}

export async function togglePaperItemLock(
  itemId: string,
  actor: QuestionActor,
) {
  const item = await prisma.questionPaperItem.findFirst({
    where: { id: itemId, schoolId: actor.schoolId },
  });
  if (!item) throw new NotFoundError("Paper item not found.");
  return prisma.questionPaperItem.update({
    where: { id: item.id },
    data: { isLocked: !item.isLocked },
  });
}

export async function movePaperItem(
  itemId: string,
  direction: "up" | "down",
  actor: QuestionActor,
) {
  const item = await prisma.questionPaperItem.findFirst({
    where: { id: itemId, schoolId: actor.schoolId },
    include: { paper: true },
  });
  if (!item) throw new NotFoundError("Paper item not found.");
  const neighbor = await prisma.questionPaperItem.findFirst({
    where: {
      schoolId: actor.schoolId,
      paperId: item.paperId,
      displayOrder:
        direction === "up"
          ? { lt: item.displayOrder }
          : { gt: item.displayOrder },
    },
    orderBy: { displayOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return item;
  await prisma.$transaction(async (tx) => {
    await tx.questionPaperItem.update({
      where: { id: item.id },
      data: { displayOrder: 999999 },
    });
    await tx.questionPaperItem.update({
      where: { id: neighbor.id },
      data: { displayOrder: item.displayOrder },
    });
    await tx.questionPaperItem.update({
      where: { id: item.id },
      data: { displayOrder: neighbor.displayOrder },
    });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.QUESTION_PAPER_UPDATED,
        entityType: "QuestionPaper",
        entityId: item.paperId,
        description: `Moved a question ${direction} in Set ${item.paper.setCode}.`,
        ...actor.metadata,
      },
    });
  });
}

export async function replacePaperItem(itemId: string, actor: QuestionActor) {
  const item = await prisma.questionPaperItem.findFirst({
    where: { id: itemId, schoolId: actor.schoolId },
    include: { question: true, paper: { include: { items: true } } },
  });
  if (!item) throw new NotFoundError("Paper item not found.");
  if (item.isLocked)
    throw new ForbiddenError("Unlock this question before replacing it.");
  const used = item.paper.items.map((paperItem) => paperItem.questionId);
  const replacement = await prisma.question.findFirst({
    where: {
      schoolId: actor.schoolId,
      classId: item.paper.classId,
      subjectId: item.paper.subjectId,
      chapterId: item.question.chapterId,
      ...(item.question.topicId ? { topicId: item.question.topicId } : {}),
      status: "APPROVED",
      id: { notIn: used },
      questionType: item.question.questionType,
      difficulty: item.question.difficulty,
      cognitiveLevel: item.question.cognitiveLevel,
      marks: item.marks,
    },
  });
  if (!replacement)
    throw new ValidationError(
      "No unused approved equivalent question is available.",
    );
  await prisma.$transaction(async (tx) => {
    await tx.questionPaperItem.update({
      where: { id: item.id },
      data: { questionId: replacement.id },
    });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.QUESTION_PAPER_UPDATED,
        entityType: "QuestionPaper",
        entityId: item.paperId,
        description: "Replaced a paper question with an approved equivalent.",
        oldValue: { questionId: item.questionId },
        newValue: { questionId: replacement.id },
        ...actor.metadata,
      },
    });
  });
}

export async function removePaperItem(itemId: string, actor: QuestionActor) {
  const item = await prisma.questionPaperItem.findFirst({
    where: { id: itemId, schoolId: actor.schoolId },
  });
  if (!item) throw new NotFoundError("Paper item not found.");
  if (item.isLocked)
    throw new ForbiddenError("Unlock this question before removing it.");
  await prisma.$transaction(async (tx) => {
    await tx.questionPaperItem.delete({ where: { id: item.id } });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.QUESTION_PAPER_UPDATED,
        entityType: "QuestionPaper",
        entityId: item.paperId,
        description: "Removed a question from a draft paper.",
        oldValue: { questionId: item.questionId },
        ...actor.metadata,
      },
    });
  });
}

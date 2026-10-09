import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";

import {
  ChapterForm,
  QuestionApproval,
  QuestionForm,
  TopicForm,
} from "@/modules/questions/components/question-forms";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSchoolPage("question.view");
  const query = await searchParams;
  const [classes, subjects, chapters, topics, questions] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.subject.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.chapter.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      include: { class: true, subject: true },
      orderBy: [
        { class: { displayOrder: "asc" } },
        { subject: { name: "asc" } },
        { displayOrder: "asc" },
      ],
    }),
    prisma.topic.findMany({
      where: { schoolId: session.schoolId, status: "ACTIVE" },
      include: { chapter: true },
      orderBy: [{ chapter: { name: "asc" } }, { displayOrder: "asc" }],
    }),
    prisma.question.findMany({
      where: {
        schoolId: session.schoolId,
        ...(["DRAFT", "APPROVED", "ARCHIVED"].includes(query.status ?? "")
          ? { status: query.status as "DRAFT" | "APPROVED" | "ARCHIVED" }
          : {}),
        ...(query.q
          ? { questionText: { contains: query.q, mode: "insensitive" } }
          : {}),
      },
      include: {
        class: true,
        subject: true,
        chapter: true,
        topic: true,
        options: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const canManage = session.permissions.has("question.manage");
  const canApprove = session.permissions.has("question.approve");
  const editing =
    canManage && query.edit
      ? await prisma.question.findFirst({
          where: {
            id: query.edit,
            schoolId: session.schoolId,
            status: "DRAFT",
          },
          include: { options: true },
        })
      : null;
  const initialValue = editing
    ? {
        ...editing,
        marks: Number(editing.marks),
        topicId: editing.topicId ?? "",
        estimatedMinutes: editing.estimatedMinutes ?? undefined,
        specificationGroup: editing.specificationGroup ?? "",
        learningOutcome: editing.learningOutcome ?? "",
        curriculumCode: editing.curriculumCode ?? "",
        answer: editing.answer ?? "",
        solution: editing.solution ?? "",
      }
    : undefined;
  const chapterOptions = chapters.map((item) => ({
    id: item.id,
    name: `${item.class.name} · ${item.subject.name} · ${item.name}`,
    classId: item.classId,
    subjectId: item.subjectId,
  }));
  const topicOptions = topics.map((item) => ({
    id: item.id,
    name: `${item.chapter.name} · ${item.name}`,
    chapterId: item.chapterId,
  }));
  return (
    <>
      <PageHeader
        eyebrow="Phase 6"
        title="Question bank"
        description="Organize curriculum-aligned chapters, topics, questions, MCQ options, answers, difficulty, and cognitive levels."
      />
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Chapters</CardTitle>
            </CardHeader>
            <CardContent>
              <ChapterForm classes={classes} subjects={subjects} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <TopicForm chapters={chapterOptions} />
            </CardContent>
          </Card>
        </div>
      )}
      {canManage && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>
              {editing ? "Edit draft question" : "Create question"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionForm
              key={editing?.id ?? "new"}
              initialValue={initialValue}
              classes={classes}
              subjects={subjects}
              chapters={chapterOptions}
              topics={topicOptions}
            />
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Question library</CardTitle>
            <form method="get" className="flex flex-wrap gap-2">
              <input
                name="q"
                defaultValue={query.q ?? ""}
                className="h-9 rounded-lg border px-3 text-sm"
                placeholder="Search text"
              />
              <select
                name="status"
                defaultValue={query.status ?? ""}
                className="h-9 rounded-lg border bg-white px-3 text-sm"
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <Button size="sm" type="submit">
                Filter
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.length ? (
            questions.map((question) => (
              <article key={question.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge
                        variant={
                          question.status === "APPROVED" ? "success" : "outline"
                        }
                      >
                        {question.status}
                      </Badge>
                      <Badge variant="outline">{question.questionType}</Badge>
                      <Badge variant="outline">
                        {question.marks.toString()} marks
                      </Badge>
                      <Badge variant="outline">{question.difficulty}</Badge>
                      <Badge variant="outline">{question.cognitiveLevel}</Badge>
                    </div>
                    <p className="font-semibold leading-6">
                      {question.questionText}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {question.class.name} · {question.subject.name} ·{" "}
                      {question.chapter.name}
                      {question.topic ? ` · ${question.topic.name}` : ""}
                    </p>
                    {question.options.length > 0 && (
                      <ol className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                        {question.options.map((option) => (
                          <li key={option.id}>
                            {option.label}. {option.text}
                            {canApprove && option.isCorrect ? " ✓" : ""}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  {question.status === "DRAFT" && (
                    <div className="flex flex-wrap gap-2">
                      {canManage && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/question-bank?edit=${question.id}`}
                          >
                            Edit draft
                          </Link>
                        </Button>
                      )}
                      {canApprove && <QuestionApproval id={question.id} />}
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              No questions match this filter.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

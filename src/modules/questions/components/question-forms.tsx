"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { QuestionInput } from "@/modules/questions/validation";
import { approveQuestionFormAction } from "@/modules/questions/actions";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generatePapersAction,
  saveChapterAction,
  saveQuestionAction,
  saveSpecificationGridAction,
  saveTopicAction,
  type QuestionActionState,
} from "@/modules/questions/actions";

type Option = {
  id: string;
  name: string;
  classId?: string;
  subjectId?: string;
  chapterId?: string;
};
const initial: QuestionActionState = {};
const selectClass = "h-10 w-full rounded-lg border bg-white px-3 text-sm";
function Message({ state }: { state: QuestionActionState }) {
  return <FormFeedback state={state} />;
}

export function ChapterForm({
  classes,
  subjects,
}: {
  classes: Option[];
  subjects: Option[];
}) {
  const [state, action, pending] = useActionState(saveChapterAction, initial);
  return (
    <form action={action} className="space-y-3">
      <Message state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="classId" className={selectClass} required>
          <option value="">Class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="subjectId" className={selectClass} required>
          <option value="">Subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Chapter name</Label>
        <Input name="name" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="code" placeholder="Optional curriculum code" />
        <Input name="displayOrder" type="number" min="0" defaultValue="0" />
      </div>
      <input type="hidden" name="status" value="ACTIVE" />
      <Button disabled={pending}>Save chapter</Button>
    </form>
  );
}
export function TopicForm({ chapters }: { chapters: Option[] }) {
  const [state, action, pending] = useActionState(saveTopicAction, initial);
  return (
    <form action={action} className="space-y-3">
      <Message state={state} />
      <select name="chapterId" className={selectClass} required>
        <option value="">Chapter</option>
        {chapters.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <div>
        <Label>Topic name</Label>
        <Input name="name" required />
      </div>
      <Input name="displayOrder" type="number" min="0" defaultValue="0" />
      <input type="hidden" name="status" value="ACTIVE" />
      <Button disabled={pending}>Save topic</Button>
    </form>
  );
}
export function QuestionForm({
  classes,
  subjects,
  chapters,
  topics,
  initialValue,
}: {
  classes: Option[];
  subjects: Option[];
  chapters: Option[];
  topics: Option[];
  initialValue?: QuestionInput;
}) {
  const [state, action, pending] = useActionState(saveQuestionAction, initial);
  const [classId, setClass] = useState(initialValue?.classId ?? "");
  const [subjectId, setSubject] = useState("");
  const [chapterId, setChapter] = useState("");
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <input type="hidden" name="id" value={initialValue?.id ?? ""} />
      <div className="grid gap-3 md:grid-cols-4">
        <select
          value={classId}
          onChange={(e) => {
            setClass(e.target.value);
            setSubject("");
            setChapter("");
          }}
          name="classId"
          className={selectClass}
          required
        >
          <option value="">Class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(e) => {
            setSubject(e.target.value);
            setChapter("");
          }}
          name="subjectId"
          className={selectClass}
          required
        >
          <option value="">Subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={chapterId}
          onChange={(e) => setChapter(e.target.value)}
          name="chapterId"
          className={selectClass}
          required
        >
          <option value="">Chapter</option>
          {chapters
            .filter(
              (item) =>
                item.classId === classId && item.subjectId === subjectId,
            )
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        <select
          key={chapterId}
          defaultValue={initialValue?.topicId ?? ""}
          name="topicId"
          className={selectClass}
        >
          <option value="">Any/no topic</option>
          {topics
            .filter((item) => item.chapterId === chapterId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <Label>Question</Label>
        <textarea
          name="questionText"
          defaultValue={initialValue?.questionText ?? ""}
          rows={4}
          className="mt-1 w-full rounded-lg border bg-white p-3 text-sm"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <select
          name="questionType"
          className={selectClass}
          defaultValue={initialValue?.questionType ?? "SHORT"}
        >
          {[
            "MCQ",
            "TRUE_FALSE",
            "FILL_IN_BLANK",
            "VERY_SHORT",
            "SHORT",
            "LONG",
            "NUMERICAL",
            "MATCHING",
            "CUSTOM",
          ].map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Input
          name="marks"
          defaultValue={initialValue?.marks ?? ""}
          type="number"
          min="0.1"
          step="0.1"
          placeholder="Marks"
          required
        />
        <select
          name="difficulty"
          className={selectClass}
          defaultValue={initialValue?.difficulty ?? "MEDIUM"}
        >
          {["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"].map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="cognitiveLevel"
          className={selectClass}
          defaultValue={initialValue?.cognitiveLevel ?? "UNDERSTANDING"}
        >
          {["KNOWLEDGE", "UNDERSTANDING", "APPLICATION", "HIGHER_ABILITY"].map(
            (item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          name="estimatedMinutes"
          defaultValue={initialValue?.estimatedMinutes ?? ""}
          type="number"
          min="1"
          placeholder="Estimated minutes"
        />
        <Input
          name="specificationGroup"
          defaultValue={initialValue?.specificationGroup ?? ""}
          placeholder="Specification group"
        />
        <Input
          name="curriculumCode"
          defaultValue={initialValue?.curriculumCode ?? ""}
          placeholder="Curriculum code"
        />
      </div>
      <Input
        name="learningOutcome"
        defaultValue={initialValue?.learningOutcome ?? ""}
        placeholder="Learning outcome"
      />
      <div>
        <Label>Answer</Label>
        <textarea
          name="answer"
          defaultValue={initialValue?.answer ?? ""}
          rows={2}
          className="mt-1 w-full rounded-lg border p-3 text-sm"
        />
      </div>
      <div>
        <Label>Solution / marking guidance</Label>
        <textarea
          name="solution"
          defaultValue={initialValue?.solution ?? ""}
          rows={3}
          className="mt-1 w-full rounded-lg border p-3 text-sm"
        />
      </div>
      <div>
        <Label>MCQ options: label|text|true-or-false</Label>
        <textarea
          name="options"
          defaultValue={
            initialValue?.options
              .map((option) =>
                [option.label, option.text, option.isCorrect].join("|"),
              )
              .join("\n") ?? ""
          }
          rows={4}
          className="mt-1 w-full rounded-lg border p-3 font-mono text-xs"
          placeholder={"A|First option|false\nB|Correct option|true"}
        />
      </div>
      <Button disabled={pending}>Save question draft</Button>
      {initialValue?.id && (
        <Link
          className="ml-4 text-sm underline"
          href="/dashboard/question-bank"
        >
          Finish editing
        </Link>
      )}
    </form>
  );
}

type Allocation = {
  chapterId: string;
  topicId: string;
  questionType: string;
  cognitiveLevel: string;
  difficulty: string;
  marksPerQuestion: number;
  questionCount: number;
};
const blankAllocation = (): Allocation => ({
  chapterId: "",
  topicId: "",
  questionType: "",
  cognitiveLevel: "",
  difficulty: "",
  marksPerQuestion: 1,
  questionCount: 1,
});
export function SpecificationGridForm({
  years,
  classes,
  subjects,
  examTypes,
  chapters,
  topics,
}: {
  years: Option[];
  classes: Option[];
  subjects: Option[];
  examTypes: Option[];
  chapters: Option[];
  topics: Option[];
}) {
  const [state, action, pending] = useActionState(
    saveSpecificationGridAction,
    initial,
  );
  const [rows, setRows] = useState<Allocation[]>([blankAllocation()]);
  const allocated = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          sum +
          Number(row.marksPerQuestion || 0) * Number(row.questionCount || 0),
        0,
      ),
    [rows],
  );
  const update = (
    index: number,
    field: keyof Allocation,
    value: string | number,
  ) =>
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <div className="grid gap-3 md:grid-cols-4">
        <select name="academicYearId" className={selectClass} required>
          <option value="">Academic year</option>
          {years.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="classId" className={selectClass} required>
          <option value="">Class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="subjectId" className={selectClass} required>
          <option value="">Subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="examTypeId" className={selectClass} required>
          <option value="">Exam type</option>
          {examTypes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="name" placeholder="Grid name" required />
        <Input
          name="fullMarks"
          type="number"
          min="1"
          placeholder="Required full marks"
          required
        />
        <Input
          name="durationMinutes"
          type="number"
          min="1"
          defaultValue="180"
          required
        />
      </div>
      <input type="hidden" name="allocations" value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-xl border bg-slate-50 p-3 md:grid-cols-4 xl:grid-cols-8"
          >
            <select
              value={row.chapterId}
              onChange={(event) =>
                update(index, "chapterId", event.target.value)
              }
              className={selectClass}
            >
              <option value="">Any chapter</option>
              {chapters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={row.topicId}
              onChange={(event) => update(index, "topicId", event.target.value)}
              className={selectClass}
            >
              <option value="">Any topic</option>
              {topics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={row.questionType}
              onChange={(event) =>
                update(index, "questionType", event.target.value)
              }
              className={selectClass}
            >
              <option value="">Any type</option>
              {[
                "MCQ",
                "TRUE_FALSE",
                "FILL_IN_BLANK",
                "VERY_SHORT",
                "SHORT",
                "LONG",
                "NUMERICAL",
                "MATCHING",
                "CUSTOM",
              ].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={row.cognitiveLevel}
              onChange={(event) =>
                update(index, "cognitiveLevel", event.target.value)
              }
              className={selectClass}
            >
              <option value="">Any cognitive</option>
              {[
                "KNOWLEDGE",
                "UNDERSTANDING",
                "APPLICATION",
                "HIGHER_ABILITY",
              ].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={row.difficulty}
              onChange={(event) =>
                update(index, "difficulty", event.target.value)
              }
              className={selectClass}
            >
              <option value="">Any difficulty</option>
              {["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"].map(
                (item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ),
              )}
            </select>
            <Input
              value={row.marksPerQuestion}
              onChange={(event) =>
                update(index, "marksPerQuestion", Number(event.target.value))
              }
              type="number"
              min="0.1"
              step="0.1"
              aria-label="Marks per question"
            />
            <Input
              value={row.questionCount}
              onChange={(event) =>
                update(index, "questionCount", Number(event.target.value))
              }
              type="number"
              min="1"
              aria-label="Question count"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setRows((current) =>
                  current.filter((_, rowIndex) => rowIndex !== index),
                )
              }
              disabled={rows.length === 1}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRows((current) => [...current, blankAllocation()])}
        >
          Add allocation
        </Button>
        <p className="font-semibold">Allocated: {allocated}</p>
      </div>
      <div className="flex gap-2">
        <Button name="intent" value="validate" disabled={pending}>
          Validate and save
        </Button>
        <Button
          name="intent"
          value="draft"
          variant="outline"
          disabled={pending}
        >
          Save draft
        </Button>
      </div>
    </form>
  );
}

export function PaperGeneratorForm({
  grids,
  exams,
}: {
  grids: Option[];
  exams: Option[];
}) {
  const [state, action, pending] = useActionState(
    generatePapersAction,
    initial,
  );
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="gridId" className={selectClass} required>
          <option value="">Valid specification grid</option>
          {grids.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="examId" className={selectClass}>
          <option value="">No linked exam</option>
          {exams.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <Input name="title" placeholder="Question paper title" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          name="passMarks"
          type="number"
          min="0"
          step="0.1"
          placeholder="Pass marks"
        />
        <Input name="instructions" placeholder="Instructions for students" />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">
          Generate equivalent sets
        </legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {["A", "B", "C", "D"].map((setCode) => (
            <label key={setCode} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="setCode"
                value={setCode}
                defaultChecked={setCode === "A"}
              />
              Set {setCode}
            </label>
          ))}
        </div>
      </fieldset>
      <Button disabled={pending}>Generate question papers</Button>
    </form>
  );
}
export function QuestionApproval({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    approveQuestionFormAction,
    initial,
  );
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Message state={state} />
      <Button size="sm" disabled={pending}>
        {pending ? "Approving…" : "Approve"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveExamAction,
  saveExamSubjectAction,
  saveExamTypeAction,
  saveGradingSchemeAction,
  type ExamActionState,
} from "@/modules/exams/actions";

type Option = { id: string; name: string };
const initial: ExamActionState = {};
const selectClass = "h-10 w-full rounded-lg border bg-white px-3 text-sm";
const defaultRules = `90|100|A+|4.0|Outstanding
80|89.99|A|3.6|Excellent
70|79.99|B+|3.2|Very good
60|69.99|B|2.8|Good
50|59.99|C+|2.4|Satisfactory
40|49.99|C|2.0|Acceptable
35|39.99|D|1.6|Basic
0|34.99|NG|0|Not graded`;

function Message({ state }: { state: ExamActionState }) {
  return <FormFeedback state={state} />;
}

export function ExamTypeForm() {
  const [state, action, pending] = useActionState(saveExamTypeAction, initial);
  return (
    <form action={action} className="space-y-3">
      <Message state={state} />
      <div>
        <Label>Name</Label>
        <Input name="name" placeholder="First Terminal" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Code</Label>
          <Input name="code" placeholder="FIRST_TERM" required />
        </div>
        <div>
          <Label>Weight (%)</Label>
          <Input
            name="weight"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue="100"
            required
          />
        </div>
      </div>
      <input type="hidden" name="status" value="ACTIVE" />
      <Button disabled={pending}>Save exam type</Button>
    </form>
  );
}

export function GradingSchemeForm() {
  const [state, action, pending] = useActionState(
    saveGradingSchemeAction,
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <Message state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input
            name="name"
            defaultValue="Nepal configurable grading"
            required
          />
        </div>
        <div>
          <Label>Code</Label>
          <Input name="code" defaultValue="NEPAL_GPA" required />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Input
          name="description"
          defaultValue="Editable school grading scheme; verify against the current applicable standard."
        />
      </div>
      <div>
        <Label>Rules: min|max|grade|point|description</Label>
        <textarea
          name="rules"
          rows={9}
          defaultValue={defaultRules}
          className="mt-1 w-full rounded-lg border bg-white p-3 font-mono text-xs"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked />
        Use as default grading scheme
      </label>
      <Button disabled={pending}>Save grading scheme</Button>
    </form>
  );
}

export function ExamForm({
  years,
  types,
  schemes,
}: {
  years: Option[];
  types: Option[];
  schemes: Option[];
}) {
  const [state, action, pending] = useActionState(saveExamAction, initial);
  return (
    <form action={action} className="space-y-3">
      <Message state={state} />
      <div>
        <Label>Exam name</Label>
        <Input name="name" placeholder="Final Examination 2083" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Academic year</Label>
          <select name="academicYearId" className={selectClass} required>
            <option value="">Select</option>
            {years.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Exam type</Label>
          <select name="examTypeId" className={selectClass} required>
            <option value="">Select</option>
            {types.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Grading scheme</Label>
          <select name="gradingSchemeId" className={selectClass}>
            <option value="">School default</option>
            {schemes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Start date</Label>
          <Input name="startDate" type="date" required />
        </div>
        <div>
          <Label>End date</Label>
          <Input name="endDate" type="date" required />
        </div>
        <div>
          <Label>Publish date</Label>
          <Input name="resultPublishDate" type="date" />
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <select name="status" defaultValue="DRAFT" className={selectClass}>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="MARK_ENTRY">Mark entry</option>
          <option value="VERIFICATION">Verification</option>
        </select>
      </div>
      <div>
        <Label>Remarks</Label>
        <Input name="remarks" />
      </div>
      <Button disabled={pending}>Save exam</Button>
    </form>
  );
}

export function ExamSubjectForm({
  exams,
  classes,
  subjects,
  links,
}: {
  exams: (Option & { academicYearId: string })[];
  classes: Option[];
  subjects: Option[];
  links: {
    academicYearId: string;
    classId: string;
    subjectId: string;
    theoryMarks: number;
    practicalMarks: number;
    internalMarks: number;
    creditHour: number | null;
  }[];
}) {
  const [state, action, pending] = useActionState(
    saveExamSubjectAction,
    initial,
  );
  const [examId, setExam] = useState("");
  const [classId, setClass] = useState("");
  const [subjectId, setSubject] = useState("");
  const yearId = exams.find((exam) => exam.id === examId)?.academicYearId;
  const available = links.filter(
    (link) => link.academicYearId === yearId && link.classId === classId,
  );
  const selected = available.find((link) => link.subjectId === subjectId);
  return (
    <form action={action} className="space-y-3">
      <Message state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          value={examId}
          onChange={(event) => {
            setExam(event.target.value);
            setClass("");
            setSubject("");
          }}
          name="examId"
          className={selectClass}
          required
        >
          <option value="">Exam</option>
          {exams.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={classId}
          onChange={(event) => {
            setClass(event.target.value);
            setSubject("");
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
          onChange={(event) => setSubject(event.target.value)}
          name="subjectId"
          className={selectClass}
          required
        >
          <option value="">Subject</option>
          {subjects
            .filter((item) =>
              available.some((link) => link.subjectId === item.id),
            )
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </div>
      <div
        key={`${examId}:${classId}:${subjectId}`}
        className="grid gap-3 sm:grid-cols-4"
      >
        <div>
          <Label>Theory</Label>
          <Input
            name="theoryFullMarks"
            type="number"
            min="0"
            step="0.01"
            defaultValue={selected?.theoryMarks ?? 0}
            required
          />
        </div>
        <div>
          <Label>Practical</Label>
          <Input
            name="practicalFullMarks"
            type="number"
            min="0"
            step="0.01"
            defaultValue={selected?.practicalMarks ?? 0}
            required
          />
        </div>
        <div>
          <Label>Internal</Label>
          <Input
            name="internalFullMarks"
            type="number"
            min="0"
            step="0.01"
            defaultValue={selected?.internalMarks ?? 0}
            required
          />
        </div>
        <div>
          <Label>Pass marks</Label>
          <Input
            name="passMarks"
            type="number"
            min="0"
            step="0.01"
            placeholder="Overall minimum"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label>Credit hour</Label>
          <Input
            name="creditHour"
            type="number"
            min="0.1"
            step="0.1"
            defaultValue={selected?.creditHour ?? 1}
            required
          />
        </div>
        <div>
          <Label>Exam date</Label>
          <Input name="examDate" type="date" />
        </div>
        <div>
          <Label>Start time</Label>
          <Input name="startTime" type="time" />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            name="durationMinutes"
            type="number"
            min="1"
            defaultValue="180"
          />
        </div>
      </div>
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-semibold">
          Component pass marks (optional)
        </legend>
        <p className="text-xs text-slate-500">
          Enter the thresholds required by this grade, curriculum and exam.
          These are separate from the overall pass marks.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["theory", "practical", "internal"].map((component) => (
            <label key={component} className="text-sm capitalize">
              {component} pass
              <Input
                name={component + "PassMarks"}
                type="number"
                min="0"
                step="0.01"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <Button disabled={pending}>Configure subject</Button>
    </form>
  );
}

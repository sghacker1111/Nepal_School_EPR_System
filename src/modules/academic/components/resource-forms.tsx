"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveAcademicYearAction,
  saveClassAction,
  saveClassSubjectAction,
  saveSectionAction,
  saveSubjectAction,
  type ResourceActionState,
} from "@/modules/academic/actions";

type Option = { id: string; name: string };
const initialState: ResourceActionState = {};
const inputClass =
  "flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

function FieldError({
  state,
  name,
}: {
  state: ResourceActionState;
  name: string;
}) {
  const message = state.fieldErrors?.[name]?.[0];
  return message ? (
    <p className="mt-1 text-xs font-medium text-red-700">{message}</p>
  ) : null;
}

function FormMessages({ state }: { state: ResourceActionState }) {
  return <FormFeedback state={state} />;
}

function Actions({ editing }: { editing: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Button type="submit">{editing ? "Save changes" : "Create"}</Button>
      {editing && (
        <Button asChild variant="outline">
          <Link href={pathname}>Cancel edit</Link>
        </Button>
      )}
    </div>
  );
}

function useRefreshOnSuccess(state: ResourceActionState) {
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
}

export function AcademicYearForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveAcademicYearAction,
    initialState,
  );
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />
      <div>
        <Label htmlFor="name">Academic year name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          placeholder="2083 or 2083/84"
          required
        />
        <FieldError state={state} name="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={initial?.startDate}
            required
          />
          <FieldError state={state} name="startDate" />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={initial?.endDate}
            required
          />
          <FieldError state={state} name="endDate" />
        </div>
      </div>
      <div>
        <Label htmlFor="academicStatus">Status</Label>
        <select
          id="academicStatus"
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          className={inputClass}
        >
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3 text-sm">
        <input
          className="mt-1 size-4"
          type="checkbox"
          name="isCurrent"
          defaultChecked={initial?.isCurrent}
        />
        <span>
          <strong className="block text-slate-800">
            Current academic year
          </strong>
          <span className="text-slate-500">
            Selecting this automatically unsets the previous current year.
          </span>
        </span>
      </label>
      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : initial
            ? "Save changes"
            : "Create academic year"}
      </Button>
      {initial && (
        <Button asChild variant="outline" className="ml-2">
          <Link href="/dashboard/academic-years">Cancel</Link>
        </Button>
      )}
    </form>
  );
}

export function ClassForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    numericLevel: number | null;
    displayOrder: number;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveClassAction,
    initialState,
  );
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />
      <div>
        <Label htmlFor="className">Class name</Label>
        <Input
          id="className"
          name="name"
          defaultValue={initial?.name}
          placeholder="Class 8"
          required
        />
        <FieldError state={state} name="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="numericLevel">Numeric level</Label>
          <Input
            id="numericLevel"
            name="numericLevel"
            type="number"
            min="-2"
            max="20"
            defaultValue={initial?.numericLevel ?? ""}
            placeholder="8"
          />
          <FieldError state={state} name="numericLevel" />
        </div>
        <div>
          <Label htmlFor="classOrder">Display order</Label>
          <Input
            id="classOrder"
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={initial?.displayOrder ?? 0}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="classStatus">Status</Label>
        <select
          id="classStatus"
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          className={inputClass}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <Actions editing={Boolean(initial)} />
      {pending && <p className="text-xs text-slate-500">Saving…</p>}
    </form>
  );
}

export function SectionForm({
  classes,
  initial,
}: {
  classes: Option[];
  initial?: {
    id: string;
    classId: string;
    name: string;
    capacity: number | null;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveSectionAction,
    initialState,
  );
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />
      <div>
        <Label htmlFor="sectionClass">Class</Label>
        <select
          id="sectionClass"
          name="classId"
          defaultValue={initial?.classId ?? ""}
          className={inputClass}
          required
        >
          <option value="" disabled>
            Select class
          </option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <FieldError state={state} name="classId" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sectionName">Section name</Label>
          <Input
            id="sectionName"
            name="name"
            defaultValue={initial?.name}
            placeholder="A"
            required
          />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            max="500"
            defaultValue={initial?.capacity ?? ""}
            placeholder="40"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="sectionStatus">Status</Label>
        <select
          id="sectionStatus"
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          className={inputClass}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <Actions editing={Boolean(initial)} />
      {pending && <p className="text-xs text-slate-500">Saving…</p>}
    </form>
  );
}

export function SubjectForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    code: string;
    shortName: string | null;
    subjectType: string;
    theoryFullMarks: number;
    practicalFullMarks: number;
    internalFullMarks?: number;
    passMarks: number | null;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveSubjectAction,
    initialState,
  );
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="subjectName">Subject name</Label>
          <Input
            id="subjectName"
            name="name"
            defaultValue={initial?.name}
            placeholder="Mathematics"
            required
          />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <Label htmlFor="subjectCode">Code</Label>
          <Input
            id="subjectCode"
            name="code"
            defaultValue={initial?.code}
            placeholder="MATH"
            required
          />
          <FieldError state={state} name="code" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="shortName">Short name</Label>
          <Input
            id="shortName"
            name="shortName"
            defaultValue={initial?.shortName ?? ""}
            placeholder="Math"
          />
        </div>
        <div>
          <Label htmlFor="subjectType">Subject type</Label>
          <select
            id="subjectType"
            name="subjectType"
            defaultValue={initial?.subjectType ?? "THEORY"}
            className={inputClass}
          >
            <option value="THEORY">Theory</option>
            <option value="PRACTICAL">Practical</option>
            <option value="MIXED">Mixed</option>
            <option value="OPTIONAL">Optional</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="theoryMarks">Theory full marks</Label>
          <Input
            id="theoryMarks"
            name="theoryFullMarks"
            type="number"
            min="0"
            defaultValue={initial?.theoryFullMarks ?? 100}
            required
          />
        </div>
        <div>
          <Label htmlFor="practicalMarks">Practical full marks</Label>
          <Input
            id="practicalMarks"
            name="practicalFullMarks"
            type="number"
            min="0"
            defaultValue={initial?.practicalFullMarks ?? 0}
            required
          />
        </div>
        <div>
          <Label htmlFor="subjectPassMarks">Pass marks</Label>
          <Input
            id="subjectPassMarks"
            name="passMarks"
            type="number"
            min="0"
            defaultValue={initial?.passMarks ?? ""}
          />
        </div>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Internal full marks
        <Input
          name="internalFullMarks"
          type="number"
          min="0"
          max="1000"
          defaultValue={initial?.internalFullMarks ?? 0}
          required
        />
      </label>
      <div>
        <Label htmlFor="subjectStatus">Status</Label>
        <select
          id="subjectStatus"
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          className={inputClass}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <Actions editing={Boolean(initial)} />
      {pending && <p className="text-xs text-slate-500">Saving…</p>}
    </form>
  );
}

export function ClassSubjectForm({
  years,
  classes,
  subjects,
  initial,
}: {
  years: Option[];
  classes: Option[];
  subjects: Option[];
  initial?: {
    id: string;
    isOptional?: boolean;
    academicYearId: string;
    classId: string;
    subjectId: string;
    fullMarks: number;
    theoryMarks: number;
    practicalMarks: number;
    internalMarks?: number;
    passMarks: number | null;
    creditHour: number | null;
    displayOrder: number;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveClassSubjectAction,
    initialState,
  );
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="assignmentYear">Academic year</Label>
          <select
            id="assignmentYear"
            name="academicYearId"
            defaultValue={initial?.academicYearId ?? ""}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select year
            </option>
            {years.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="assignmentClass">Class</Label>
          <select
            id="assignmentClass"
            name="classId"
            defaultValue={initial?.classId ?? ""}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select class
            </option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="assignmentSubject">Subject</Label>
          <select
            id="assignmentSubject"
            name="subjectId"
            defaultValue={initial?.subjectId ?? ""}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select subject
            </option>
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="fullMarks">Full marks</Label>
          <Input
            id="fullMarks"
            name="fullMarks"
            type="number"
            min="1"
            defaultValue={initial?.fullMarks ?? 100}
            required
          />
        </div>
        <div>
          <Label htmlFor="theoryAssigned">Theory</Label>
          <Input
            id="theoryAssigned"
            name="theoryMarks"
            type="number"
            min="0"
            defaultValue={initial?.theoryMarks ?? 100}
            required
          />
        </div>
        <div>
          <Label htmlFor="practicalAssigned">Practical</Label>
          <Input
            id="practicalAssigned"
            name="practicalMarks"
            type="number"
            min="0"
            defaultValue={initial?.practicalMarks ?? 0}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="assignedPass">Pass marks</Label>
          <Input
            id="assignedPass"
            name="passMarks"
            type="number"
            min="0"
            defaultValue={initial?.passMarks ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="creditHour">Credit hour</Label>
          <Input
            id="creditHour"
            name="creditHour"
            type="number"
            min="0"
            step="0.1"
            defaultValue={initial?.creditHour ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="assignmentOrder">Display order</Label>
          <Input
            id="assignmentOrder"
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={initial?.displayOrder ?? 0}
            required
          />
        </div>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Internal assessment marks
        <Input
          name="internalMarks"
          type="number"
          min="0"
          max="1000"
          defaultValue={initial?.internalMarks ?? 0}
          required
        />
      </label>
      <div>
        <Label htmlFor="assignmentStatus">Status</Label>
        <select
          id="assignmentStatus"
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          className={inputClass}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          className="mt-1"
          type="checkbox"
          name="isOptional"
          defaultChecked={initial?.isOptional ?? false}
        />
        <span>
          Optional subject — only selected students enter marks. Set each
          student’s choices in their enrollment profile.
        </span>
      </label>
      <Actions editing={Boolean(initial)} />
      {pending && <p className="text-xs text-slate-500">Saving…</p>}
    </form>
  );
}

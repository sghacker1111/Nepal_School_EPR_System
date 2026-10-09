"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/forms/form-feedback";
import {
  AcademicPicker,
  type ClassSubjectOption,
} from "@/components/forms/academic-picker";
import { saveTeacherAssignmentAction } from "@/modules/teachers/actions";
type Option = { id: string; name: string };
export function AssignmentForm({
  years,
  teachers,
  classes,
  sections,
  subjects,
  links,
  initial,
}: {
  years: Option[];
  teachers: Option[];
  classes: Option[];
  sections: (Option & { classId: string })[];
  subjects: Option[];
  links: ClassSubjectOption[];
  initial?: {
    id: string;
    academicYearId: string;
    teacherId: string;
    classId: string;
    sectionId: string | null;
    subjectId: string;
    isClassTeacher: boolean;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveTeacherAssignmentAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="block space-y-1 text-sm font-medium">
        Teacher
        <select
          name="teacherId"
          defaultValue={initial?.teacherId ?? ""}
          className="h-10 w-full rounded-lg border bg-white px-3"
          required
        >
          <option value="">Select teacher</option>
          {teachers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <AcademicPicker
        years={years}
        classes={classes}
        sections={sections}
        subjects={subjects}
        links={links}
        initial={initial}
        optionalSection
      />
      <label className="block space-y-1 text-sm font-medium">
        Status
        <select
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          className="h-10 w-full rounded-lg border bg-white px-3"
        >
          {["ACTIVE", "INACTIVE", "ARCHIVED"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          name="isClassTeacher"
          defaultChecked={initial?.isClassTeacher}
        />
        Class teacher for this group
      </label>
      <Button disabled={pending}>
        {pending ? "Saving…" : initial ? "Save assignment" : "Assign teacher"}
      </Button>
    </form>
  );
}

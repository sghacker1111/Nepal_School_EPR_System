"use client";
import { useActionState } from "react";
import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { saveOptionalSubjectsAction } from "@/modules/students/actions";

export function OptionalSubjectsForm({
  enrollmentId,
  options,
  selected,
}: {
  enrollmentId: string;
  options: { id: string; name: string }[];
  selected: string[];
}) {
  const [state, action, pending] = useActionState(
    saveOptionalSubjectsAction,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <FormFeedback state={state} />
      <p className="text-sm text-slate-600">
        Choose the subjects this student actually studies. Compulsory subjects
        are included automatically. Confirm the choices against the applicable
        CDC curriculum; grades 9–10 normally require two optional subjects.
        Choices are frozen once marks exist.
      </p>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="subjectId"
              value={option.id}
              defaultChecked={selected.includes(option.id)}
            />
            {option.name}
          </label>
        ))}
      </div>
      <Button disabled={pending}>
        {pending ? "Saving…" : "Save subject choices"}
      </Button>
    </form>
  );
}

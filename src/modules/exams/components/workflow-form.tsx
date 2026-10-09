"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/form-feedback";
import { examWorkflowAction } from "../actions";

export function ExamWorkflowForm({
  id,
  intent,
  label,
}: {
  id: string;
  intent: "submit" | "verify" | "approve" | "unlock" | "calculate" | "publish";
  label: string;
}) {
  const [state, action, pending] = useActionState(examWorkflowAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <FormFeedback state={state} />
      {intent === "unlock" && (
        <Input
          name="reason"
          aria-label="Reason for unlocking"
          placeholder="Reason for correction (at least 10 characters)"
          minLength={10}
          required
        />
      )}
      <Button
        disabled={pending}
        variant={intent === "unlock" ? "destructive" : "outline"}
      >
        {pending ? "Working…" : label}
      </Button>
    </form>
  );
}

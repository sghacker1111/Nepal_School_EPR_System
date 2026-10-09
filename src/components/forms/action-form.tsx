"use client";

import { useActionState, type ReactNode } from "react";
import { FormFeedback } from "./form-feedback";

type ActionState = { error?: string; success?: string };

export function ActionForm({
  action,
  children,
  confirmation,
}: {
  action: (previous: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  confirmation?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="space-y-2"
      aria-busy={pending}
      onSubmit={(event) => {
        if (confirmation && !window.confirm(confirmation))
          event.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="disabled:opacity-60">
        {children}
      </fieldset>
      <FormFeedback state={state} />
    </form>
  );
}

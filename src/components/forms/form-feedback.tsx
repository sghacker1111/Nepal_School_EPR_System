import { Alert } from "@/components/ui/alert";

export function FormFeedback({
  state,
}: {
  state: {
    error?: string;
    success?: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
}) {
  const errors = Object.entries(state.fieldErrors ?? {}).filter(
    ([, messages]) => messages?.length,
  );
  return (
    <div aria-live="polite" className="space-y-2">
      {(state.error || errors.length > 0) && (
        <Alert>
          <p>{state.error ?? "Check these fields."}</p>
          {errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {errors.map(([field, messages]) => (
                <li key={field}>
                  <strong>{field.replace(/([A-Z])/g, " $1")}: </strong>
                  {messages?.join(" ")}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
    </div>
  );
}

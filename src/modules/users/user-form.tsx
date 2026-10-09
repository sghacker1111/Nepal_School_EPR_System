"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/form-feedback";
import { saveManagedUserAction } from "./actions";
import { managedRoleCodes } from "./validation";

export function UserForm({
  initial,
}: {
  initial?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string | null;
    status: string;
    role: string;
  };
}) {
  const [state, action, pending] = useActionState(saveManagedUserAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["firstName", "First name"],
            ["lastName", "Last name"],
            ["username", "Username"],
            ["email", "Email (optional)"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="space-y-1 text-sm font-medium">
            {label}
            <Input
              name={name}
              defaultValue={initial?.[name] ?? ""}
              type={name === "email" ? "email" : "text"}
              required={name !== "email"}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Role
        <select
          name="role"
          className="h-10 w-full rounded-lg border bg-white px-3"
          defaultValue={initial?.role ?? "EXAM_COORDINATOR"}
        >
          {managedRoleCodes
            .filter(
              (role) =>
                initial || ["SCHOOL_ADMIN", "EXAM_COORDINATOR"].includes(role),
            )
            .map((role) => (
              <option key={role} value={role}>
                {role.replaceAll("_", " ")}
              </option>
            ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Login status
        <select
          name="status"
          className="h-10 w-full rounded-lg border bg-white px-3"
          defaultValue={
            initial?.status === "ACTIVE"
              ? "ACTIVE"
              : initial
                ? "INACTIVE"
                : "ACTIVE"
          }
        >
          {["ACTIVE", "INACTIVE", "SUSPENDED"].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm font-medium">
        {initial
          ? "Reset password (leave blank to keep)"
          : "Temporary password"}
        <Input
          name="temporaryPassword"
          type="password"
          minLength={8}
          maxLength={128}
          required={!initial}
          autoComplete="new-password"
        />
      </label>
      <p className="text-xs text-slate-500">
        Use uppercase, lowercase, a number and a symbol. Teacher and student
        logins must be created from their linked profiles.
      </p>
      <div className="flex gap-2">
        <Button disabled={pending}>
          {pending
            ? "Saving…"
            : initial
              ? "Save access changes"
              : "Create account"}
        </Button>
        {initial && (
          <Button asChild variant="outline">
            <Link href="/dashboard/users">Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

"use client";

import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  type AuthActionState,
} from "@/modules/auth/actions";

const initialState: AuthActionState = {};
const requirements = [
  "8 or more characters",
  "Uppercase and lowercase",
  "At least one number",
  "At least one special character",
];

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Password requirements
        </p>
        <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          {requirements.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-11"
            required
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {state.fieldErrors?.newPassword?.map((message) => (
          <p key={message} className="text-xs text-red-700">
            {message}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.confirmPassword?.map((message) => (
          <p key={message} className="text-xs text-red-700">
            {message}
          </p>
        ))}
      </div>
      <SubmitButton pendingText="Securing account…">
        Change password and continue
      </SubmitButton>
    </form>
  );
}

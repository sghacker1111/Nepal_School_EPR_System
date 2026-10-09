"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  superAdminLoginAction,
  type AuthActionState,
} from "@/modules/auth/actions";

const initialState: AuthActionState = {};

export function SuperAdminLoginForm() {
  const [state, action] = useActionState(superAdminLoginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <div className="space-y-2">
        <Label htmlFor="identity">Email or username</Label>
        <Input
          id="identity"
          name="identity"
          autoComplete="username"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 text-slate-500"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
      <SubmitButton pendingText="Verifying…">
        Open platform console
      </SubmitButton>
    </form>
  );
}

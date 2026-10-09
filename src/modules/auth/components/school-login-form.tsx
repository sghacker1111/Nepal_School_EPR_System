"use client";

import { Eye, EyeOff, School } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  schoolLoginAction,
  type AuthActionState,
} from "@/modules/auth/actions";

const initialState: AuthActionState = {};

export function SchoolLoginForm() {
  const [state, action] = useActionState(schoolLoginAction, initialState);
  const [schoolCode, setSchoolCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setSchoolCode(window.localStorage.getItem("nepal-erp-school-code") ?? "");
    });
  }, []);

  function rememberCode(formData: FormData) {
    if (formData.get("rememberSchool") === "on") {
      window.localStorage.setItem(
        "nepal-erp-school-code",
        schoolCode.trim().toUpperCase(),
      );
    } else {
      window.localStorage.removeItem("nepal-erp-school-code");
    }
    action(formData);
  }

  return (
    <form action={rememberCode} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      <div className="space-y-2">
        <Label htmlFor="schoolCode">School code</Label>
        <div className="relative">
          <School className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
          <Input
            id="schoolCode"
            name="schoolCode"
            value={schoolCode}
            onChange={(event) =>
              setSchoolCode(event.target.value.toUpperCase())
            }
            className="pl-9 uppercase"
            placeholder="e.g. MIDAS001"
            autoComplete="organization"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="identity">Username or email</Label>
        <Input
          id="identity"
          name="identity"
          autoComplete="username"
          placeholder="Your school account"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
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
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          name="rememberSchool"
          type="checkbox"
          className="size-4 rounded border-slate-300 accent-emerald-700"
        />
        Remember school code on this device
      </label>
      <SubmitButton pendingText="Signing in…">Sign in to school</SubmitButton>
    </form>
  );
}

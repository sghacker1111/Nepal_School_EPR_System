"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Clipboard, KeyRound, RefreshCw, X } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateStrongPassword } from "@/modules/auth/password-policy";
import {
  resetSchoolAdminPasswordAction,
  type SchoolActionState,
} from "@/modules/schools/actions";

export function SchoolAdminPasswordReset({
  schoolId,
  userId,
  username,
}: {
  schoolId: string;
  userId: string;
  username: string;
}) {
  const [state, action] = useActionState(
    resetSchoolAdminPasswordAction,
    {} as SchoolActionState,
  );
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function generate() {
    const generated = generateStrongPassword();
    setPassword(generated);
    setConfirmPassword(generated);
  }

  async function copy() {
    if (!state.credentials) return;
    await navigator.clipboard.writeText(
      `Admin Username: ${state.credentials.adminUsername}\nTemporary Password: ${state.credentials.temporaryPassword}\nPassword change is required at next login.`,
    );
    toast.success("Temporary credentials copied.");
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound />
          Reset password
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold">
            Reset {username}&apos;s password
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-600">
            All existing sessions will be revoked. The new temporary password is
            visible once.
          </Dialog.Description>
          {state.credentials ? (
            <div className="mt-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">
                  New temporary password
                </p>
                <p className="mt-1 break-all font-mono font-bold text-emerald-950">
                  {state.credentials.temporaryPassword}
                </p>
              </div>
              <Button onClick={copy} type="button" className="mt-4 w-full">
                <Clipboard />
                Copy credentials
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" className="mt-2 w-full">
                  Done
                </Button>
              </Dialog.Close>
            </div>
          ) : (
            <form action={action} className="mt-5 space-y-4">
              {state.error && <Alert>{state.error}</Alert>}
              <input type="hidden" name="schoolId" value={schoolId} />
              <input type="hidden" name="userId" value={userId} />
              <div className="space-y-2">
                <Label htmlFor={`password-${userId}`}>Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    id={`password-${userId}`}
                    name="temporaryPassword"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generate}
                  >
                    <RefreshCw />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`confirm-${userId}`}>Confirm password</Label>
                <Input
                  id={`confirm-${userId}`}
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <SubmitButton pendingText="Resetting securely…">
                Confirm password reset
              </SubmitButton>
            </form>
          )}
          <Dialog.Close
            className="absolute right-4 top-4 rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

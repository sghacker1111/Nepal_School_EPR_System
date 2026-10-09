import type { Metadata } from "next";
import { KeyRound } from "lucide-react";

import { requireAuthenticatedUser } from "@/modules/auth/session";
import { ChangePasswordForm } from "@/modules/auth/components/change-password-form";

export const metadata: Metadata = { title: "Change temporary password" };

export default async function ChangePasswordPage() {
  const session = await requireAuthenticatedUser({ allowPasswordChange: true });
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <KeyRound />
        </div>
        <p className="mb-2 text-sm font-semibold text-amber-700">
          Required security step
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
          Create your private password
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Hello {session.user.firstName}. Replace the temporary password before
          accessing the dashboard.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}

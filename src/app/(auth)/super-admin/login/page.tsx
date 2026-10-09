import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { SuperAdminLoginForm } from "@/modules/auth/components/super-admin-login-form";

export const metadata: Metadata = { title: "Super Admin sign in" };

export default function SuperAdminLoginPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
          <ShieldCheck />
        </div>
        <p className="mb-2 text-sm font-semibold text-emerald-700">
          Restricted platform access
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
          Super Admin
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Manage schools, administrator access, and platform-wide security.
        </p>
      </div>
      <SuperAdminLoginForm />
      <div className="mt-7 border-t pt-6 text-center text-sm text-slate-600">
        School user?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 hover:underline"
        >
          Return to school sign in
        </Link>
      </div>
    </div>
  );
}

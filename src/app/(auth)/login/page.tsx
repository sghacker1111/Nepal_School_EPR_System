import type { Metadata } from "next";
import Link from "next/link";

import { SchoolLoginForm } from "@/modules/auth/components/school-login-form";

export const metadata: Metadata = { title: "School sign in" };

export default function SchoolLoginPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold text-emerald-700">
          School portal
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
          Welcome back
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the code supplied by your school and your personal account
          details.
        </p>
      </div>
      <SchoolLoginForm />
      <div className="mt-7 border-t pt-6 text-center text-sm text-slate-600">
        Platform owner?{" "}
        <Link
          href="/super-admin/login"
          className="font-semibold text-emerald-700 hover:underline"
        >
          Super Admin sign in
        </Link>
      </div>
    </div>
  );
}

import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/modules/auth/session";

export default async function AccessDeniedPage() {
  const session = await getCurrentSession();
  const returnTo = session?.isSuperAdmin
    ? "/super-admin"
    : session
      ? "/dashboard"
      : "/login";
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-100 text-red-700">
          <ShieldX className="size-8" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-red-700">
          403 · Access denied
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          This area is not available to your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your session is valid, but the required role, permission, or tenant
          context is missing.
        </p>
        <Button asChild className="mt-7">
          <Link href={returnTo}>
            <ArrowLeft />
            Return to your workspace
          </Link>
        </Button>
      </div>
    </main>
  );
}

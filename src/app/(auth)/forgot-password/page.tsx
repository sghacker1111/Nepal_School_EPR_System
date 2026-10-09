import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-6 grid size-12 place-items-center rounded-xl bg-blue-100 text-blue-700">
        <LifeBuoy />
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-slate-950">
        Password help
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Contact your School Administrator to reset a teacher or student account.
        School Administrators should contact the platform Super Admin. For
        security, existing passwords cannot be retrieved.
      </p>
      <Button asChild className="mt-7 w-full">
        <Link href="/login">Return to sign in</Link>
      </Button>
    </div>
  );
}

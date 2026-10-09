import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <SearchX className="mx-auto size-12 text-slate-300" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-emerald-700">
          404 · Not found
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          We could not find that page
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          The record may be unavailable, archived, or outside your authorized
          school context.
        </p>
        <Button asChild className="mt-7">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </main>
  );
}

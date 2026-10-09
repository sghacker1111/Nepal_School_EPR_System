"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-12 text-amber-500" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-amber-700">
          Something went wrong
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          The request could not be completed
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          No sensitive technical details are shown. Try the request again or
          contact your administrator.
        </p>
        <Button onClick={reset} className="mt-7">
          <RefreshCw />
          Try again
        </Button>
      </div>
    </main>
  );
}

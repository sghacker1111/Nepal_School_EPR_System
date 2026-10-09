import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span>
          <span className="block text-sm font-bold tracking-tight text-slate-900">
            Nepal School ERP
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
            Secure school operations
          </span>
        </span>
      )}
    </div>
  );
}

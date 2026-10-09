import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "emerald",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "emerald" | "blue" | "amber" | "slate";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span
          className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

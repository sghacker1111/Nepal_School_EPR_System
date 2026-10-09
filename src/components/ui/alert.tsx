import type * as React from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800",
        className,
      )}
      {...props}
    />
  );
}

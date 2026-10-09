"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode;
  pendingText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {pending ? pendingText : children}
    </Button>
  );
}

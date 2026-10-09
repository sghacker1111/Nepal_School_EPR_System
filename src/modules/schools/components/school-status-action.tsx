"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Archive, CircleCheckBig, PauseCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setSchoolStatusAction } from "@/modules/schools/actions";

const details = {
  ACTIVE: {
    label: "Activate",
    title: "Activate this school?",
    body: "Active school users will be allowed to sign in.",
    icon: CircleCheckBig,
    variant: "default" as const,
  },
  TRIAL: {
    label: "Restore to trial",
    title: "Restore this school to trial?",
    body: "The archived school will be restored and school users can sign in during the trial.",
    icon: CircleCheckBig,
    variant: "outline" as const,
  },
  SUSPENDED: {
    label: "Suspend",
    title: "Suspend this school?",
    body: "Every active school-user session will be revoked and new school logins will be denied.",
    icon: PauseCircle,
    variant: "outline" as const,
  },
  ARCHIVED: {
    label: "Archive",
    title: "Archive this school?",
    body: "The school remains retained, but every school-user session will be revoked and access denied.",
    icon: Archive,
    variant: "destructive" as const,
  },
};

export function SchoolStatusAction({
  schoolId,
  status,
}: {
  schoolId: string;
  status: keyof typeof details;
}) {
  const detail = details[status];
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant={detail.variant}>
          <detail.icon />
          {detail.label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-slate-950">
            {detail.title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
            {detail.body}
          </Dialog.Description>
          <form
            action={setSchoolStatusAction}
            className="mt-6 flex justify-end gap-2"
          >
            <input type="hidden" name="schoolId" value={schoolId} />
            <input type="hidden" name="status" value={status} />
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" variant={detail.variant}>
              Confirm {detail.label.toLowerCase()}
            </Button>
          </form>
          <Dialog.Close
            className="absolute right-4 top-4 rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createNotificationAction,
  type NotificationActionState,
} from "@/modules/notifications/actions";

const selectClass = "h-10 w-full rounded-lg border bg-white px-3 text-sm";
export function NotificationForm() {
  const [state, action, pending] = useActionState<
    NotificationActionState,
    FormData
  >(createNotificationAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Type</Label>
          <select name="type" className={selectClass} defaultValue="GENERAL">
            {[
              "GENERAL",
              "ATTENDANCE",
              "EXAM",
              "RESULT",
              "SECURITY",
              "SYSTEM",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Recipients</Label>
          <select name="target" className={selectClass} defaultValue="ALL">
            <option value="ALL">Everyone</option>
            <option value="STUDENTS">Students</option>
            <option value="TEACHERS">Teachers</option>
            <option value="ADMINS">School administrators</option>
          </select>
        </div>
        <div>
          <Label>Expires</Label>
          <Input name="expiresAt" type="date" />
        </div>
      </div>
      <div>
        <Label>Title</Label>
        <Input name="title" required />
      </div>
      <div>
        <Label>Message</Label>
        <textarea
          name="body"
          rows={4}
          className="mt-1 w-full rounded-lg border bg-white p-3 text-sm"
          required
        />
      </div>
      <div>
        <Label>Internal link</Label>
        <Input name="link" placeholder="/dashboard/exams" />
      </div>
      <Button disabled={pending}>Send notification</Button>
    </form>
  );
}

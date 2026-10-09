"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSchoolSettingsAction } from "@/modules/schools/actions";

type Settings = {
  calendarPreference: "BS" | "AD" | "BOTH";
  defaultAcademicYear: string | null;
  defaultLanguage: string;
  timeZone: string;
  currency: string;
  attendanceEnabled: boolean;
  examinationEnabled: boolean;
  questionBankEnabled: boolean;
};

export function SchoolSettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(updateSchoolSettingsAction, {});
  return (
    <form action={action} className="space-y-6">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Academic defaults</CardTitle>
          <CardDescription>
            These defaults prepare later academic and reporting modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="calendarPreference">Calendar preference</Label>
            <select
              id="calendarPreference"
              name="calendarPreference"
              defaultValue={settings.calendarPreference}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="BOTH">BS and AD</option>
              <option value="BS">Bikram Sambat</option>
              <option value="AD">Gregorian (AD)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultAcademicYear">Default academic year</Label>
            <Input
              id="defaultAcademicYear"
              name="defaultAcademicYear"
              defaultValue={settings.defaultAcademicYear ?? ""}
              placeholder="2083 / 2083–84"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultLanguage">Default language</Label>
            <select
              id="defaultLanguage"
              name="defaultLanguage"
              defaultValue={settings.defaultLanguage}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="en">English</option>
              <option value="ne">Nepali</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Regional settings</Label>
            <Input
              value={`${settings.timeZone} · ${settings.currency}`}
              readOnly
              disabled
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Module availability</CardTitle>
          <CardDescription>
            Turn foundation flags on or off for this school.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            {
              name: "attendanceEnabled",
              label: "Attendance",
              checked: settings.attendanceEnabled,
            },
            {
              name: "examinationEnabled",
              label: "Examinations",
              checked: settings.examinationEnabled,
            },
            {
              name: "questionBankEnabled",
              label: "Question bank",
              checked: settings.questionBankEnabled,
            },
          ].map((item) => (
            <label
              key={item.name}
              className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4 text-sm font-semibold"
            >
              <input
                type="checkbox"
                name={item.name}
                defaultChecked={item.checked}
                className="size-4 accent-emerald-700"
              />
              {item.label}
            </label>
          ))}
        </CardContent>
      </Card>
      <div className="ml-auto w-full sm:w-52">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}

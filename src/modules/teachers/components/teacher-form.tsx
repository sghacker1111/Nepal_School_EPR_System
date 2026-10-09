"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveTeacherAction,
  type TeacherActionState,
} from "@/modules/teachers/actions";
const initialState: TeacherActionState = {};
const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm";
type InitialTeacher = {
  id: string;
  teacherCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nameInNepali: string | null;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  email: string | null;
  address: string | null;
  qualification: string | null;
  specialization: string | null;
  joiningDate: string;
  employmentType: string;
  status: string;
  citizenshipNumber: string | null;
  citizenshipIssueAt: string | null;
  userId: string | null;
};
function ErrorText({
  state,
  name,
}: {
  state: TeacherActionState;
  name: string;
}) {
  const message = state.fieldErrors?.[name]?.[0];
  return message ? (
    <p className="mt-1 text-xs text-red-700">{message}</p>
  ) : null;
}
function randomPassword() {
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  return `Aa1!${Array.from(values)
    .slice(0, 12)
    .map((value) => chars[value % chars.length])
    .join("")}`;
}
export function TeacherForm({ initial }: { initial?: InitialTeacher }) {
  const [state, action, pending] = useActionState(
    saveTeacherAction,
    initialState,
  );
  const [createLogin, setCreateLogin] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.push("/dashboard/teachers");
  }, [router, state.success]);
  return (
    <form action={action} className="space-y-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Identity and contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="teacherCode">Teacher code</Label>
            <Input
              id="teacherCode"
              name="teacherCode"
              defaultValue={initial?.teacherCode}
              required
            />
            <ErrorText state={state} name="teacherCode" />
          </div>
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={initial?.firstName}
              required
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle name</Label>
            <Input
              id="middleName"
              name="middleName"
              defaultValue={initial?.middleName ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={initial?.lastName}
              required
            />
          </div>
          <div>
            <Label htmlFor="nameInNepali">Name in Nepali</Label>
            <Input
              id="nameInNepali"
              name="nameInNepali"
              defaultValue={initial?.nameInNepali ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              defaultValue={initial?.gender ?? "NOT_SPECIFIED"}
              className={selectClass}
            >
              <option value="NOT_SPECIFIED">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={initial?.dateOfBirth}
            />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              name="mobile"
              defaultValue={initial?.mobile}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email ?? ""}
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              defaultValue={initial?.address ?? ""}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="qualification">Qualification</Label>
            <Input
              id="qualification"
              name="qualification"
              defaultValue={initial?.qualification ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              name="specialization"
              defaultValue={initial?.specialization ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="joiningDate">Joining date</Label>
            <Input
              id="joiningDate"
              name="joiningDate"
              type="date"
              defaultValue={
                initial?.joiningDate ?? new Date().toISOString().slice(0, 10)
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="employmentType">Employment type</Label>
            <select
              id="employmentType"
              name="employmentType"
              defaultValue={initial?.employmentType ?? "PERMANENT"}
              className={selectClass}
            >
              <option value="PERMANENT">Permanent</option>
              <option value="TEMPORARY">Temporary</option>
              <option value="CONTRACT">Contract</option>
              <option value="PART_TIME">Part time</option>
              <option value="VOLUNTEER">Volunteer</option>
            </select>
          </div>
          <div>
            <Label htmlFor="teacherStatus">Status</Label>
            <select
              id="teacherStatus"
              name="status"
              defaultValue={initial?.status ?? "ACTIVE"}
              className={selectClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="RESIGNED">Resigned</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <Label htmlFor="citizenshipNumber">Citizenship number</Label>
            <Input
              id="citizenshipNumber"
              name="citizenshipNumber"
              defaultValue={initial?.citizenshipNumber ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="citizenshipIssueAt">Citizenship issued at</Label>
            <Input
              id="citizenshipIssueAt"
              name="citizenshipIssueAt"
              defaultValue={initial?.citizenshipIssueAt ?? ""}
            />
          </div>
        </CardContent>
      </Card>
      {!initial?.userId && (
        <Card>
          <CardHeader>
            <CardTitle>Optional login account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="createLogin"
                checked={createLogin}
                onChange={(event) => setCreateLogin(event.target.checked)}
                className="size-4"
              />
              Create a teacher login account
            </label>
            {createLogin && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" />
                  <ErrorText state={state} name="username" />
                </div>
                <div>
                  <Label htmlFor="loginEmail">Login email</Label>
                  <Input id="loginEmail" name="loginEmail" type="email" />
                </div>
                <div>
                  <Label htmlFor="temporaryPassword">Temporary password</Label>
                  <Input
                    id="temporaryPassword"
                    name="temporaryPassword"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="text"
                  />
                  <ErrorText state={state} name="temporaryPassword" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="text"
                  />
                  <ErrorText state={state} name="confirmPassword" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(randomPassword())}
                >
                  Generate strong password
                </Button>
                <p className="self-center text-xs text-slate-500">
                  The teacher must change this password on first login.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save teacher" : "Create teacher"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

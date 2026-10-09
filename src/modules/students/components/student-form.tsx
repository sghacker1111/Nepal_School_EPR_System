"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveStudentAction,
  type StudentActionState,
} from "@/modules/students/actions";
type Option = { id: string; name: string };
type SectionOption = Option & { classId: string };
type Initial = {
  id: string;
  userId?: string | null;
  values: Record<string, string | number | boolean | null | undefined>;
};
const state0: StudentActionState = {};
const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm";
const tabs = [
  "Personal",
  "Family",
  "Address",
  "Academic",
  "IEMIS",
  "Documents",
  "Health",
  "History",
] as const;
function randomPassword() {
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  return `Aa1!${Array.from(values)
    .slice(0, 12)
    .map((v) => chars[v % chars.length])
    .join("")}`;
}
function ErrorText({
  state,
  name,
}: {
  state: StudentActionState;
  name: string;
}) {
  const m = state.fieldErrors?.[name]?.[0];
  return m ? (
    <p className="mt-1 text-xs font-medium text-red-700">{m}</p>
  ) : null;
}
export function StudentForm({
  years,
  classes,
  sections,
  initial,
}: {
  years: Option[];
  classes: Option[];
  sections: SectionOption[];
  initial?: Initial;
}) {
  const [state, action, pending] = useActionState(saveStudentAction, state0);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Personal");
  const [classId, setClassId] = useState(String(initial?.values.classId ?? ""));
  const [sameAddress, setSameAddress] = useState(
    initial ? Boolean(initial.values.temporarySameAsPermanent) : true,
  );
  const [guardianRelationship, setGuardianRelationship] = useState(
    String(initial?.values.guardianRelationship ?? "GUARDIAN"),
  );
  const primaryIsParent = ["FATHER", "MOTHER"].includes(guardianRelationship);
  const [createLogin, setCreateLogin] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();
  const get = (name: string, fallback: string | number | boolean = "") =>
    initial?.values[name] ?? fallback;
  useEffect(() => {
    if (state.studentId) router.push(`/dashboard/students/${state.studentId}`);
  }, [router, state.studentId]);
  const field = (
    name: string,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => {
    const { defaultValue, ...inputProps } = props;
    return (
      <div>
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          defaultValue={String(
            get(
              name,
              typeof defaultValue === "string" ||
                typeof defaultValue === "number"
                ? defaultValue
                : "",
            ),
          )}
          {...inputProps}
        />
        <ErrorText state={state} name={name} />
      </div>
    );
  };
  return (
    <form action={action} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}{" "}
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <Card>
        <CardContent className="p-2">
          <div
            role="tablist"
            aria-label="Student form sections"
            className="flex gap-1 overflow-x-auto"
          >
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === item ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <section
            hidden={tab !== "Personal"}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <h2 className="col-span-full text-lg font-semibold">
              Personal information
            </h2>
            {field("studentId", "Student ID", { required: true })}
            {field("admissionNumber", "Admission number", { required: true })}
            {field("iemisId", "IEMIS ID")}
            {field("firstName", "First name", { required: true })}
            {field("middleName", "Middle name")}
            {field("lastName", "Last name", { required: true })}
            {field("nameInNepali", "Name in Nepali")}
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                defaultValue={String(get("gender", "NOT_SPECIFIED"))}
                className={selectClass}
              >
                <option value="NOT_SPECIFIED">Not specified</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {field("dateOfBirthBs", "Date of birth (BS)")}
            {field("dateOfBirthAd", "Date of birth (AD)", { type: "date" })}
            {field("bloodGroup", "Blood group")}
            {field("nationality", "Nationality", {
              required: true,
              defaultValue: "Nepali",
            })}
            {field("motherTongue", "Mother tongue")}
            {field("religion", "Religion")}
            {field("mobile", "Student mobile")}
            {field("email", "Student email", { type: "email" })}
          </section>
          <section hidden={tab !== "Family"} className="space-y-6">
            <h2 className="text-lg font-semibold">Family details</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {field("fatherName", "Father name")}
              {field("fatherOccupation", "Father occupation")}
              {field("fatherEducation", "Father education")}
              {field("fatherMobile", "Father mobile")}
              {field("motherName", "Mother name")}
              {field("motherOccupation", "Mother occupation")}
              {field("motherEducation", "Mother education")}
              {field("motherMobile", "Mother mobile")}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {!primaryIsParent &&
                field("guardianName", "Primary guardian name")}
              <div>
                <Label htmlFor="guardianRelationship">Relationship</Label>
                <select
                  id="guardianRelationship"
                  name="guardianRelationship"
                  value={guardianRelationship}
                  onChange={(event) =>
                    setGuardianRelationship(event.target.value)
                  }
                  className={selectClass}
                >
                  <option value="GUARDIAN">Guardian</option>
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="GRANDPARENT">Grandparent</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {!primaryIsParent && field("guardianMobile", "Guardian mobile")}
              {field("guardianEmail", "Guardian email", { type: "email" })}
              {field("emergencyContact", "Emergency contact")}
            </div>
            {primaryIsParent && (
              <p className="text-sm text-slate-600">
                The selected parent is the primary contact. Update their name
                and mobile in the parent fields above.
              </p>
            )}
            <ErrorText state={state} name="guardianName" />
          </section>
          <section hidden={tab !== "Address"} className="space-y-6">
            <h2 className="text-lg font-semibold">Permanent address</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {field("permanentProvince", "Province")}
              {field("permanentDistrict", "District")}
              {field(
                "permanentLocalLevel",
                "Municipality / rural municipality",
              )}
              {field("permanentWard", "Ward", {
                type: "number",
                min: 1,
                max: 99,
              })}
              {field("permanentTole", "Tole")}
              {field("permanentAddress", "Full address")}
            </div>
            <label className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3 text-sm font-medium">
              <input
                type="checkbox"
                name="temporarySameAsPermanent"
                checked={sameAddress}
                onChange={(e) => setSameAddress(e.target.checked)}
                className="size-4"
              />
              Temporary address is the same
            </label>
            {!sameAddress && (
              <>
                <h2 className="text-lg font-semibold">Temporary address</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {field("temporaryProvince", "Province")}
                  {field("temporaryDistrict", "District")}
                  {field("temporaryLocalLevel", "Municipality")}
                  {field("temporaryWard", "Ward", {
                    type: "number",
                    min: 1,
                    max: 99,
                  })}
                  {field("temporaryTole", "Tole")}
                  {field("temporaryAddress", "Full address")}
                </div>
              </>
            )}
          </section>
          <section hidden={tab !== "Academic"} className="space-y-6">
            <h2 className="text-lg font-semibold">
              Admission and current enrollment
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {field("admissionDate", "Admission date", {
                type: "date",
                required: true,
                defaultValue: new Date().toISOString().slice(0, 10),
              })}
              <div>
                <Label htmlFor="admissionAcademicYearId">
                  Admission academic year
                </Label>
                <select
                  id="admissionAcademicYearId"
                  name="admissionAcademicYearId"
                  defaultValue={String(get("admissionAcademicYearId"))}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {years.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="admissionClassId">Admission class</Label>
                <select
                  id="admissionClassId"
                  name="admissionClassId"
                  defaultValue={String(get("admissionClassId"))}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {classes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              {field("previousSchool", "Previous school")}
              {field("previousClass", "Previous class")}
              {field("previousSchoolIemisCode", "Previous school IEMIS code")}
              {field("registrationNumber", "Registration number")}
            </div>
            {!initial && (
              <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <Label htmlFor="academicYearId">Current academic year</Label>
                  <select
                    id="academicYearId"
                    name="academicYearId"
                    defaultValue={String(get("academicYearId"))}
                    className={selectClass}
                    required
                  >
                    <option value="" disabled>
                      Select year
                    </option>
                    {years.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <ErrorText state={state} name="academicYearId" />
                </div>
                <div>
                  <Label htmlFor="classId">Current class</Label>
                  <select
                    id="classId"
                    name="classId"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="" disabled>
                      Select class
                    </option>
                    {classes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="sectionId">Current section</Label>
                  <select
                    id="sectionId"
                    name="sectionId"
                    defaultValue={String(get("sectionId"))}
                    className={selectClass}
                    required
                  >
                    <option value="" disabled>
                      Select section
                    </option>
                    {sections
                      .filter((v) => v.classId === classId)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </div>
                {field("rollNumber", "Roll number")}
                {field("enrollmentDate", "Enrollment date", {
                  type: "date",
                  required: true,
                  defaultValue: new Date().toISOString().slice(0, 10),
                })}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="scholarshipStatus"
                  defaultChecked={Boolean(get("scholarshipStatus", false))}
                />
                Scholarship
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="transportationRequired"
                  defaultChecked={Boolean(get("transportationRequired", false))}
                />
                Transportation required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="hostelStatus"
                  defaultChecked={Boolean(get("hostelStatus", false))}
                />
                Hostel
              </label>
            </div>
            {field("scholarshipCategory", "Scholarship category")}
          </section>
          <section
            hidden={tab !== "IEMIS"}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <h2 className="col-span-full text-lg font-semibold">
              Configurable IEMIS-style information
            </h2>
            {field("ethnicityCategory", "Ethnicity / category")}
            {field("economicStatus", "Economic status")}
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input
                type="checkbox"
                name="disabilityStatus"
                defaultChecked={Boolean(get("disabilityStatus", false))}
              />
              Has disability
            </label>
            {field("disabilityType", "Disability type")}
            <p className="col-span-full text-xs text-slate-500">
              These fields are reporting metadata and can evolve as official
              formats change.
            </p>
          </section>
          <section
            hidden={tab !== "Documents"}
            className="grid gap-4 md:grid-cols-2"
          >
            <h2 className="col-span-full text-lg font-semibold">
              Document references
            </h2>
            {field("birthRegistrationNumber", "Birth registration number")}
            {field("citizenshipNumber", "Citizenship number (if applicable)")}
            <p className="col-span-full text-xs text-slate-500">
              Document identifiers are retained; binary uploads will use
              configured private object storage.
            </p>
          </section>
          <section
            hidden={tab !== "Health"}
            className="grid gap-4 md:grid-cols-2"
          >
            <h2 className="col-span-full text-lg font-semibold">
              Health information
            </h2>
            {field("allergies", "Allergies")}
            {field("medicalNotes", "Medical notes")}
          </section>
          <section hidden={tab !== "History"} className="space-y-6">
            <h2 className="text-lg font-semibold">Status and portal account</h2>
            <div className="max-w-sm">
              <Label htmlFor="studentStatus">Student status</Label>
              <select
                id="studentStatus"
                name="status"
                defaultValue={String(get("status", "ACTIVE"))}
                className={selectClass}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="GRADUATED">Graduated</option>
                <option value="DROPPED">Dropped</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            {!initial?.userId && (
              <div className="space-y-4 rounded-xl border p-4">
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="createLogin"
                    checked={createLogin}
                    onChange={(e) => setCreateLogin(e.target.checked)}
                    className="size-4"
                  />
                  Create student login account
                </label>
                {createLogin && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {field("username", "Username")}
                    {field("loginEmail", "Login email", { type: "email" })}
                    <div>
                      <Label htmlFor="temporaryPassword">
                        Temporary password
                      </Label>
                      <Input
                        id="temporaryPassword"
                        name="temporaryPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <ErrorText state={state} name="temporaryPassword" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPassword(randomPassword())}
                    >
                      Generate strong password
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save student" : "Create student"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
      {state.duplicates?.length ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-title"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="duplicate-title" className="text-xl font-bold">
              Possible Duplicate Student Found
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Review these tenant-scoped matches. Same names are not
              automatically blocked.
            </p>
            <div className="mt-5 space-y-3">
              {state.duplicates.map((match) => (
                <div key={match.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>
                      {match.studentId} · Admission {match.admissionNumber}
                    </strong>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${match.confidence === "HIGH" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      {match.confidence}
                    </span>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                    {match.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/dashboard/students/${match.id}`}
                    target="_blank"
                    className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline"
                  >
                    View existing student
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => location.reload()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                name="duplicateOverride"
                value="on"
                variant="destructive"
              >
                Continue anyway
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

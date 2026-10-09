"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Clipboard,
  KeyRound,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateStrongPassword } from "@/modules/auth/password-policy";
import {
  createSchoolAction,
  type SchoolActionState,
} from "@/modules/schools/actions";

const initialState: SchoolActionState = {};

function ErrorText({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-700">{messages[0]}</p>;
}

function FormField({
  label,
  name,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </Label>
      {children ?? <Input id={name} name={name} required={required} />}
      <ErrorText messages={error} />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}

export function CreateSchoolForm() {
  const [state, action] = useActionState(createSchoolAction, initialState);
  const { register, setValue } = useForm<{
    temporaryPassword: string;
    confirmPassword: string;
  }>({ defaultValues: { temporaryPassword: "", confirmPassword: "" } });

  function generatePassword() {
    const password = generateStrongPassword();
    setValue("temporaryPassword", password, { shouldValidate: true });
    setValue("confirmPassword", password, { shouldValidate: true });
  }

  async function copyCredentials() {
    if (!state.credentials) return;
    const text = `Nepal School ERP\nSchool: ${state.credentials.schoolName}\nSchool Code: ${state.credentials.schoolCode}\nAdmin Username: ${state.credentials.adminUsername}\nTemporary Password: ${state.credentials.temporaryPassword}\n\nChange this password at first login.`;
    await navigator.clipboard.writeText(text);
    toast.success("Credentials copied. Share them through a secure channel.");
  }

  function printCredentials() {
    if (!state.credentials) return;
    const popup = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=720,height=700",
    );
    if (!popup) return;
    popup.document.title = "School administrator credentials";
    const heading = popup.document.createElement("h1");
    heading.textContent = "Nepal School ERP — Temporary Credentials";
    const body = popup.document.createElement("pre");
    body.textContent = `School: ${state.credentials.schoolName}\nSchool Code: ${state.credentials.schoolCode}\nAdmin Username: ${state.credentials.adminUsername}\nTemporary Password: ${state.credentials.temporaryPassword}\n\nThe administrator must replace this password at first login.\nThis password cannot be retrieved from the system later.`;
    body.style.cssText =
      "font: 16px/1.8 system-ui; padding: 24px; border: 1px solid #ddd; white-space: pre-wrap";
    popup.document.body.style.cssText =
      "font-family: system-ui; padding: 40px; color: #17213a";
    popup.document.body.append(heading, body);
    popup.print();
  }

  return (
    <>
      <form action={action} className="space-y-6">
        {state.error && <Alert>{state.error}</Alert>}
        <Section
          title="Basic information"
          description="Official identity and classification for this tenant."
        >
          <FormField
            label="School name"
            name="name"
            required
            error={state.fieldErrors?.name}
          />
          <FormField
            label="School code"
            name="code"
            required
            error={state.fieldErrors?.code}
          >
            <Input
              id="code"
              name="code"
              className="uppercase"
              placeholder="MIDAS001"
              required
            />
          </FormField>
          <FormField
            label="IEMIS code"
            name="iemisCode"
            error={state.fieldErrors?.iemisCode}
          />
          <FormField
            label="School type"
            name="type"
            required
            error={state.fieldErrors?.type}
          >
            <select
              id="type"
              name="type"
              defaultValue="COMMUNITY"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="COMMUNITY">Community</option>
              <option value="INSTITUTIONAL">Institutional</option>
              <option value="RELIGIOUS">Religious</option>
              <option value="SPECIAL">Special</option>
              <option value="OTHER">Other</option>
            </select>
          </FormField>
          <FormField
            label="School level"
            name="level"
            required
            error={state.fieldErrors?.level}
          >
            <Input
              id="level"
              name="level"
              placeholder="Basic / Secondary / K–12"
              required
            />
          </FormField>
          <FormField
            label="Establishment year"
            name="establishmentYear"
            error={state.fieldErrors?.establishmentYear}
          >
            <Input
              id="establishmentYear"
              name="establishmentYear"
              type="number"
              min="1900"
              max="2200"
            />
          </FormField>
          <FormField
            label="Registration number"
            name="registrationNumber"
            error={state.fieldErrors?.registrationNumber}
          />
          <FormField
            label="PAN / VAT"
            name="panVat"
            error={state.fieldErrors?.panVat}
          />
          <FormField
            label="Initial status"
            name="status"
            required
            error={state.fieldErrors?.status}
          >
            <select
              id="status"
              name="status"
              defaultValue="TRIAL"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Active</option>
            </select>
          </FormField>
        </Section>

        <Section
          title="Address"
          description="Nepal administrative location and postal address."
        >
          <FormField
            label="Province"
            name="province"
            required
            error={state.fieldErrors?.province}
          >
            <select
              id="province"
              name="province"
              defaultValue="Bagmati"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              {[
                "Koshi",
                "Madhesh",
                "Bagmati",
                "Gandaki",
                "Lumbini",
                "Karnali",
                "Sudurpashchim",
              ].map((province) => (
                <option key={province}>{province}</option>
              ))}
            </select>
          </FormField>
          <FormField
            label="District"
            name="district"
            required
            error={state.fieldErrors?.district}
          />
          <FormField
            label="Municipality / Rural municipality"
            name="localLevel"
            required
            error={state.fieldErrors?.localLevel}
          />
          <FormField
            label="Ward number"
            name="ward"
            required
            error={state.fieldErrors?.ward}
          >
            <Input
              id="ward"
              name="ward"
              type="number"
              min="1"
              max="99"
              required
            />
          </FormField>
          <FormField label="Tole" name="tole" error={state.fieldErrors?.tole} />
          <FormField
            label="Full address"
            name="address"
            required
            error={state.fieldErrors?.address}
          />
        </Section>

        <Section
          title="Contact and management"
          description="Public school contacts and principal information."
        >
          <FormField
            label="School phone"
            name="phone"
            error={state.fieldErrors?.phone}
          />
          <FormField
            label="School mobile"
            name="mobile"
            required
            error={state.fieldErrors?.mobile}
          />
          <FormField
            label="School email"
            name="email"
            required
            error={state.fieldErrors?.email}
          >
            <Input id="email" name="email" type="email" required />
          </FormField>
          <FormField
            label="Website"
            name="website"
            error={state.fieldErrors?.website}
          >
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://"
            />
          </FormField>
          <FormField
            label="Principal name"
            name="principalName"
            required
            error={state.fieldErrors?.principalName}
          />
          <FormField
            label="Principal phone"
            name="principalPhone"
            required
            error={state.fieldErrors?.principalPhone}
          />
          <FormField
            label="Principal email"
            name="principalEmail"
            error={state.fieldErrors?.principalEmail}
          >
            <Input id="principalEmail" name="principalEmail" type="email" />
          </FormField>
        </Section>

        <Section
          title="System defaults"
          description="Safe defaults can be refined by the School Administrator later."
        >
          <FormField
            label="Calendar preference"
            name="calendarPreference"
            required
          >
            <select
              id="calendarPreference"
              name="calendarPreference"
              defaultValue="BOTH"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="BOTH">BS and AD</option>
              <option value="BS">Bikram Sambat</option>
              <option value="AD">Gregorian (AD)</option>
            </select>
          </FormField>
          <FormField label="Default academic year" name="defaultAcademicYear">
            <Input
              id="defaultAcademicYear"
              name="defaultAcademicYear"
              placeholder="2083 / 2083–84"
            />
          </FormField>
          <FormField label="Default language" name="defaultLanguage" required>
            <select
              id="defaultLanguage"
              name="defaultLanguage"
              defaultValue="en"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              <option value="en">English</option>
              <option value="ne">Nepali</option>
            </select>
          </FormField>
          <div className="sm:col-span-2 lg:col-span-3 grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-3">
            {[
              { name: "attendanceEnabled", label: "Attendance enabled" },
              { name: "examinationEnabled", label: "Examinations enabled" },
              { name: "questionBankEnabled", label: "Question bank enabled" },
            ].map((setting) => (
              <label
                key={setting.name}
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <input
                  type="checkbox"
                  name={setting.name}
                  defaultChecked
                  className="size-4 accent-emerald-700"
                />
                {setting.label}
              </label>
            ))}
          </div>
        </Section>

        <Section
          title="School Administrator account"
          description="This account will receive complete control within this school only."
        >
          <FormField
            label="Full name"
            name="adminFullName"
            required
            error={state.fieldErrors?.adminFullName}
          />
          <FormField
            label="Username"
            name="adminUsername"
            required
            error={state.fieldErrors?.adminUsername}
          >
            <Input
              id="adminUsername"
              name="adminUsername"
              placeholder="admin.school"
              autoComplete="off"
              required
            />
          </FormField>
          <FormField
            label="Email"
            name="adminEmail"
            required
            error={state.fieldErrors?.adminEmail}
          >
            <Input
              id="adminEmail"
              name="adminEmail"
              type="email"
              autoComplete="off"
              required
            />
          </FormField>
          <FormField
            label="Mobile number"
            name="adminMobile"
            required
            error={state.fieldErrors?.adminMobile}
          />
          <FormField
            label="Temporary password"
            name="temporaryPassword"
            required
            error={state.fieldErrors?.temporaryPassword}
          >
            <div className="flex gap-2">
              <Input
                id="temporaryPassword"
                type="text"
                autoComplete="off"
                {...register("temporaryPassword", { required: true })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generatePassword}
                title="Generate strong password"
              >
                <RefreshCw />
              </Button>
            </div>
          </FormField>
          <FormField
            label="Confirm password"
            name="confirmPassword"
            required
            error={state.fieldErrors?.confirmPassword}
          >
            <Input
              id="confirmPassword"
              type="text"
              autoComplete="off"
              {...register("confirmPassword", { required: true })}
            />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <KeyRound className="mr-2 inline size-4" />
            The password is returned once after creation, stored only as an
            Argon2id hash, and must be changed at first login.
          </div>
        </Section>
        <div className="flex justify-end">
          <div className="w-full sm:w-auto sm:min-w-64">
            <SubmitButton pendingText="Creating secure tenant…">
              Create school and administrator
            </SubmitButton>
          </div>
        </div>
      </form>

      {state.credentials && (
        <Dialog.Root defaultOpen>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-2xl">
              <div className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check />
              </div>
              <Dialog.Title className="mt-4 text-xl font-bold text-slate-950">
                School successfully created
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-600">
                Save these one-time credentials now. The password cannot be
                retrieved later.
              </Dialog.Description>
              {state.credentials && (
                <dl className="mt-5 space-y-3 rounded-xl border bg-slate-50 p-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">School</dt>
                    <dd className="font-semibold">
                      {state.credentials.schoolName}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-slate-500">School code</dt>
                      <dd className="font-mono font-semibold">
                        {state.credentials.schoolCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Admin username</dt>
                      <dd className="font-mono font-semibold">
                        {state.credentials.adminUsername}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      Temporary password
                    </dt>
                    <dd className="break-all font-mono font-bold text-emerald-800">
                      {state.credentials.temporaryPassword}
                    </dd>
                  </div>
                </dl>
              )}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button type="button" onClick={copyCredentials}>
                  <Clipboard />
                  Copy credentials
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printCredentials}
                >
                  <Printer />
                  Print credentials
                </Button>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" className="mt-2 w-full">
                  Done
                </Button>
              </Dialog.Close>
              <Dialog.Close
                className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="size-4" />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}

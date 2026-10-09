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
import { updateSchoolProfileAction } from "@/modules/schools/actions";

type SchoolProfile = {
  id: string;
  name: string;
  code: string;
  iemisCode: string | null;
  type: string;
  level: string;
  establishmentYear: number | null;
  registrationNumber: string | null;
  panVat: string | null;
  province: string;
  district: string;
  localLevel: string;
  ward: number;
  tole: string | null;
  address: string;
  phone: string | null;
  mobile: string;
  email: string;
  website: string | null;
  principalName: string;
  principalPhone: string;
  principalEmail: string | null;
};

function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string | number | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
      />
    </div>
  );
}

export function EditSchoolForm({ school }: { school: SchoolProfile }) {
  const [state, action] = useActionState(updateSchoolProfileAction, {});
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="schoolId" value={school.id} />
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            Changing the school code changes the code used at login;
            administrator usernames remain tenant-bound.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="School name" name="name" value={school.name} required />
          <Field label="School code" name="code" value={school.code} required />
          <Field label="IEMIS code" name="iemisCode" value={school.iemisCode} />
          <div className="space-y-2">
            <Label htmlFor="type">School type</Label>
            <select
              id="type"
              name="type"
              defaultValue={school.type}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              {[
                "COMMUNITY",
                "INSTITUTIONAL",
                "RELIGIOUS",
                "SPECIAL",
                "OTHER",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <Field
            label="School level"
            name="level"
            value={school.level}
            required
          />
          <Field
            label="Establishment year"
            name="establishmentYear"
            value={school.establishmentYear}
            type="number"
          />
          <Field
            label="Registration number"
            name="registrationNumber"
            value={school.registrationNumber}
          />
          <Field label="PAN / VAT" name="panVat" value={school.panVat} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Address and contact</CardTitle>
          <CardDescription>
            Registered location and official communication channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Province"
            name="province"
            value={school.province}
            required
          />
          <Field
            label="District"
            name="district"
            value={school.district}
            required
          />
          <Field
            label="Municipality / Rural municipality"
            name="localLevel"
            value={school.localLevel}
            required
          />
          <Field
            label="Ward"
            name="ward"
            value={school.ward}
            type="number"
            required
          />
          <Field label="Tole" name="tole" value={school.tole} />
          <Field
            label="Full address"
            name="address"
            value={school.address}
            required
          />
          <Field label="Phone" name="phone" value={school.phone} />
          <Field label="Mobile" name="mobile" value={school.mobile} required />
          <Field
            label="Email"
            name="email"
            value={school.email}
            type="email"
            required
          />
          <Field
            label="Website"
            name="website"
            value={school.website}
            type="url"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Management</CardTitle>
          <CardDescription>
            Current principal contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Principal name"
            name="principalName"
            value={school.principalName}
            required
          />
          <Field
            label="Principal phone"
            name="principalPhone"
            value={school.principalPhone}
            required
          />
          <Field
            label="Principal email"
            name="principalEmail"
            value={school.principalEmail}
            type="email"
          />
        </CardContent>
      </Card>
      <div className="ml-auto w-full sm:w-56">
        <SubmitButton pendingText="Saving school…">
          Save school profile
        </SubmitButton>
      </div>
    </form>
  );
}

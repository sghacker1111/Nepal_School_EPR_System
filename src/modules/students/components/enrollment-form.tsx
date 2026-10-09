"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveEnrollmentAction,
  type StudentActionState,
} from "@/modules/students/actions";
type Option = { id: string; name: string };
type SectionOption = Option & { classId: string };
const initial: StudentActionState = {};
const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm";
export function EnrollmentForm({
  studentId,
  years,
  classes,
  sections,
}: {
  studentId: string;
  years: Option[];
  classes: Option[];
  sections: SectionOption[];
}) {
  const [state, action, pending] = useActionState(
    saveEnrollmentAction,
    initial,
  );
  const [classId, setClassId] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="studentId" value={studentId} />
      {state.error && <Alert className="md:col-span-2">{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 md:col-span-2">
          {state.success}
        </Alert>
      )}
      <div>
        <Label htmlFor="enrollYear">Academic year</Label>
        <select
          id="enrollYear"
          name="academicYearId"
          className={selectClass}
          required
        >
          <option value="">Select year</option>
          {years.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="enrollClass">Class</Label>
        <select
          id="enrollClass"
          name="classId"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className={selectClass}
          required
        >
          <option value="">Select class</option>
          {classes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="enrollSection">Section</Label>
        <select
          id="enrollSection"
          name="sectionId"
          className={selectClass}
          required
        >
          <option value="">Select section</option>
          {sections
            .filter((v) => v.classId === classId)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <Label htmlFor="enrollRoll">Roll number</Label>
        <Input id="enrollRoll" name="rollNumber" />
      </div>
      <div>
        <Label htmlFor="enrollDate">Enrollment date</Label>
        <Input
          id="enrollDate"
          name="enrollmentDate"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </div>
      <div>
        <Label htmlFor="enrollStatus">Status</Label>
        <select
          id="enrollStatus"
          name="status"
          className={selectClass}
          defaultValue="ACTIVE"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="PROMOTED">Promoted</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="enrollRemarks">Remarks</Label>
        <Input id="enrollRemarks" name="remarks" />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="md:col-span-2 md:justify-self-start"
      >
        {pending ? "Saving…" : "Add or update enrollment"}
      </Button>
    </form>
  );
}

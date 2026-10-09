"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveAttendanceAction,
  type AttendanceActionState,
} from "@/modules/attendance/actions";

type StudentRow = {
  id: string;
  name: string;
  rollNumber: string | null;
  status: string;
  remarks: string;
};

const selectClass = "h-9 rounded-md border bg-white px-2 text-sm";

export function AttendanceSheet({
  academicYearId,
  classId,
  sectionId,
  date,
  students,
  locked,
}: {
  academicYearId: string;
  classId: string;
  sectionId: string;
  date: string;
  students: StudentRow[];
  locked: boolean;
}) {
  const [state, action, pending] = useActionState<
    AttendanceActionState,
    FormData
  >(saveAttendanceAction, {});
  const [defaults, setDefaults] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((student) => [student.id, student.status])),
  );
  const markAll = (status: string) =>
    setDefaults(
      Object.fromEntries(students.map((student) => [student.id, status])),
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="academicYearId" value={academicYearId} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={locked}
          onClick={() => markAll("PRESENT")}
        >
          Mark all present
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={locked}
          onClick={() => markAll("ABSENT")}
        >
          Mark all absent
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Roll</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Attendance</th>
              <th className="px-4 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3">
                  {student.rollNumber ?? "—"}
                  <input type="hidden" name="studentId" value={student.id} />
                </td>
                <td className="px-4 py-3 font-semibold">{student.name}</td>
                <td className="px-4 py-3">
                  <select
                    name={`status:${student.id}`}
                    value={defaults[student.id]}
                    onChange={(event) =>
                      setDefaults((current) => ({
                        ...current,
                        [student.id]: event.target.value,
                      }))
                    }
                    aria-label={`Attendance for ${student.name}`}
                    className={selectClass}
                    disabled={locked}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="LEAVE">Leave</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </td>
                <td className="min-w-56 px-4 py-3">
                  <Input
                    name={`remarks:${student.id}`}
                    defaultValue={student.remarks}
                    placeholder="Optional"
                    disabled={locked}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button name="intent" value="draft" disabled={pending}>
            Save draft
          </Button>
          <Button
            name="intent"
            value="submit"
            variant="outline"
            disabled={pending}
          >
            Submit attendance
          </Button>
        </div>
      )}
      {locked && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          This session is locked and read-only.
        </Alert>
      )}
    </form>
  );
}

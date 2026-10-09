"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveMarkSheetAction,
  type ExamActionState,
} from "@/modules/exams/actions";

type Row = {
  id: string;
  name: string;
  roll: string | null;
  theory: string;
  practical: string;
  internal: string;
  special: string;
  remarks: string;
};
const selectClass = "h-9 rounded-md border bg-white px-2 text-sm";

export function MarkSheetForm({
  examSubjectId,
  sectionId,
  rows,
  limits,
  readOnly,
}: {
  examSubjectId: string;
  sectionId: string;
  rows: Row[];
  limits: { theory: number; practical: number; internal: number };
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState<ExamActionState, FormData>(
    saveMarkSheetAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="examSubjectId" value={examSubjectId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {state.success}
        </Alert>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Roll / Student</th>
              {limits.theory > 0 && (
                <th className="px-3 py-3">Theory / {limits.theory}</th>
              )}
              {limits.practical > 0 && (
                <th className="px-3 py-3">Practical / {limits.practical}</th>
              )}
              {limits.internal > 0 && (
                <th className="px-3 py-3">Internal / {limits.internal}</th>
              )}
              <th className="px-3 py-3">Special</th>
              <th className="px-3 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="min-w-48 px-3 py-3">
                  <input type="hidden" name="studentId" value={row.id} />
                  <span className="font-semibold">
                    {row.roll ?? "—"} · {row.name}
                  </span>
                </td>
                {limits.theory > 0 && (
                  <td className="px-3 py-3">
                    <Input
                      className="w-24"
                      name={`theory:${row.id}`}
                      type="number"
                      min="0"
                      max={limits.theory}
                      step="0.01"
                      defaultValue={row.theory}
                      disabled={readOnly}
                    />
                  </td>
                )}
                {limits.practical > 0 && (
                  <td className="px-3 py-3">
                    <Input
                      className="w-24"
                      name={`practical:${row.id}`}
                      type="number"
                      min="0"
                      max={limits.practical}
                      step="0.01"
                      defaultValue={row.practical}
                      disabled={readOnly}
                    />
                  </td>
                )}
                {limits.internal > 0 && (
                  <td className="px-3 py-3">
                    <Input
                      className="w-24"
                      name={`internal:${row.id}`}
                      type="number"
                      min="0"
                      max={limits.internal}
                      step="0.01"
                      defaultValue={row.internal}
                      disabled={readOnly}
                    />
                  </td>
                )}
                <td className="px-3 py-3">
                  <select
                    name={`special:${row.id}`}
                    defaultValue={row.special}
                    className={selectClass}
                    disabled={readOnly}
                  >
                    <option value="">Normal</option>
                    <option value="ABSENT">Absent</option>
                    <option value="WITHHELD">Withheld</option>
                    <option value="EXEMPTED">Exempted</option>
                  </select>
                </td>
                <td className="min-w-48 px-3 py-3">
                  <Input
                    name={`remarks:${row.id}`}
                    defaultValue={row.remarks}
                    disabled={readOnly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <Button disabled={pending}>Save marks draft</Button>}
    </form>
  );
}

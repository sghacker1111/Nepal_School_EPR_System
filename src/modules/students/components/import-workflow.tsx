"use client";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmStudentImportAction } from "@/modules/students/import-actions";
import type { StudentActionState } from "@/modules/students/actions";
type Batch = {
  id: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  rows: {
    rowNumber: number;
    status: string;
    errors: unknown;
    duplicateStudentId: string | null;
    data: Record<string, unknown>;
  }[];
};
const initial: StudentActionState = {};
export function ImportWorkflow() {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, confirmAction, pending] = useActionState(
    confirmStudentImportAction,
    initial,
  );
  const input = useRef<HTMLInputElement>(null);
  async function preview() {
    const file = input.current?.files?.[0];
    if (!file) {
      setError("Select an .xlsx workbook first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/students/import/preview", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        batch?: Batch;
        error?: string;
      };
      if (!response.ok || !payload.batch)
        throw new Error(payload.error ?? "Could not validate the workbook.");
      setBatch(payload.batch);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not validate the workbook.",
      );
    } finally {
      setLoading(false);
    }
  }
  const summary = [
    { label: "Total", count: batch?.totalRows, className: "bg-slate-50" },
    { label: "Ready", count: batch?.validRows, className: "bg-emerald-50" },
    {
      label: "Duplicates",
      count: batch?.duplicateRows,
      className: "bg-amber-50",
    },
    { label: "Errors", count: batch?.errorRows, className: "bg-red-50" },
  ];
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Download and prepare</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              Use the controlled template so academic year, class, section,
              dates, and guardian values can be validated.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Maximum 1,000 rows and 5 MB. Existing academic setup names must
              match.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/api/students/import/template">
              <Download />
              Download template
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>2. Upload and validate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-4 text-sm">
              <FileSpreadsheet className="text-emerald-700" />
              <input
                ref={input}
                type="file"
                accept=".xlsx"
                className="w-full"
              />
            </label>
            <Button type="button" onClick={preview} disabled={loading}>
              <UploadCloud />
              {loading ? "Validating…" : "Validate and preview"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {batch && (
        <Card>
          <CardHeader>
            <CardTitle>3. Review preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border p-4 ${item.className}`}
                >
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{item.count}</p>
                </div>
              ))}
            </div>
            <div className="max-h-[460px] overflow-auto rounded-xl border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batch.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3">
                        <strong>
                          {String(row.data.firstName ?? "")}{" "}
                          {String(row.data.lastName ?? "")}
                        </strong>
                        <p className="text-xs text-slate-500">
                          {String(row.data.studentId ?? "")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {String(row.data.className ?? "")}{" "}
                        {String(row.data.section ?? "")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            row.status === "VALID"
                              ? "success"
                              : row.status === "DUPLICATE"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="max-w-md px-4 py-3 text-xs text-slate-600">
                        {Array.isArray(row.errors)
                          ? row.errors.join("; ")
                          : row.duplicateStudentId
                            ? "Possible duplicate student"
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(batch.errorRows > 0 || batch.duplicateRows > 0) && (
              <Button asChild variant="outline">
                <Link href={`/api/students/import/${batch.id}/errors`}>
                  <Download />
                  Download error report
                </Link>
              </Button>
            )}
            {state.error && <Alert>{state.error}</Alert>}
            {state.success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <CheckCircle2 className="mb-2" />
                <p className="font-semibold">{state.success}</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/students">View students</Link>
                </Button>
              </div>
            ) : (
              <form action={confirmAction}>
                <input type="hidden" name="batchId" value={batch.id} />
                <Button
                  type="submit"
                  disabled={pending || batch.validRows === 0}
                >
                  {pending
                    ? "Importing…"
                    : `Confirm import of ${batch.validRows} students`}
                </Button>
                <p className="mt-2 text-xs text-slate-500">
                  Only rows marked Ready are imported. Duplicate and error rows
                  are skipped and retained in the batch report.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

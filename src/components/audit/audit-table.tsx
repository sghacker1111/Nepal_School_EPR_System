import type { AuditAction } from "@/generated/prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export type AuditRow = {
  id: string;
  action: AuditAction;
  description: string;
  entityType: string;
  ipAddress: string | null;
  createdAt: Date;
  user: { firstName: string; lastName: string } | null;
  school?: { name: string; code: string } | null;
};

export function AuditTable({
  rows,
  showSchool = false,
}: {
  rows: AuditRow[];
  showSchool?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Event</th>
                  {showSchool && <th className="px-5 py-3">School</th>}
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <Badge variant="secondary">
                        {row.action.replaceAll("_", " ")}
                      </Badge>
                      <p className="mt-2 max-w-lg text-xs leading-5 text-slate-600">
                        {row.description}
                      </p>
                    </td>
                    {showSchool && (
                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {row.school?.name ?? "Platform"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.school?.code ?? "GLOBAL"}
                        </p>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      {row.user
                        ? `${row.user.firstName} ${row.user.lastName}`
                        : "System"}
                    </td>
                    <td className="px-5 py-4">
                      <p>{row.entityType}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {row.ipAddress ?? "—"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-semibold">No audit events</p>
            <p className="mt-1 text-sm text-slate-500">
              Security-sensitive actions will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

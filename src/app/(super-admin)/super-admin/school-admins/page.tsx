import { Users } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function SchoolAdminsPage() {
  const administrators = await prisma.user.findMany({
    where: {
      schoolId: { not: null },
      roles: { some: { role: { code: "SCHOOL_ADMIN" } } },
    },
    include: { school: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        eyebrow="Access management"
        title="School Administrators"
        description="Tenant-bound administrators. Passwords are reset—not retrieved—from each school details page."
      />
      <Card>
        <CardContent className="p-0">
          {administrators.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Administrator</th>
                    <th className="px-5 py-3">School</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Password state</th>
                    <th className="px-5 py-3">Last login</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {administrators.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{user.username} · {user.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{user.school?.name}</p>
                        <p className="text-xs text-slate-500">
                          {user.school?.code}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            user.status === "ACTIVE" ? "success" : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        {user.mustChangePassword ? (
                          <Badge variant="warning">Change required</Badge>
                        ) : (
                          <span className="text-slate-500">Private</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {user.lastLoginAt
                          ? formatDate(user.lastLoginAt)
                          : "Never"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/super-admin/schools/${user.schoolId}`}>
                            Manage school
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Users className="mx-auto size-9 text-slate-300" />
              <p className="mt-3 font-semibold">No School Administrators</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

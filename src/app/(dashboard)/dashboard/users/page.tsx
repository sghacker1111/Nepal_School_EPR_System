import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { UserForm } from "@/modules/users/user-form";

export default async function SchoolUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string; page?: string }>;
}) {
  const session = await requireSchoolPage("user.view");
  const query = await searchParams;
  const page = Math.min(
    100000,
    Math.max(1, Math.floor(Number(query.page)) || 1),
  );
  const canManage =
    session.permissions.has("user.manage") && session.roles.has("SCHOOL_ADMIN");
  const where = {
    schoolId: session.schoolId,
    ...(query.q
      ? {
          OR: [
            { normalizedUsername: { contains: query.q.toLowerCase() } },
            { firstName: { contains: query.q, mode: "insensitive" as const } },
            { lastName: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const select = {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    email: true,
    status: true,
    mustChangePassword: true,
    roles: { select: { role: { select: { code: true, name: true } } } },
  } as const;
  const [users, count, selected] = await Promise.all([
    prisma.user.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 25,
      take: 25,
    }),
    prisma.user.count({ where }),
    canManage && query.edit && query.edit !== session.user.id
      ? prisma.user.findFirst({
          where: { schoolId: session.schoolId, id: query.edit },
          select,
        })
      : null,
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & access"
        description="Manage school login access. Teacher and student accounts stay linked to their profiles."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Accounts ({count})</CardTitle>
            <form className="flex gap-2">
              <Input
                name="q"
                aria-label="Search users"
                placeholder="Name or username"
                defaultValue={query.q}
              />
              <Button variant="outline">Search</Button>
            </form>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Access</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="p-4">
                        <p className="font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{user.username}
                        </p>
                      </td>
                      <td className="p-4">
                        {user.roles.map((link) => link.role.name).join(", ")}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            user.status === "ACTIVE" ? "success" : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                        {user.mustChangePassword && (
                          <p className="mt-1 text-xs text-amber-700">
                            Password change required
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        {canManage && user.id !== session.user.id ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`?edit=${user.id}`}>Manage</Link>
                          </Button>
                        ) : user.id === session.user.id ? (
                          <Link
                            href="/dashboard/security"
                            className="underline"
                          >
                            My security
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length && (
                <p className="p-8 text-center text-slate-500">
                  No matching accounts.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between border-t p-4 text-sm">
              <span>
                Page {page} of {Math.max(1, Math.ceil(count / 25))}
              </span>
              <div className="flex gap-3">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}&q=${encodeURIComponent(query.q ?? "")}`}
                  >
                    Previous
                  </Link>
                )}
                {page * 25 < count && (
                  <Link
                    href={`?page=${page + 1}&q=${encodeURIComponent(query.q ?? "")}`}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selected
                  ? `Manage @${selected.username}`
                  : "Create staff account"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserForm
                key={selected?.id ?? "new"}
                initial={
                  selected
                    ? {
                        ...selected,
                        role:
                          selected.roles[0]?.role.code ?? "EXAM_COORDINATOR",
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

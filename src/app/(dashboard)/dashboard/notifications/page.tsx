import { Bell, Check } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSchoolPage } from "@/modules/auth/page-session";
import { markNotificationReadAction } from "@/modules/notifications/actions";
import { NotificationForm } from "@/modules/notifications/components/notification-form";
import { getUserNotifications } from "@/modules/notifications/service";

export default async function NotificationsPage() {
  const session = await requireSchoolPage("notification.view");
  const notifications = await getUserNotifications(
    session.schoolId,
    session.user.id,
  );
  return (
    <>
      <PageHeader
        eyebrow="Phase 8"
        title="Notifications"
        description="School broadcasts and targeted student, teacher, administrator, attendance, exam, and result notices."
      />
      {session.permissions.has("notification.manage") && (
        <Card>
          <CardHeader>
            <CardTitle>Create notification</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationForm />
          </CardContent>
        </Card>
      )}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length ? (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 ${notification.isRead ? "bg-white" : "border-emerald-200 bg-emerald-50/50"}`}
              >
                <div className="flex gap-3">
                  <Bell className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{notification.title}</p>
                      <Badge variant="outline">{notification.type}</Badge>
                      {!notification.userId && (
                        <Badge variant="outline">Broadcast</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {notification.createdAt.toLocaleString("en-NP", {
                        timeZone: "Asia/Kathmandu",
                      })}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {notification.link && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={notification.link}>Open</Link>
                        </Button>
                      )}
                      {!notification.isRead && (
                        <form
                          action={markNotificationReadAction.bind(
                            null,
                            notification.id,
                          )}
                        >
                          <Button size="sm" variant="ghost">
                            <Check />
                            Mark read
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              No notifications.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import { Card, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { getNotifications } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";
import { markNotificationsReadAction } from "@/lib/actions/customer";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = (await getCurrentUser())!;
  const notifications = await getNotifications(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <form action={markNotificationsReadAction}>
            <button className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" />
      ) : (
        <Card className="divide-y divide-ink-100">
          {notifications.map((n) => (
            <div key={n.id} className={`flex gap-3 px-4 py-4 ${n.read ? "opacity-70" : "bg-brand-50/40"}`}>
              <span className="mt-0.5 text-xl">🔔</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  {!n.read && <span className="size-2 rounded-full bg-brand-600" />}
                </div>
                {n.message && <p className="mt-0.5 text-sm text-ink-700/80">{n.message}</p>}
                <p className="mt-1 text-xs text-ink-700/50">{formatDateTime(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

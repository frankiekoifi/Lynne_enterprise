import Link from "next/link";
import { Card, Stat, ProgressBar, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { getCurrentUser } from "@/lib/session";
import {
  getLipaAccountsByUser,
  getOrdersByUser,
  getPaymentsByUser,
  getNotifications,
} from "@/lib/data";
import { fmtKsh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountDashboard() {
  const user = (await getCurrentUser())!;
  const [lipa, orders, payments, notifications] = await Promise.all([
    getLipaAccountsByUser(user.id),
    getOrdersByUser(user.id),
    getPaymentsByUser(user.id),
    getNotifications(user.id),
  ]);

  const activeLipa = lipa.filter((a) =>
    ["active", "payment_due", "overdue", "pending", "extension_approved", "switch_requested"].includes(a.status),
  );
  const outstanding = activeLipa.reduce((sum, a) => sum + a.remainingAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Welcome back, {user.fullName.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-700/80">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active Lipa plans" value={activeLipa.length} />
        <Stat label="Outstanding balance" value={fmtKsh(outstanding)} />
        <Stat label="Orders" value={orders.length} />
        <Stat label="Total payments" value={fmtKsh(payments.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0))} />
      </div>

      {/* Active Lipa Polepole plans */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">My Lipa Polepole</h2>
          <LinkButton href="/account/lipa" variant="outline" size="sm">View all</LinkButton>
        </div>
        {activeLipa.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-700/70">
            No active Lipa Polepole plans.{" "}
            <Link href="/shop?lipa=1" className="font-semibold text-brand-700 hover:underline">
              Start one today
            </Link>
            .
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeLipa.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/account/lipa/${a.id}`}>
                <Card className="p-5 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-bold text-ink-900">{a.productName}</p>
                      <p className="text-sm text-ink-700/70">{a.variationName} · {a.accountNumber}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between text-sm">
                    <span className="text-ink-700/70">Remaining</span>
                    <span className="font-bold text-ink-900">{fmtKsh(a.remainingAmount)}</span>
                  </div>
                  <ProgressBar value={a.progress} className="mt-2" />
                  <p className="mt-2 text-xs text-ink-700/60">
                    {a.progress}% paid · {a.planSnapshot}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders + payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Recent orders</h2>
            <LinkButton href="/account/orders" variant="outline" size="sm">View all</LinkButton>
          </div>
          {orders.length === 0 ? (
            <Card className="p-6 text-sm text-ink-700/70">No orders yet.</Card>
          ) : (
            <Card className="divide-y divide-ink-100">
              {orders.slice(0, 4).map((o) => (
                <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ink-50">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{o.orderNumber}</p>
                    <p className="text-xs text-ink-700/60">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-ink-900">{fmtKsh(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Recent payments</h2>
            <LinkButton href="/account/payments" variant="outline" size="sm">View all</LinkButton>
          </div>
          {payments.length === 0 ? (
            <Card className="p-6 text-sm text-ink-700/70">No payments recorded yet.</Card>
          ) : (
            <Card className="divide-y divide-ink-100">
              {payments.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{p.reference}</p>
                    <p className="text-xs text-ink-700/60">{formatDate(p.createdAt)} · {p.method.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${p.amount < 0 ? "text-red-600" : "text-ink-900"}`}>
                      {fmtKsh(p.amount)}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink-900">Notifications</h2>
          <Card className="divide-y divide-ink-100">
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className="flex gap-3 px-4 py-3">
                <span className="text-xl">🔔</span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  <p className="text-sm text-ink-700/70">{n.message}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

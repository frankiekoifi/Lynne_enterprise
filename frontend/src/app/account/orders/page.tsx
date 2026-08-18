import Link from "next/link";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { getCurrentUser } from "@/lib/session";
import { getOrdersByUser } from "@/lib/data";
import { fmtKsh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = (await getCurrentUser())!;
  const orders = await getOrdersByUser(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">My orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          message="When you buy something, it will show up here."
          action={<LinkButton href="/shop">Start shopping</LinkButton>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`}>
              <Card className="p-5 transition hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink-900">{o.orderNumber}</p>
                    <p className="text-xs text-ink-700/60">
                      {formatDate(o.createdAt)} · {o.deliveryMethod === "delivery" ? "Delivery" : "Collection"}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.items.slice(0, 3).map((it) => (
                    <span key={it.id} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-700">
                      {it.productName} · {it.variationName} × {it.quantity}
                    </span>
                  ))}
                  {o.items.length > 3 && (
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-700">
                      +{o.items.length - 3} more
                    </span>
                  )}
                </div>
                <p className="mt-3 text-right text-base font-bold text-ink-900">{fmtKsh(o.total)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

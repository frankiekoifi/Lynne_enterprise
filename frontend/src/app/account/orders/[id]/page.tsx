import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { OrderRefundRequest } from "@/components/lipa-actions";
import { getCurrentUser } from "@/lib/session";
import { getOrderById } from "@/lib/data";
import { fmtKsh, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const deliverySteps = ["pending", "preparing", "ready", "assigned", "out_for_delivery", "delivered"];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const order = await getOrderById(Number(id));
  if (!order || order.userId !== user.id) notFound();

  const currentStep = deliverySteps.indexOf(order.delivery?.status ?? "pending");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-700/70">
        <Link href="/account/orders" className="hover:text-brand-700">← My orders</Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ink-700/70">{formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Delivery tracking */}
      {order.delivery && (
        <Card className="p-5">
          <h2 className="font-bold text-ink-900">Delivery tracking</h2>
          <div className="mt-4 flex items-center">
            {deliverySteps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                      i <= currentStep ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700/50"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="mt-1 hidden text-center text-[10px] capitalize text-ink-700/60 sm:block">
                    {step.replace(/_/g, " ")}
                  </span>
                </div>
                {i < deliverySteps.length - 1 && (
                  <span className={`mx-1 h-0.5 flex-1 ${i < currentStep ? "bg-brand-600" : "bg-ink-100"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-700/70">
            Delivery to: {order.deliveryAddress}
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Items</h2>
            <div className="mt-3 divide-y divide-ink-100">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-ink-900">{it.productName}</p>
                    <p className="text-sm text-ink-700/70">{it.variationName} × {it.quantity}</p>
                  </div>
                  <p className="font-bold text-ink-900">{fmtKsh(it.total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-700/70">Subtotal</span><span>{fmtKsh(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ink-700/70">Delivery</span><span>{fmtKsh(order.deliveryFee)}</span></div>
              <div className="flex justify-between text-base font-bold text-ink-900"><span>Total</span><span>{fmtKsh(order.total)}</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Payments</h2>
            {order.payments.length === 0 ? (
              <p className="mt-2 text-sm text-ink-700/70">No payment records.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-ink-700/70">{p.reference}</span>
                    <span className="uppercase text-ink-700/70">{p.method}</span>
                    <span className="font-bold text-ink-900">{fmtKsh(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {!["delivered", "cancelled"].includes(order.status) && (
          <Card className="h-fit p-5">
            <h2 className="font-bold text-ink-900">Need a refund?</h2>
            <p className="mt-1 text-sm text-ink-700/70">Submit a refund request and our team will review it.</p>
            <div className="mt-4">
              <OrderRefundRequest orderId={order.id} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import { db } from "@/db";
import { orderItems, deliveries } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { OrdersManager } from "@/components/admin/operations";
import { getAllOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();
  const ids = orders.map((o) => o.id);

  const items = ids.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
    : [];
  const deliveryRows = ids.length
    ? await db.select().from(deliveries).where(inArray(deliveries.orderId, ids))
    : [];

  const itemsByOrder = new Map<number, typeof items>();
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.orderId, list);
  }
  const deliveryByOrder = new Map<number, { id: number; status: string }>();
  for (const d of deliveryRows) {
    if (d.orderId) deliveryByOrder.set(d.orderId, { id: d.id, status: d.status });
  }

  const combined = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    status: o.status,
    total: o.total,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    deliveryMethod: o.deliveryMethod,
    createdAt: o.createdAt,
    items: itemsByOrder.get(o.id) ?? [],
    delivery: deliveryByOrder.get(o.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Orders</h1>
      <p className="text-sm text-ink-700/80">Manage order and delivery statuses.</p>
      <OrdersManager orders={combined} />
    </div>
  );
}

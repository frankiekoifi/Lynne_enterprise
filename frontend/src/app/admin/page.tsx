import Link from "next/link";
import { Card, Stat, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { getAdminStats, getInventory } from "@/lib/data";
import { fmtKsh, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, inventory] = await Promise.all([getAdminStats(), getInventory()]);
  const lowStock = inventory.filter((v) => v.active && v.availableStock <= 5).slice(0, 6);

  const quickActions = [
    { href: "/admin/products/new", label: "Add Product", icon: "➕" },
    { href: "/admin/categories", label: "Add Category", icon: "🗂️" },
    { href: "/admin/orders", label: "View Orders", icon: "🧾" },
    { href: "/admin/payments", label: "Record Payment", icon: "💳" },
    { href: "/admin/customers", label: "View Customers", icon: "👥" },
    { href: "/admin/deliveries", label: "View Deliveries", icon: "🚚" },
    { href: "/admin/lipa", label: "Lipa Polepole", icon: "⚡" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-700/80">Your business at a glance.</p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <LinkButton key={a.href} href={a.href} variant="outline" size="sm">
            {a.icon} {a.label}
          </LinkButton>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total sales" value={fmtKsh(stats.totalSales)} />
        <Stat label="Today's sales" value={fmtKsh(stats.todaySales)} />
        <Stat label="Total orders" value={stats.totalOrders} sub={`${stats.pendingOrders} pending`} />
        <Stat label="Active Lipa plans" value={stats.activeLipaPlans} sub={`${stats.completedPlans} completed`} />
        <Stat label="Lipa collections" value={fmtKsh(stats.totalLipaCollections)} />
        <Stat label="Outstanding balances" value={fmtKsh(stats.outstandingLipaBalances)} />
        <Stat label="Pending deliveries" value={stats.pendingDeliveries} />
        <Stat label="Customers" value={stats.customers} sub={`${stats.lowStockProducts} low-stock items`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold text-ink-900">Recent transactions</h2>
          <div className="mt-3 divide-y divide-ink-100">
            {stats.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-mono text-xs text-ink-700/60">{t.reference}</p>
                  <p className="text-ink-700/70">{formatDateTime(t.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-ink-900">{fmtKsh(t.amount)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {stats.recentTransactions.length === 0 && (
              <p className="py-3 text-sm text-ink-700/60">No transactions yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink-900">Low-stock products</h2>
            <Link href="/admin/inventory" className="text-sm font-semibold text-brand-700 hover:underline">Inventory</Link>
          </div>
          <div className="mt-3 divide-y divide-ink-100">
            {lowStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-ink-900">{v.productName}</p>
                  <p className="text-xs text-ink-700/60">{v.name}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${v.availableStock <= 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {v.availableStock} left
                </span>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="py-3 text-sm text-ink-700/60">All products are well stocked. 🎉</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

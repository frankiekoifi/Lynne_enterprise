"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️" },
  { href: "/admin/inventory", label: "Inventory", icon: "📋" },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/lipa", label: "Lipa Polepole", icon: "⚡" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/requests", label: "Requests", icon: "↩️" },
  { href: "/admin/audit", label: "Audit Logs", icon: "🧾" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="lg:sticky lg:top-24">
      <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full",
                active ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-ink-100",
              )}
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

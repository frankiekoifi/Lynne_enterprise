"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/account", label: "Dashboard", icon: "🏠" },
  { href: "/account/lipa", label: "Lipa Polepole", icon: "⚡" },
  { href: "/account/orders", label: "Orders", icon: "📦" },
  { href: "/account/payments", label: "Payments", icon: "💳" },
  { href: "/account/notifications", label: "Notifications", icon: "🔔" },
  { href: "/account/addresses", label: "Addresses", icon: "📍" },
  { href: "/account/profile", label: "Profile", icon: "👤" },
];

export function AccountNav({ role, unread }: { role: string; unread: number }) {
  const pathname = usePathname();

  const link = (href: string) =>
    href === "/account" ? pathname === "/account" : pathname.startsWith(href);

  return (
    <div className="lg:sticky lg:top-24">
      <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full",
              link(it.href)
                ? "bg-brand-600 text-white"
                : "text-ink-700 hover:bg-ink-100",
            )}
          >
            <span>{it.icon}</span>
            <span>{it.label}</span>
            {it.href === "/account/notifications" && unread > 0 && (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-ink-950">
                {unread}
              </span>
            )}
          </Link>
        ))}
        {role === "admin" && (
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100 lg:w-full"
          >
            <span>🛠️</span>
            <span>Admin panel</span>
          </Link>
        )}
      </div>
    </div>
  );
}

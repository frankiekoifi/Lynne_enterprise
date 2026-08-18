import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui";
import { AdminNav } from "@/components/admin-nav";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/account");

  return (
    <Container className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Lynne Enterprise</h1>
          <p className="text-sm text-ink-700/70">Administration panel</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-brand-700 hover:underline">
          View store →
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

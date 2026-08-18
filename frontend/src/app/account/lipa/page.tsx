import Link from "next/link";
import { Card, ProgressBar, LinkButton, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { getCurrentUser } from "@/lib/session";
import { getLipaAccountsByUser } from "@/lib/data";
import { fmtKsh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyLipaPage() {
  const user = (await getCurrentUser())!;
  const accounts = await getLipaAccountsByUser(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">My Lipa Polepole</h1>
          <p className="mt-1 text-sm text-ink-700/80">Track your installments and progress.</p>
        </div>
        <LinkButton href="/shop?lipa=1" size="sm">Start new plan</LinkButton>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="No Lipa Polepole plans yet"
          message="Reserve a product and pay gradually — it's held for you from your first payment."
          action={<LinkButton href="/shop?lipa=1">Browse Lipa Polepole</LinkButton>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((a) => (
            <Link key={a.id} href={`/account/lipa/${a.id}`}>
              <Card className="p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-bold text-ink-900">{a.productName}</p>
                    <p className="text-sm text-ink-700/70">{a.variationName} · {a.accountNumber}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-ink-700/60">Total</p>
                    <p className="text-sm font-bold text-ink-900">{fmtKsh(a.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-700/60">Paid</p>
                    <p className="text-sm font-bold text-emerald-600">{fmtKsh(a.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-700/60">Remaining</p>
                    <p className="text-sm font-bold text-ink-900">{fmtKsh(a.remainingAmount)}</p>
                  </div>
                </div>
                <ProgressBar value={a.progress} className="mt-3" />
                <p className="mt-2 flex items-center justify-between text-xs text-ink-700/60">
                  <span>{a.progress}% paid</span>
                  <span>{formatDate(a.nextPaymentDue)}</span>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

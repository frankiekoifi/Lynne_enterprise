import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, ProgressBar } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { LipaActions } from "@/components/lipa-actions";
import { getCurrentUser } from "@/lib/session";
import { getLipaAccount, getSwitchableVariations } from "@/lib/data";
import { fmtKsh, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LipaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const account = await getLipaAccount(Number(id));
  if (!account || account.userId !== user.id) notFound();

  const switchable = await getSwitchableVariations();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-700/70">
        <Link href="/account/lipa" className="hover:text-brand-700">← My Lipa Polepole</Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {account.product?.name ?? "Product"} · {account.variation?.name}
          </h1>
          <p className="mt-1 text-sm text-ink-700/70">{account.accountNumber} · {account.planSnapshot}</p>
        </div>
        <StatusBadge status={account.status} />
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-ink-700/60">Total</p>
            <p className="text-xl font-bold text-ink-900">{fmtKsh(account.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-700/60">Paid</p>
            <p className="text-xl font-bold text-emerald-600">{fmtKsh(account.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-700/60">Remaining</p>
            <p className="text-xl font-bold text-ink-900">{fmtKsh(account.remainingAmount)}</p>
          </div>
        </div>
        <ProgressBar value={account.progress} className="mt-4" />
        <p className="mt-2 text-center text-sm text-ink-700/70">
          {account.progress}% paid
          {account.nextPaymentDue ? ` · next payment due ${formatDateTime(account.nextPaymentDue)}` : ""}
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Payment history</h2>
            {account.payments.length === 0 ? (
              <p className="mt-3 text-sm text-ink-700/70">No payments recorded yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-700/60">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Reference</th>
                      <th className="py-2 pr-4">Method</th>
                      <th className="py-2 pr-4 text-right">Amount</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {account.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 text-ink-700/80">{formatDateTime(p.createdAt)}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-ink-700/70">{p.reference}</td>
                        <td className="py-2.5 pr-4 uppercase text-ink-700/80">{p.method}</td>
                        <td className={`py-2.5 pr-4 text-right font-bold ${p.amount < 0 ? "text-red-600" : "text-ink-900"}`}>
                          {fmtKsh(p.amount)}
                        </td>
                        <td className="py-2.5"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Status history</h2>
            <ol className="mt-4 space-y-4">
              {account.history.map((h, i) => (
                <li key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`size-2.5 rounded-full ${i === 0 ? "bg-brand-600" : "bg-ink-200"}`} />
                    {i < account.history.length - 1 && <span className="w-px flex-1 bg-ink-100" />}
                  </div>
                  <div className="-mt-1 pb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-ink-700/60">{formatDateTime(h.createdAt)}</span>
                    </div>
                    {h.note && <p className="mt-1 text-sm text-ink-700/80">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <LipaActions
          account={{
            id: account.id,
            status: account.status,
            planSnapshot: account.planSnapshot,
            installmentAmount: account.plan?.installmentAmount ?? 0,
            remainingAmount: account.remainingAmount,
          }}
          variations={switchable}
        />
      </div>
    </div>
  );
}

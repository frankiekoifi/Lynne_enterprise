import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { getCurrentUser } from "@/lib/session";
import { getPaymentsByUser } from "@/lib/data";
import { fmtKsh, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = (await getCurrentUser())!;
  const payments = await getPaymentsByUser(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Payment history</h1>

      <Card className="overflow-hidden">
        {payments.length === 0 ? (
          <p className="p-6 text-sm text-ink-700/70">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-700/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-ink-700/80">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700/70">{p.reference}</td>
                    <td className="px-4 py-3 uppercase text-ink-700/80">{p.method}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700/70">{p.mpesaReceipt ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${p.amount < 0 ? "text-red-600" : "text-ink-900"}`}>
                      {fmtKsh(p.amount)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

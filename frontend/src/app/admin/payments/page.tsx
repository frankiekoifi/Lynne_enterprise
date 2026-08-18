import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { RecordPaymentForm } from "@/components/admin/operations";
import { getAllPayments, getCustomers, getAllLipaAccounts } from "@/lib/data";
import { fmtKsh, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [payments, customers, lipa] = await Promise.all([
    getAllPayments(300),
    getCustomers(),
    getAllLipaAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Payments</h1>

      <Card className="p-5">
        <h2 className="mb-3 font-bold text-ink-900">Record a payment</h2>
        <RecordPaymentForm
          customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
          lipaAccounts={lipa.map((a) => ({ id: a.id, accountNumber: a.accountNumber, userId: a.userId, customerName: a.customerName }))}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-700/60">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 text-ink-700/70">{formatDateTime(p.createdAt)}</td>
                  <td className="px-4 py-2.5">{p.customerName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-700/70">{p.reference}</td>
                  <td className="px-4 py-2.5 uppercase text-ink-700/70">{p.method}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${p.amount < 0 ? "text-red-600" : "text-ink-900"}`}>{fmtKsh(p.amount)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-700/60">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

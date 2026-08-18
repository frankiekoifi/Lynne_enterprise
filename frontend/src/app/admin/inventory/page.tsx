import { InventoryManager } from "@/components/admin/operations";
import { getInventory, getInventoryLog } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [rows, log] = await Promise.all([getInventory(), getInventoryLog(40)]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Inventory</h1>
      <p className="text-sm text-ink-700/80">
        Distinguishes total, available, reserved and sold stock. Every change is logged.
      </p>

      <InventoryManager rows={rows} />

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink-900">Recent stock movements</h2>
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-700/60">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5 text-ink-700/70">{formatDateTime(l.createdAt)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${l.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {l.change > 0 ? `+${l.change}` : l.change}
                  </td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium">{l.reason}</span></td>
                  <td className="px-4 py-2.5 text-ink-700/70">{l.note}</td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-700/60">No movements yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

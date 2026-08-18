import { Card } from "@/components/ui";
import { getAuditLogs } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await getAuditLogs(300);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Audit logs</h1>
      <p className="text-sm text-ink-700/80">Important business actions are recorded here.</p>

      <Card className="divide-y divide-ink-100">
        {logs.map((l) => (
          <div key={l.id} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs">🧾</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink-900">{l.action}</p>
              <p className="text-xs text-ink-700/60">
                {l.entity} {l.entityId ? `#${l.entityId}` : ""} · by {l.userName}
              </p>
              {l.newValue && (
                <p className="mt-1 truncate font-mono text-xs text-ink-700/50">{l.newValue}</p>
              )}
            </div>
            <span className="shrink-0 text-xs text-ink-700/50">{formatDateTime(l.createdAt)}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="px-4 py-6 text-sm text-ink-700/60">No audit logs yet.</p>}
      </Card>
    </div>
  );
}

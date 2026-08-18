import { RefundReview, SwitchReview } from "@/components/admin/operations";
import { getRefundRequests, getSwitchRequests } from "@/lib/data";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const [refunds, switches] = await Promise.all([getRefundRequests(), getSwitchRequests()]);
  const pendingRefunds = refunds.filter((r) => r.status === "requested" || r.status === "under_review").length;
  const pendingSwitches = switches.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Requests</h1>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink-900">
          Refund requests {pendingRefunds > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">{pendingRefunds} pending</span>}
        </h2>
        <Card className="space-y-3 p-4">
          {refunds.map((r) => <RefundReview key={r.id} request={r} />)}
          {refunds.length === 0 && <p className="text-sm text-ink-700/60">No refund requests.</p>}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink-900">
          Product switch requests {pendingSwitches > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">{pendingSwitches} pending</span>}
        </h2>
        <Card className="space-y-3 p-4">
          {switches.map((s) => <SwitchReview key={s.id} request={s} />)}
          {switches.length === 0 && <p className="text-sm text-ink-700/60">No switch requests.</p>}
        </Card>
      </div>
    </div>
  );
}

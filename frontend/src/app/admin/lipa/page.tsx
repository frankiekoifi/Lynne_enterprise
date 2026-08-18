import { LipaManager } from "@/components/admin/operations";
import { getAllLipaAccounts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminLipaPage() {
  const accounts = await getAllLipaAccounts();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Lipa Polepole</h1>
      <p className="text-sm text-ink-700/80">
        Track plans, record payments, grant extensions and manage statuses.
      </p>
      <LipaManager accounts={accounts} />
    </div>
  );
}

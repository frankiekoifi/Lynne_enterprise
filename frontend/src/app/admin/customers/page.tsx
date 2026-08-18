import { CustomersManager } from "@/components/admin/operations";
import { getCustomers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Customers</h1>
      <p className="text-sm text-ink-700/80">{customers.length} registered customers</p>
      <CustomersManager customers={customers} />
    </div>
  );
}

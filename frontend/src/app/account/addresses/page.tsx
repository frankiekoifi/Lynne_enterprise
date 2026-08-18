import { AddressManager } from "@/components/account-forms";
import { getCurrentUser } from "@/lib/session";
import { getAddresses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = (await getCurrentUser())!;
  const addresses = await getAddresses(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">My addresses</h1>
      <AddressManager addresses={addresses} />
    </div>
  );
}

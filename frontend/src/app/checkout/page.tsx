import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getAddresses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const [settings, addresses] = await Promise.all([getSettings(), getAddresses(user.id)]);

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900">Checkout</h1>
      <CheckoutForm
        settings={settings}
        addresses={addresses}
        userName={user.fullName}
        userPhone={user.phone}
      />
    </Container>
  );
}

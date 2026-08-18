import { Container } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">About {s.businessName}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-700/90">{s.description}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            ["🛍️", "Wide range", "Kitchen utensils, household products, bedding, furniture and more — with new categories added regularly."],
            ["⚡", "Lipa Polepole", "Pay in full or reserve products and pay gradually with flexible, per-product payment plans."],
            ["🚚", "Fast delivery", "Distance-based delivery pricing that&apos;s clear and configurable by the store."],
            ["🤝", "Trusted service", "Secure accounts, transparent payment history and order tracking."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <div className="text-3xl">{icon}</div>
              <h2 className="mt-3 font-bold text-ink-900">{title}</h2>
              <p className="mt-1 text-sm text-ink-700/80">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-brand-50 p-6">
          <h2 className="font-bold text-brand-900">Our promise</h2>
          <p className="mt-2 text-sm text-brand-800">
            Reliability first — every payment is recorded as an individual transaction, products are
            reserved the moment you commit, and your progress is always visible in your account.
          </p>
        </div>
      </div>
    </Container>
  );
}

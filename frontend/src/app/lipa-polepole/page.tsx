import { Container, SectionHeading, LinkButton } from "@/components/ui";
import { ProductGrid } from "@/components/product-grid";
import { listProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LipaPolepolePage() {
  const products = await listProducts({ lipaOnly: true, inStock: true });

  return (
    <div>
      <section className="bg-gradient-to-br from-accent-500 via-accent-400 to-brand-500 py-14 text-ink-950">
        <Container>
          <span className="text-xs font-bold uppercase tracking-widest">⚡ Flexible payments</span>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Lipa Polepole — reserve it now, pay little by little.
          </h1>
          <p className="mt-4 max-w-2xl text-ink-900/80">
            Choose a product, pick a payment plan that fits your budget, and pay your first
            installment. We reserve the product for you immediately and only release it once it&apos;s
            fully paid.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/shop?lipa=1" variant="primary">Browse Lipa Polepole products</LinkButton>
            <LinkButton href="/shop" variant="outline" className="bg-white/60">All products</LinkButton>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            ["🔒", "Reserved for you", "The moment your first payment lands, the physical item is taken off the shelf and kept for you."],
            ["📅", "Flexible plans", "Daily, weekly, biweekly or monthly — the administrator sets the exact plans per product."],
            ["🎉", "Collect when done", "Track your progress in your dashboard. Once fully paid, it&apos;s ready for collection or delivery."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 text-base font-bold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-700/80">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <SectionHeading
            title="Products available on Lipa Polepole"
            subtitle="Only the plans configured by the store are shown on each product."
          />
          {products.length === 0 ? (
            <p className="text-ink-700/70">No Lipa Polepole products right now — check back soon.</p>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </Container>
    </div>
  );
}

import Link from "next/link";
import { Container, SectionHeading, LinkButton } from "@/components/ui";
import { ProductGrid } from "@/components/product-grid";
import { getFeaturedProducts, getTopCategories } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { fmtKsh } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, categories, featured] = await Promise.all([
    getSettings(),
    getTopCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-accent-500/20 blur-3xl" />
        <Container className="relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/20">
              ⚡ Lipa Polepole now available
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Quality products for your home —{" "}
              <span className="text-accent-400">pay your way.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-brand-100/90">
              {settings.tagline || settings.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/shop" variant="accent" size="lg">
                Shop Now
              </LinkButton>
              <LinkButton href="/lipa-polepole" size="lg" className="bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20">
                Learn Lipa Polepole
              </LinkButton>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                ["4+", "Categories"],
                ["Buy full", "or in installments"],
                ["Fast", "delivery"],
              ].map(([a, b]) => (
                <div key={b} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  <p className="text-2xl font-bold text-white">{a}</p>
                  <p className="text-xs text-brand-100/80">{b}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-10">
                <HeroImg src="https://images.pexels.com/photos/16825059/pexels-photo-16825059.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600" />
                <HeroImg src="https://images.pexels.com/photos/20430670/pexels-photo-20430670.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600" />
              </div>
              <div className="space-y-4">
                <HeroImg src="https://images.pexels.com/photos/6957090/pexels-photo-6957090.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600" />
                <HeroImg src="https://images.pexels.com/photos/7765000/pexels-photo-7765000.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600" />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-14">
        <Container>
          <SectionHeading
            title="Shop by category"
            subtitle="Everything we stock — and more categories are added all the time."
            action={<LinkButton href="/categories" variant="outline" size="sm">View all</LinkButton>}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white"
              >
                <div className="aspect-[4/3] overflow-hidden bg-ink-100">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="size-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid size-full place-items-center text-4xl">🛒</div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-3 pt-8">
                  <p className="text-sm font-bold text-white">{c.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured products */}
      <section className="pb-14">
        <Container>
          <SectionHeading
            title="Popular right now"
            subtitle="Hand-picked favourites our customers love."
            action={<LinkButton href="/shop" variant="outline" size="sm">Browse all</LinkButton>}
          />
          <ProductGrid products={featured} />
        </Container>
      </section>

      {/* Lipa Polepole explainer */}
      <section className="bg-white py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-accent-600">
                Lipa Polepole
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900">
                Reserve now, pay gradually, collect when done.
              </h2>
              <p className="mt-4 text-ink-700/80">
                Don&apos;t miss out on the product you want. Pay a small first installment and the
                item is reserved for you immediately. Continue paying on a plan that works for you.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  ["1", "Choose your product & plan", "Pick a variation and a payment plan — daily, weekly, biweekly or monthly."],
                  ["2", "Make your first payment", "The physical product is instantly reserved and removed from available stock."],
                  ["3", "Pay gradually & collect", "Track your progress. Once fully paid, collect or get it delivered."],
                ].map(([n, t, d]) => (
                  <div key={n} className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500 text-base font-bold text-ink-950">
                      {n}
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">{t}</p>
                      <p className="text-sm text-ink-700/70">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <LinkButton href="/lipa-polepole" variant="accent" className="mt-8">
                See how it works
              </LinkButton>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-accent-50 p-6 sm:p-8">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/60">
                  Example · 6x6 Luxury Bed
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-ink-900">{fmtKsh(30000)}</span>
                  <span className="text-sm font-semibold text-brand-700">Lipa Polepole</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ["Daily", 500],
                    ["Weekly", 3000],
                    ["Biweekly", 6000],
                    ["Monthly", 12000],
                  ].map(([label, amt]) => (
                    <div key={label as string} className="rounded-xl border border-ink-100 p-3">
                      <p className="text-xs text-ink-700/70">{label}</p>
                      <p className="text-base font-bold text-brand-700">{fmtKsh(amt as number)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-700/60">
                  Plans are configured per product — so different products can offer different plans.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

function HeroImg({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-white/10" loading="lazy" />
  );
}

import Link from "next/link";
import { Container } from "@/components/ui";
import { getTopCategories, getSubcategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [top, subs] = await Promise.all([getTopCategories(), getSubcategories()]);
  const subsByParent = new Map<number, typeof subs>();
  for (const s of subs) {
    const list = subsByParent.get(s.parentId ?? 0) ?? [];
    list.push(s);
    subsByParent.set(s.parentId ?? 0, list);
  }

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Categories</h1>
      <p className="mt-1 text-sm text-ink-700/80">Browse everything we sell by category.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <Link href={`/categories/${c.slug}`} className="group block">
              <div className="aspect-[16/9] overflow-hidden bg-ink-100">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="size-full object-cover transition group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="grid size-full place-items-center text-5xl">🛒</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold text-ink-900">{c.name}</h2>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-700/70">{c.description}</p>}
              </div>
            </Link>
            {(subsByParent.get(c.id) ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-ink-100 px-4 py-3">
                {(subsByParent.get(c.id) ?? []).map((s) => (
                  <Link
                    key={s.id}
                    href={`/categories/${s.slug}`}
                    className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-brand-100 hover:text-brand-700"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Container>
  );
}

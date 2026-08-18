import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, EmptyState, LinkButton } from "@/components/ui";
import { ProductGrid } from "@/components/product-grid";
import { getCategoryBySlug, getSubcategories, listProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [subs, products] = await Promise.all([
    getSubcategories(category.id),
    listProducts({ categoryId: category.id }),
  ]);

  return (
    <Container className="py-8">
      <nav className="mb-4 text-sm text-ink-700/70">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/categories" className="hover:text-brand-700">Categories</Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-ink-900">{category.name}</span>
      </nav>

      <div className="mb-8 overflow-hidden rounded-3xl border border-ink-100 bg-white">
        <div className="relative">
          {category.imageUrl && (
            <div className="h-40 w-full overflow-hidden sm:h-52">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.imageUrl} alt={category.name} className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
            </div>
          )}
          <div className={category.imageUrl ? "absolute bottom-0 p-6" : "p-6"}>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-1 text-sm text-ink-700/80">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {subs.map((s) => (
            <Link
              key={s.id}
              href={`/categories/${s.slug}`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products yet"
          message="Products in this category will appear here."
          action={<LinkButton href="/shop" variant="outline">Browse all</LinkButton>}
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </Container>
  );
}

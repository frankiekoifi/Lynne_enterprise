import { Container, EmptyState, Select, Input } from "@/components/ui";
import { ProductGrid } from "@/components/product-grid";
import { listProducts, getAllCategories } from "@/lib/data";
import { LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const categories = await getAllCategories();
  const topCategories = categories.filter((c) => c.parentId === null);
  const subCategories = categories.filter((c) => c.parentId !== null);

  const q = one(sp.q) ?? "";
  const categoryId = one(sp.category) ? Number(one(sp.category)) : undefined;
  const lipaOnly = one(sp.lipa) === "1";
  const inStock = one(sp.stock) === "1";
  const minPrice = one(sp.min) ? Number(one(sp.min)) : undefined;
  const maxPrice = one(sp.max) ? Number(one(sp.max)) : undefined;
  const sort = (one(sp.sort) as "newest" | "price_asc" | "price_desc" | "popular") ?? "newest";

  const products = await listProducts({
    q,
    categoryId,
    lipaOnly,
    inStock,
    minPrice,
    maxPrice,
    sort,
  });

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Shop</h1>
          <p className="mt-1 text-sm text-ink-700/80">
            {products.length} {products.length === 1 ? "product" : "products"}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form action="/shop" method="get" className="mb-8 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Input name="q" defaultValue={q} placeholder="Search products…" />
          </div>
          <div>
            <Select name="category" defaultValue={categoryId ? String(categoryId) : ""}>
              <option value="">All categories</option>
              {topCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {subCategories.length > 0 && <optgroup label="Subcategories" />}
              {subCategories.map((c) => (
                <option key={c.id} value={c.id}>&nbsp;&nbsp;{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Select name="sort" defaultValue={sort}>
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-1">
            <Input name="min" type="number" placeholder="Min KSh" defaultValue={minPrice ?? ""} />
            <Input name="max" type="number" placeholder="Max KSh" defaultValue={maxPrice ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" name="lipa" value="1" defaultChecked={lipaOnly} className="size-4 rounded border-ink-300 accent-brand-600" />
              Lipa Polepole
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" name="stock" value="1" defaultChecked={inStock} className="size-4 rounded border-ink-300 accent-brand-600" />
              In stock
            </label>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Apply filters
          </button>
          <LinkButton href="/shop" variant="ghost" size="sm">Reset</LinkButton>
        </div>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No products found"
          message="Try adjusting your search or filters."
          action={<LinkButton href="/shop" variant="outline">Clear filters</LinkButton>}
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </Container>
  );
}

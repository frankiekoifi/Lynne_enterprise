import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, SectionHeading } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { ProductGrid } from "@/components/product-grid";
import { Gallery } from "@/components/gallery";
import { ProductBuy } from "@/components/product-buy";
import { getProductBySlug, listProducts } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const user = await getCurrentUser();
  const related = await listProducts({ categoryId: product.categoryId, inStock: true }).then((r) =>
    r.filter((p) => p.id !== product.id).slice(0, 4),
  );

  const hasLipa = product.lipaAvailable && product.variations.some((v) => v.lipaAvailable);

  return (
    <Container className="py-8">
      <nav className="mb-4 text-sm text-ink-700/70">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/categories/${product.categorySlug}`} className="hover:text-brand-700">
          {product.categoryName}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-semibold text-ink-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery images={product.images} name={product.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.cashAvailable && <StatusBadge status="active" />}
            {hasLipa && <StatusBadge status="ready_for_collection" />}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {product.name}
          </h1>
          {product.sku && <p className="mt-1 text-sm text-ink-700/60">SKU: {product.sku}</p>}
          {product.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700/90">{product.description}</p>
          )}

          <div className="my-6 h-px bg-ink-100" />

          <ProductBuy
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              coverImage: product.coverImage,
              cashAvailable: product.cashAvailable,
              lipaAvailable: hasLipa,
              variations: product.variations,
            }}
            isLoggedIn={!!user}
          />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <SectionHeading title="You may also like" />
          <ProductGrid products={related} />
        </div>
      )}
    </Container>
  );
}

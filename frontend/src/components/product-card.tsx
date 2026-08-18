import Link from "next/link";
import { Card } from "@/components/ui";
import { fmtKsh } from "@/lib/utils";

export function ProductCard({
  product,
}: {
  product: {
    id: number;
    name: string;
    slug: string;
    categoryName: string;
    coverImage: string | null;
    lipaAvailable: boolean;
    minPrice: number;
    maxPrice: number;
    availableStock: number;
  };
}) {
  const out = product.availableStock <= 0;
  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
          {product.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.coverImage}
              alt={product.name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid size-full place-items-center text-4xl">🛍️</div>
          )}
          {product.lipaAvailable && (
            <span className="absolute left-3 top-3 rounded-full bg-accent-500 px-2.5 py-1 text-[11px] font-bold text-ink-950 shadow-sm">
              Lipa Polepole
            </span>
          )}
          {out && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-white">
                Out of stock
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
            {product.categoryName}
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-ink-900">
            {product.name}
          </h3>
          <p className="mt-2 text-base font-bold text-ink-900">
            {product.minPrice === product.maxPrice
              ? fmtKsh(product.minPrice)
              : `${fmtKsh(product.minPrice)} – ${fmtKsh(product.maxPrice)}`}
          </p>
          <p className="mt-1 text-xs text-ink-700/70">
            {out ? "Unavailable" : `${product.availableStock} in stock`}
          </p>
        </div>
      </Card>
    </Link>
  );
}

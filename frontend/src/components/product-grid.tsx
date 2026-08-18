import { ProductCard } from "@/components/product-card";

export function ProductGrid({
  products,
}: {
  products: Array<Parameters<typeof ProductCard>[0]["product"]>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

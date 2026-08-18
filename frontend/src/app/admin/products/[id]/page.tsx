import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditPanel } from "@/components/admin/catalog";
import { getProductForAdmin, getAllCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProductForAdmin(Number(id));
  if (!data) notFound();
  const categories = await getAllCategories();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-700/70">
        <Link href="/admin/products" className="hover:text-brand-700">← Products</Link>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Edit product</h1>
      <ProductEditPanel
        product={data.product}
        categories={categories}
        variations={data.variations}
        plansByVariation={data.plansByVariation}
      />
    </div>
  );
}

import { ProductCreateForm } from "@/components/admin/catalog";
import { getAllCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getAllCategories();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Add product</h1>
      <ProductCreateForm categories={categories} />
    </div>
  );
}

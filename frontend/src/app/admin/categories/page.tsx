import { CategoryManager } from "@/components/admin/catalog";
import { getAllCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Categories</h1>
      <p className="text-sm text-ink-700/80">Fully dynamic — add categories and subcategories anytime.</p>
      <CategoryManager categories={categories} />
    </div>
  );
}

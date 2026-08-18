import Link from "next/link";
import { Card, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { getAdminProducts } from "@/lib/data";
import { fmtKsh } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Products</h1>
          <p className="text-sm text-ink-700/80">{products.length} products</p>
        </div>
        <LinkButton href="/admin/products/new">+ Add product</LinkButton>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-700/60">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Variations</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Lipa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                      {p.name}
                    </Link>
                    {p.sku && <p className="text-xs text-ink-700/60">SKU: {p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-700/80">{p.categoryName}</td>
                  <td className="px-4 py-3 text-center">{p.variationCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-ink-900">{p.availableStock}</span>
                    <span className="text-xs text-ink-700/60"> av · </span>
                    <span className="font-bold text-amber-600">{p.reservedStock}</span>
                    <span className="text-xs text-ink-700/60"> res</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">{p.hasLipa ? "⚡" : "—"}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-700/60">No products yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

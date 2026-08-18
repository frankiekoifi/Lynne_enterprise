"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Field, Input, Select, Textarea, Label } from "@/components/ui";
import { StatusBadge, PLAN_FREQUENCIES, frequencyLabel } from "@/components/status";
import { fmtKsh, cn } from "@/lib/utils";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  addVariationAction,
  updateVariationAction,
  deleteVariationAction,
  addPlanAction,
  updatePlanAction,
  deletePlanAction,
  adjustStockAction,
} from "@/lib/actions/admin";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: number | null;
  active: boolean;
}
interface Variation {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  cashAvailable: boolean;
  lipaAvailable: boolean;
  active: boolean;
}
interface Plan {
  id: number;
  name: string;
  frequency: string;
  installmentAmount: number;
  initialPayment: number;
  active: boolean;
}

function useRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  return { pending, run };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export function CategoryManager({ categories }: { categories: Category[] }) {
  const { pending, run } = useRefresh();
  const [msg, setMsg] = useState<string | null>(null);

  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      await createCategoryAction({
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? ""),
        imageUrl: String(fd.get("imageUrl") ?? ""),
        parentId: fd.get("parentId") ? Number(fd.get("parentId")) : null,
      });
      (e.currentTarget as HTMLFormElement).reset();
      setMsg("Category created ✓");
    });
  }

  const top = categories.filter((c) => c.parentId === null);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-bold text-ink-900">New category</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input name="name" placeholder="Category name" required />
          <Select name="parentId" defaultValue="">
            <option value="">No parent (top-level)</option>
            {top.map((c) => (
              <option key={c.id} value={c.id}>Subcategory of {c.name}</option>
            ))}
          </Select>
          <Input name="imageUrl" placeholder="Image URL (optional)" className="sm:col-span-2" />
          <Textarea name="description" placeholder="Description (optional)" className="sm:col-span-2" />
          <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-auto">Add category</Button>
        </form>
        {msg && <p className="mt-2 text-sm font-medium text-emerald-600">{msg}</p>}
      </Card>

      <Card className="divide-y divide-ink-100">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-900">
                {c.parentId ? "↳ " : ""}{c.name}
              </p>
              <p className="text-xs text-ink-700/60">/{c.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.active ? "active" : "cancelled"} />
              <Button
                size="sm"
                variant={c.active ? "ghost" : "outline"}
                disabled={pending}
                onClick={() => run(() => updateCategoryAction(c.id, { name: c.name, description: c.description ?? undefined, imageUrl: c.imageUrl ?? undefined, parentId: c.parentId, active: !c.active }))}
              >
                {c.active ? "Deactivate" : "Activate"}
              </Button>
              <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => deleteCategoryAction(c.id))}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="px-4 py-6 text-sm text-ink-700/60">No categories yet.</p>}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product create
// ---------------------------------------------------------------------------
interface PlanDraft { name: string; frequency: string; installment: number; initial: number }
interface VariationDraft { name: string; sku: string; price: number; stock: number; cash: boolean; lipa: boolean; plans: PlanDraft[] }

export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { pending, run } = useRefresh();
  const [error, setError] = useState<string | null>(null);
  const [variations, setVariations] = useState<VariationDraft[]>([
    { name: "", sku: "", price: 0, stock: 0, cash: true, lipa: false, plans: [] },
  ]);
  const top = categories.filter((c) => c.parentId === null);
  const subs = categories.filter((c) => c.parentId !== null);

  function updateVar(i: number, patch: Partial<VariationDraft>) {
    setVariations((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function updatePlan(vi: number, pi: number, patch: Partial<PlanDraft>) {
    setVariations((v) =>
      v.map((x, idx) =>
        idx === vi ? { ...x, plans: x.plans.map((p, j) => (j === pi ? { ...p, ...patch } : p)) } : x,
      ),
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const cleanVariations = variations
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        sku: v.sku || undefined,
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
        cash: v.cash,
        lipa: v.lipa,
        plans: v.plans
          .filter((p) => p.name.trim())
          .map((p) => ({ name: p.name.trim(), frequency: p.frequency, installment: Number(p.installment) || 0, initial: Number(p.initial) || undefined })),
      }));
    run(async () => {
      const res = await createProductAction({
        name: String(fd.get("name") ?? ""),
        sku: String(fd.get("sku") ?? ""),
        categoryId: Number(fd.get("categoryId")),
        subcategoryId: fd.get("subcategoryId") ? Number(fd.get("subcategoryId")) : null,
        description: String(fd.get("description") ?? ""),
        coverImage: String(fd.get("coverImage") ?? ""),
        status: String(fd.get("status") ?? "active"),
        cashAvailable: fd.get("cashAvailable") === "on",
        lipaAvailable: fd.get("lipaAvailable") === "on",
        variations: cleanVariations,
      });
      if (res.error) setError(res.error);
      else router.push("/admin/products");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-ink-900">Product details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product name" htmlFor="p-name"><Input id="p-name" name="name" required /></Field>
          <Field label="SKU" htmlFor="p-sku"><Input id="p-sku" name="sku" /></Field>
          <Field label="Category" htmlFor="p-cat">
            <Select id="p-cat" name="categoryId" required>
              <option value="">Select…</option>
              {top.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Subcategory (optional)" htmlFor="p-sub">
            <Select id="p-sub" name="subcategoryId" defaultValue="">
              <option value="">None</option>
              {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Cover image URL" htmlFor="p-img" hint="Paste an image URL.">
            <Input id="p-img" name="coverImage" />
          </Field>
          <Field label="Status" htmlFor="p-status">
            <Select id="p-status" name="status" defaultValue="active">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Textarea name="description" placeholder="Description" className="sm:col-span-2" />
          <div className="flex gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cashAvailable" defaultChecked className="size-4 accent-brand-600" /> Cash purchase</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lipaAvailable" className="size-4 accent-brand-600" /> Lipa Polepole</label>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-900">Variations</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => setVariations((v) => [...v, { name: "", sku: "", price: 0, stock: 0, cash: true, lipa: false, plans: [] }])}>
            + Add variation
          </Button>
        </div>

        {variations.map((v, vi) => (
          <div key={vi} className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Variation name (e.g. 6x6)" value={v.name} onChange={(e) => updateVar(vi, { name: e.target.value })} />
              <Input placeholder="SKU" value={v.sku} onChange={(e) => updateVar(vi, { sku: e.target.value })} />
              <Input type="number" placeholder="Price (KSh)" value={v.price || ""} onChange={(e) => updateVar(vi, { price: Number(e.target.value) })} />
              <Input type="number" placeholder="Stock" value={v.stock || ""} onChange={(e) => updateVar(vi, { stock: Number(e.target.value) })} />
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.cash} onChange={(e) => updateVar(vi, { cash: e.target.checked })} className="size-4 accent-brand-600" /> Cash</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.lipa} onChange={(e) => updateVar(vi, { lipa: e.target.checked })} className="size-4 accent-brand-600" /> Lipa</label>
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => setVariations((x) => x.filter((_, i) => i !== vi))}>
                  Remove
                </Button>
              </div>
            </div>

            {v.lipa && (
              <div className="mt-3 rounded-lg bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-800">Payment plans</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => updateVar(vi, { plans: [...v.plans, { name: "", frequency: "weekly", installment: 0, initial: 0 }] })}>
                    + Plan
                  </Button>
                </div>
                {v.plans.length === 0 && <p className="mt-2 text-xs text-ink-700/60">No plans added for this variation.</p>}
                {v.plans.map((p, pi) => (
                  <div key={pi} className="mt-2 grid gap-2 sm:grid-cols-5">
                    <Input placeholder="Plan name (e.g. Weekly)" value={p.name} onChange={(e) => updatePlan(vi, pi, { name: e.target.value })} />
                    <Select value={p.frequency} onChange={(e) => updatePlan(vi, pi, { frequency: e.target.value })}>
                      {PLAN_FREQUENCIES.map((f) => <option key={f} value={f}>{frequencyLabel(f)}</option>)}
                    </Select>
                    <Input type="number" placeholder="Installment" value={p.installment || ""} onChange={(e) => updatePlan(vi, pi, { installment: Number(e.target.value) })} />
                    <Input type="number" placeholder="First payment" value={p.initial || ""} onChange={(e) => updatePlan(vi, pi, { initial: Number(e.target.value) })} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => updateVar(vi, { plans: v.plans.filter((_, i) => i !== pi) })}>✕</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>

      <Button type="submit" disabled={pending} size="lg">{pending ? "Saving…" : "Create product"}</Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Product edit
// ---------------------------------------------------------------------------
export function ProductEditPanel({
  product,
  categories,
  variations,
  plansByVariation,
}: {
  product: { id: number; name: string; sku: string | null; categoryId: number; subcategoryId: number | null; description: string | null; coverImage: string | null; status: string; cashAvailable: boolean; lipaAvailable: boolean };
  categories: Category[];
  variations: Variation[];
  plansByVariation: Record<number, Plan[]>;
}) {
  const router = useRouter();
  const { pending, run } = useRefresh();
  const [msg, setMsg] = useState<string | null>(null);
  const top = categories.filter((c) => c.parentId === null);
  const subs = categories.filter((c) => c.parentId !== null);

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      await updateProductAction(product.id, {
        name: String(fd.get("name") ?? ""),
        sku: String(fd.get("sku") ?? ""),
        categoryId: Number(fd.get("categoryId")),
        subcategoryId: fd.get("subcategoryId") ? Number(fd.get("subcategoryId")) : null,
        description: String(fd.get("description") ?? ""),
        coverImage: String(fd.get("coverImage") ?? ""),
        status: String(fd.get("status") ?? "active"),
        cashAvailable: fd.get("cashAvailable") === "on",
        lipaAvailable: fd.get("lipaAvailable") === "on",
      });
      setMsg("Saved ✓");
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4">
        <Card className="space-y-4 p-5">
          <h2 className="font-bold text-ink-900">Product details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="pe-name"><Input id="pe-name" name="name" defaultValue={product.name} required /></Field>
            <Field label="SKU" htmlFor="pe-sku"><Input id="pe-sku" name="sku" defaultValue={product.sku ?? ""} /></Field>
            <Field label="Category" htmlFor="pe-cat">
              <Select id="pe-cat" name="categoryId" defaultValue={product.categoryId}>
                {top.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subcategory" htmlFor="pe-sub">
              <Select id="pe-sub" name="subcategoryId" defaultValue={product.subcategoryId ?? ""}>
                <option value="">None</option>
                {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Cover image URL" htmlFor="pe-img"><Input id="pe-img" name="coverImage" defaultValue={product.coverImage ?? ""} /></Field>
            <Field label="Status" htmlFor="pe-status">
              <Select id="pe-status" name="status" defaultValue={product.status}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Textarea name="description" defaultValue={product.description ?? ""} placeholder="Description" className="sm:col-span-2" />
            <div className="flex gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cashAvailable" defaultChecked={product.cashAvailable} className="size-4 accent-brand-600" /> Cash purchase</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lipaAvailable" defaultChecked={product.lipaAvailable} className="size-4 accent-brand-600" /> Lipa Polepole</label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>Save changes</Button>
            <Button type="button" variant="danger" disabled={pending} onClick={() => run(async () => { await deleteProductAction(product.id); router.push("/admin/products"); })}>
              Deactivate product
            </Button>
          </div>
          {msg && <p className="text-sm font-medium text-emerald-600">{msg}</p>}
        </Card>
      </form>

      <VariationManager productId={product.id} variations={variations} plansByVariation={plansByVariation} />
    </div>
  );
}

function VariationManager({
  productId,
  variations,
  plansByVariation,
}: {
  productId: number;
  variations: Variation[];
  plansByVariation: Record<number, Plan[]>;
}) {
  const { pending, run } = useRefresh();
  const [editing, setEditing] = useState<Record<number, Partial<Variation>>>({});

  function update(id: number) {
    const patch = editing[id];
    if (!patch) return;
    run(() => updateVariationAction(id, {
      name: patch.name,
      sku: patch.sku ?? "",
      price: patch.price,
      cashAvailable: patch.cashAvailable,
      lipaAvailable: patch.lipaAvailable,
      active: patch.active,
    }));
    setEditing((e) => { const n = { ...e }; delete n[id]; return n; });
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900">Variations & stock</h2>
        <AddVariationForm productId={productId} />
      </div>

      {variations.map((v) => (
        <div key={v.id} className="rounded-xl border border-ink-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink-900">{v.name}</span>
            <span className="text-xs text-ink-700/60">SKU: {v.sku ?? "—"}</span>
            <StatusBadge status={v.active ? "active" : "cancelled"} />
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing((e) => ({ ...e, [v.id]: { name: v.name, sku: v.sku ?? "", price: v.price, cashAvailable: v.cashAvailable, lipaAvailable: v.lipaAvailable, active: v.active } }))}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteVariationAction(v.id))}>Deactivate</Button>
            </div>
          </div>

          {editing[v.id] && (
            <div className="mt-3 grid gap-2 rounded-lg bg-ink-50 p-3 sm:grid-cols-3">
              <Input placeholder="Name" value={editing[v.id].name ?? ""} onChange={(e) => setEditing((ed) => ({ ...ed, [v.id]: { ...ed[v.id], name: e.target.value } }))} />
              <Input placeholder="SKU" value={editing[v.id].sku ?? ""} onChange={(e) => setEditing((ed) => ({ ...ed, [v.id]: { ...ed[v.id], sku: e.target.value } }))} />
              <Input type="number" placeholder="Price" value={editing[v.id].price ?? ""} onChange={(e) => setEditing((ed) => ({ ...ed, [v.id]: { ...ed[v.id], price: Number(e.target.value) } }))} />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing[v.id].cashAvailable ?? false} onChange={(e) => setEditing((ed) => ({ ...ed, [v.id]: { ...ed[v.id], cashAvailable: e.target.checked } }))} className="size-4 accent-brand-600" /> Cash</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing[v.id].lipaAvailable ?? false} onChange={(e) => setEditing((ed) => ({ ...ed, [v.id]: { ...ed[v.id], lipaAvailable: e.target.checked } }))} className="size-4 accent-brand-600" /> Lipa</label>
              </div>
              <Button size="sm" disabled={pending} onClick={() => update(v.id)}>Save</Button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            <StockPill label="Total" value={v.totalStock} />
            <StockPill label="Available" value={v.availableStock} tone="green" />
            <StockPill label="Reserved" value={v.reservedStock} tone="amber" />
            <StockPill label="Sold" value={v.soldStock} tone="gray" />
          </div>

          <AdjustStock variationId={v.id} />

          {(plansByVariation[v.id] ?? []).length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold uppercase text-ink-700/60">Payment plans</p>
              {plansByVariation[v.id].map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                  <span className="font-medium text-ink-800">{p.name} · {frequencyLabel(p.frequency)} · {fmtKsh(p.installmentAmount)}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.active ? "active" : "cancelled"} />
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => updatePlanAction(p.id, { active: !p.active }))}>
                      {p.active ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deletePlanAction(p.id))}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {v.lipaAvailable && <AddPlanForm variationId={v.id} />}
        </div>
      ))}
      {variations.length === 0 && <p className="text-sm text-ink-700/60">No variations yet — add one.</p>}
    </Card>
  );
}

function StockPill({ label, value, tone = "gray" }: { label: string; value: number; tone?: "gray" | "green" | "amber" }) {
  const tones = { gray: "bg-ink-100 text-ink-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" };
  return (
    <div className={cn("rounded-lg py-2", tones[tone])}>
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase">{label}</p>
    </div>
  );
}

function AdjustStock({ variationId }: { variationId: number }) {
  const { pending, run } = useRefresh();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("manual_adjustment");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Input type="number" placeholder="+/- units" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-28" />
      <Select value={reason} onChange={(e) => setReason(e.target.value)} className="w-44">
        <option value="new_stock">New stock</option>
        <option value="damaged">Damaged item</option>
        <option value="returned">Returned product</option>
        <option value="manual_adjustment">Manual adjustment</option>
      </Select>
      <Button size="sm" variant="outline" disabled={pending || !delta || Number(delta) === 0} onClick={() => run(async () => { await adjustStockAction({ variationId, delta: Number(delta), reason }); setDelta(""); })}>
        Adjust
      </Button>
    </div>
  );
}

function AddVariationForm({ productId }: { productId: number }) {
  const { pending, run } = useRefresh();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [lipa, setLipa] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-28" />
      <Input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24" />
      <Input placeholder="Stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-24" />
      <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={lipa} onChange={(e) => setLipa(e.target.checked)} className="size-4 accent-brand-600" /> Lipa</label>
      <Button size="sm" variant="outline" disabled={pending || !name} onClick={() => run(async () => { await addVariationAction(productId, { name, price: Number(price) || 0, stock: Number(stock) || 0, cash: true, lipa, plans: [] }); setName(""); setPrice(""); setStock(""); setLipa(false); })}>
        + Add
      </Button>
    </div>
  );
}

function AddPlanForm({ variationId }: { variationId: number }) {
  const { pending, run } = useRefresh();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [installment, setInstallment] = useState("");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Input placeholder="Plan name" value={name} onChange={(e) => setName(e.target.value)} className="w-32" />
      <Select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-32">
        {PLAN_FREQUENCIES.map((f) => <option key={f} value={f}>{frequencyLabel(f)}</option>)}
      </Select>
      <Input placeholder="Installment" type="number" value={installment} onChange={(e) => setInstallment(e.target.value)} className="w-28" />
      <Button size="sm" variant="outline" disabled={pending || !name} onClick={() => run(async () => { await addPlanAction(variationId, { name, frequency, installment: Number(installment) || 0 }); setName(""); setInstallment(""); })}>
        + Add plan
      </Button>
    </div>
  );
}

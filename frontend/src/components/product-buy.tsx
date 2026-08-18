"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useCart } from "@/components/cart-context";
import { Button, Card, ProgressBar } from "@/components/ui";
import { fmtKsh, cn } from "@/lib/utils";
import { frequencyLabel } from "@/components/status";
import { startLipaAction } from "@/lib/actions/customer";

interface Plan {
  id: number;
  name: string;
  frequency: string;
  installmentAmount: number;
  initialPayment: number;
}
interface Variation {
  id: number;
  name: string;
  price: number;
  availableStock: number;
  cashAvailable: boolean;
  lipaAvailable: boolean;
  plans: Plan[];
}

export function ProductBuy({
  product,
  isLoggedIn,
}: {
  product: {
    id: number;
    name: string;
    slug: string;
    coverImage: string | null;
    cashAvailable: boolean;
    lipaAvailable: boolean;
    variations: Variation[];
  };
  isLoggedIn: boolean;
}) {
  const { addItem } = useCart();
  const [selectedId, setSelectedId] = useState<number | null>(
    product.variations[0]?.id ?? null,
  );
  const [planId, setPlanId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => product.variations.find((v) => v.id === selectedId) ?? null,
    [product.variations, selectedId],
  );

  const selectedPlan = useMemo(
    () => selected?.plans.find((p) => p.id === planId) ?? null,
    [selected, planId],
  );

  async function handleAdd() {
    if (!selected) return;
    await addItem(selected.id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleStartLipa() {
    if (!selected || !selectedPlan) return;
    setError(null);
    startTransition(() => {
      startLipaAction({
        variationId: selected.id,
        planId: selectedPlan.id,
      }).catch((e) => setError(e?.message ?? "Something went wrong."));
    });
  }

  const outOfStock = !!(selected && selected.availableStock <= 0);

  return (
    <div className="space-y-6">
      {/* Variation selector */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-900">
          Options
          {selected ? (
            <span className="ml-2 font-normal text-ink-700/70">
              {selected.name}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {product.variations.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setSelectedId(v.id);
                setPlanId(null);
              }}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                selectedId === v.id
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 bg-white text-ink-800 hover:border-brand-400",
              )}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-ink-900">
          {selected ? fmtKsh(selected.price) : "—"}
        </span>
        {selected && selected.availableStock > 0 ? (
          <span className="mb-1 text-sm text-emerald-600">
            {selected.availableStock} in stock
          </span>
        ) : null}
        {outOfStock && (
          <span className="mb-1 text-sm font-semibold text-red-600">
            Out of stock
          </span>
        )}
      </div>

      {/* Buy in full */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-ink-200 bg-white">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid size-10 place-items-center text-ink-700 hover:bg-ink-100"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-semibold">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="grid size-10 place-items-center text-ink-700 hover:bg-ink-100"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <Button
          onClick={handleAdd}
          disabled={!selected || !selected.cashAvailable || outOfStock}
          className="flex-1 sm:flex-none sm:min-w-40"
        >
          {added ? "Added to cart ✓" : "Add to Cart"}
        </Button>
      </div>

      {!selected?.cashAvailable && (
        <p className="text-sm text-ink-700/70">
          This option is only available via Lipa Polepole.
        </p>
      )}

      {/* Lipa Polepole */}
      {product.lipaAvailable &&
        selected?.lipaAvailable &&
        selected.plans.length > 0 && (
          <Card className="border-accent-200 bg-accent-50/40 p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-accent-500 text-sm font-bold text-ink-950">
                ⚡
              </span>
              <h3 className="text-base font-bold text-ink-900">
                Lipa Polepole
              </h3>
            </div>
            <p className="mt-1 text-sm text-ink-700/80">
              Reserve this product now and pay gradually. It&apos;s held for you
              immediately.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {selected.plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    planId === p.id
                      ? "border-accent-500 bg-white ring-2 ring-accent-500/30"
                      : "border-ink-200 bg-white hover:border-accent-400",
                  )}
                >
                  <p className="text-sm font-bold text-ink-900">{p.name}</p>
                  <p className="mt-0.5 text-lg font-bold text-brand-700">
                    {fmtKsh(p.installmentAmount)}
                    <span className="text-xs font-medium text-ink-700/60">
                      {" "}
                      / {frequencyLabel(p.frequency).toLowerCase()}
                    </span>
                  </p>
                  {p.initialPayment > 0 && (
                    <p className="text-xs text-ink-700/60">
                      First payment {fmtKsh(p.initialPayment)}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {selectedPlan && (
              <div className="mt-4 rounded-xl bg-white p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-700/70">Total price</span>
                  <span className="font-bold text-ink-900">
                    {fmtKsh(selected.price)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-ink-700/70">Start today with</span>
                  <span className="font-bold text-brand-700">
                    {fmtKsh(selectedPlan.initialPayment)}
                  </span>
                </div>
                <ProgressBar
                  value={(selectedPlan.initialPayment / selected.price) * 100}
                  className="mt-3"
                  tone="accent"
                />
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
            )}

            {isLoggedIn ? (
              <Button
                variant="accent"
                className="mt-4 w-full"
                disabled={!selectedPlan || pending}
                onClick={handleStartLipa}
              >
                {pending ? "Reserving…" : "Start Lipa Polepole"}
              </Button>
            ) : (
              <Link
                href={`/login?next=/products/${product.slug}`}
                className="mt-4 block w-full rounded-xl bg-accent-500 px-4 py-3 text-center font-semibold text-ink-950 hover:bg-accent-400"
              >
                Log in to start Lipa Polepole
              </Link>
            )}
          </Card>
        )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import {
  Container,
  Button,
  Card,
  LinkButton,
  EmptyState,
} from "@/components/ui";
import { fmtKsh } from "@/lib/utils";
import { resolveCartItemsAction } from "@/lib/actions/customer";

type Resolved = Record<
  number,
  {
    variationId: number;
    name: string;
    price: number;
    availableStock: number;
    productName: string;
    coverImage: string | null;
    slug: string;
  }
>;

export default function CartPage() {
  const { items, setQty, removeItem, subtotal } = useCart();
  const [resolved, setResolved] = useState<Resolved>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!items.length) {
      setLoading(false);
      return;
    }
    resolveCartItemsAction(items.map((i) => i.variationId))
      .then((rows) => {
        const map: Resolved = {};
        for (const r of rows) map[r.variationId] = r;
        setResolved(map);
      })
      .finally(() => setLoading(false));
  }, [items]);

  const authoritativeSubtotal = items.reduce((a, i) => {
    const price = resolved[i.variationId]?.price ?? i.price;
    return a + price * i.quantity;
  }, 0);

  const shownSubtotal = Object.keys(resolved).length
    ? authoritativeSubtotal
    : subtotal;

  if (!items.length) {
    return (
      <Container className="py-12">
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          message="Browse our products and add something you love."
          action={<LinkButton href="/shop">Start shopping</LinkButton>}
        />
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900">
        Your cart
      </h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => {
            const r = resolved[item.variationId];
            const price = r?.price ?? item.price;
            const unavailable = r && r.availableStock < item.quantity;
            return (
              <Card key={item.id} className="flex gap-4 p-4">
                <Link
                  href={`/products/${item.slug}`}
                  className="size-20 shrink-0 overflow-hidden rounded-xl bg-ink-100"
                >
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-2xl">
                      🛍️
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="line-clamp-1 text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {r?.productName ?? item.productName}
                  </Link>
                  <p className="text-xs text-ink-700/70">
                    Option: {r?.name ?? item.name}
                  </p>
                  {unavailable && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Only {r!.availableStock} in stock
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-ink-200">
                      <button
                        onClick={() => setQty(item.id, item.quantity - 1)}
                        className="grid size-8 place-items-center text-ink-700 hover:bg-ink-100"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => setQty(item.id, item.quantity + 1)}
                        className="grid size-8 place-items-center text-ink-700 hover:bg-ink-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-ink-900">
                        {fmtKsh(price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm font-semibold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div>
          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Order summary</h2>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-ink-700/70">Subtotal</span>
              <span className="font-bold text-ink-900">
                {fmtKsh(shownSubtotal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-700/60">
              Delivery is calculated at checkout based on your location.
            </p>
            <LinkButton href="/checkout" className="mt-4 w-full" size="lg">
              Proceed to checkout
            </LinkButton>
            <Link
              href="/shop"
              className="mt-3 block text-center text-sm font-semibold text-brand-700 hover:underline"
            >
              Continue shopping
            </Link>
          </Card>
        </div>
      </div>
    </Container>
  );
}

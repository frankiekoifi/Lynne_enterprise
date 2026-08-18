"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useCart } from "@/components/cart-context";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { fmtKsh } from "@/lib/utils";
import { placeOrderAction, resolveCartItemsAction } from "@/lib/actions/customer";
import type { BusinessSettings } from "@/lib/settings";

type Resolved = Record<
  number,
  { variationId: number; name: string; price: number; availableStock: number; productName: string; slug: string }
>;

export function CheckoutForm({
  settings,
  addresses,
  userName,
  userPhone,
}: {
  settings: BusinessSettings;
  addresses: Array<{ id: number; label: string; town: string | null; area: string | null; details: string | null; phone: string | null }>;
  userName: string;
  userPhone: string | null;
}) {
  const router = useRouter();
  const { items, clear } = useCart();
  const [resolved, setResolved] = useState<Resolved>({});
  const [method, setMethod] = useState<"delivery" | "collection">("delivery");
  const [payment, setPayment] = useState("mpesa");
  const [distanceKm, setDistanceKm] = useState("");
  const [addressSelect, setAddressSelect] = useState<string>(
    addresses[0] ? String(addresses[0].id) : "new",
  );
  const [manualAddress, setManualAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!items.length) return;
    resolveCartItemsAction(items.map((i) => i.variationId)).then((rows) => {
      const map: Resolved = {};
      for (const r of rows) map[r.variationId] = r;
      setResolved(map);
    });
  }, [items]);

  const lines = useMemo(
    () =>
      items.map((i) => {
        const price = resolved[i.variationId]?.price ?? i.price;
        return { ...i, price, total: price * i.quantity };
      }),
    [items, resolved],
  );

  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  const km = Number(distanceKm || 0);
  const deliveryFee = useMemo(() => {
    if (method !== "delivery") return 0;
    if (!settings.deliveryEnabled) return 0;
    if (settings.maximumDeliveryDistance > 0 && km > settings.maximumDeliveryDistance) return -1;
    const fee = Math.max(settings.minimumDeliveryCharge, km * settings.deliveryRatePerKm);
    if (settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver) return 0;
    return Math.round(fee);
  }, [method, km, subtotal, settings]);

  const total = deliveryFee >= 0 ? subtotal + deliveryFee : subtotal;

  const addressText = useMemo(() => {
    if (method === "collection") return "Collection in store";
    if (addressSelect !== "new") {
      const a = addresses.find((x) => String(x.id) === addressSelect);
      return a ? [a.details, a.area, a.town].filter(Boolean).join(", ") : manualAddress;
    }
    return manualAddress;
  }, [method, addressSelect, manualAddress, addresses]);

  function submit() {
    setError(null);
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (method === "delivery" && !addressText.trim()) {
      setError("Please provide a delivery address.");
      return;
    }
    startTransition(async () => {
      const res = await placeOrderAction({
        items: items.map((i) => ({ variationId: i.variationId, quantity: i.quantity })),
        deliveryMethod: method,
        addressText,
        distanceKm: method === "delivery" ? km : 0,
        notes,
        paymentMethod: payment,
      });
      if (res.error) {
        setError(res.error);
      } else if (res.orderId) {
        clear();
        router.push(`/account/orders/${res.orderId}?placed=1`);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card className="p-5">
          <h2 className="font-bold text-ink-900">1. Delivery method</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod("delivery")}
              className={`rounded-xl border p-4 text-left ${method === "delivery" ? "border-brand-600 ring-2 ring-brand-500/20" : "border-ink-200"}`}
            >
              <p className="text-2xl">🚚</p>
              <p className="mt-1 font-semibold text-ink-900">Delivery</p>
              <p className="text-xs text-ink-700/70">
                {settings.deliveryRatePerKm > 0 ? `${fmtKsh(settings.deliveryRatePerKm)} per km` : "Calculated at checkout"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMethod("collection")}
              className={`rounded-xl border p-4 text-left ${method === "collection" ? "border-brand-600 ring-2 ring-brand-500/20" : "border-ink-200"}`}
            >
              <p className="text-2xl">🏬</p>
              <p className="mt-1 font-semibold text-ink-900">Collect in store</p>
              <p className="text-xs text-ink-700/70">Free collection</p>
            </button>
          </div>

          {method === "delivery" && (
            <div className="mt-4 space-y-3">
              <Field label="Distance from store (km)" htmlFor="km">
                <Input
                  id="km"
                  type="number"
                  min="0"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="e.g. 12"
                />
              </Field>
              {deliveryFee < 0 && (
                <p className="text-sm font-semibold text-red-600">
                  This location is beyond our maximum delivery distance ({settings.maximumDeliveryDistance} km).
                </p>
              )}
              <Field label="Delivery address" htmlFor="address">
                <Select
                  id="address"
                  value={addressSelect}
                  onChange={(e) => setAddressSelect(e.target.value)}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.label}: {[a.details, a.area, a.town].filter(Boolean).join(", ")}
                    </option>
                  ))}
                  <option value="new">Use a new address</option>
                </Select>
              </Field>
              {addressSelect === "new" && (
                <Textarea
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Street, building, area, town"
                />
              )}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-ink-900">2. Payment method</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["mpesa", "M-Pesa"],
              ["cash", "Cash"],
              ["card", "Card"],
              ["bank", "Bank"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPayment(val)}
                className={`rounded-xl border p-3 text-sm font-semibold ${payment === val ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20" : "border-ink-200 text-ink-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {payment === "mpesa" && (
            <p className="mt-3 text-xs text-ink-700/60">
              You&apos;ll receive an M-Pesa prompt to complete payment.
            </p>
          )}
          <Field label="Order notes (optional)" htmlFor="notes" hint="Any special instructions.">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>
      </div>

      <div>
        <Card className="p-5">
          <h2 className="font-bold text-ink-900">Summary</h2>
          <div className="mt-4 space-y-2">
            {lines.map((l) => (
              <div key={l.variationId} className="flex justify-between text-sm">
                <span className="text-ink-700/80">
                  {resolved[l.variationId]?.productName ?? l.productName} × {l.quantity}
                </span>
                <span className="font-medium text-ink-900">{fmtKsh(l.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-700/70">Subtotal</span>
              <span className="font-medium">{fmtKsh(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-700/70">Delivery</span>
              <span className="font-medium">
                {method === "collection" ? "Free" : deliveryFee < 0 ? "—" : fmtKsh(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
              <span>Total</span>
              <span>{fmtKsh(total)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <Button onClick={submit} disabled={pending || deliveryFee < 0} className="mt-4 w-full" size="lg">
            {pending ? "Placing order…" : "Place order"}
          </Button>
          <p className="mt-2 text-center text-xs text-ink-700/60">
            Ordering as {userName}{userPhone ? ` · ${userPhone}` : ""}
          </p>
        </Card>
      </div>
    </div>
  );
}

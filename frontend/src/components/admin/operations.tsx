"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Field, Input, Select, ProgressBar } from "@/components/ui";
import { StatusBadge, ORDER_STATUSES, DELIVERY_STATUSES, LIPA_STATUSES, PAYMENT_METHODS, statusLabel } from "@/components/status";
import { fmtKsh, formatDateTime, cn } from "@/lib/utils";
import {
  recordManualPaymentAction,
  updateOrderStatusAction,
  updateDeliveryStatusAction,
  setLipaStatusAction,
  grantExtensionAction,
  cancelLipaAction,
  reviewRefundAction,
  reviewSwitchAction,
  adjustStockAction,
  setCustomerStatusAction,
} from "@/lib/actions/admin";

function useRun() {
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
export function RecordPaymentForm({
  customers,
  lipaAccounts,
}: {
  customers: Array<{ id: number; fullName: string }>;
  lipaAccounts: Array<{ id: number; accountNumber: string; userId: number; customerName: string }>;
}) {
  const { pending, run } = useRun();
  const [userId, setUserId] = useState("");
  const [lipaId, setLipaId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const customerLipa = lipaAccounts.filter((a) => String(a.userId) === userId);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const res = await recordManualPaymentAction({
        userId: Number(userId),
        amount: Number(fd.get("amount")),
        method: String(fd.get("method") ?? "mpesa"),
        lipaAccountId: lipaId ? Number(lipaId) : null,
        notes: String(fd.get("notes") ?? ""),
      });
      setMsg(res.error ?? "Payment recorded ✓");
      (e.currentTarget as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Customer" htmlFor="rp-user">
        <Select id="rp-user" value={userId} onChange={(e) => { setUserId(e.target.value); setLipaId(""); }} required>
          <option value="">Select…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </Select>
      </Field>
      <Field label="Amount (KSh)" htmlFor="rp-amount">
        <Input id="rp-amount" name="amount" type="number" required />
      </Field>
      <Field label="Method" htmlFor="rp-method">
        <Select id="rp-method" name="method" defaultValue="mpesa">
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </Select>
      </Field>
      <Field label="Apply to Lipa account (optional)" htmlFor="rp-lipa">
        <Select id="rp-lipa" value={lipaId} onChange={(e) => setLipaId(e.target.value)}>
          <option value="">None</option>
          {customerLipa.map((a) => <option key={a.id} value={a.id}>{a.accountNumber} · {a.customerName}</option>)}
        </Select>
      </Field>
      <Input name="notes" placeholder="Notes (optional)" />
      <Button type="submit" disabled={pending || !userId}>Record payment</Button>
      {msg && <p className={cn("sm:col-span-2 text-sm font-medium", msg.startsWith("Payment") ? "text-emerald-600" : "text-red-600")}>{msg}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
export function OrdersManager({
  orders,
}: {
  orders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    status: string;
    total: number;
    subtotal: number;
    deliveryFee: number;
    deliveryMethod: string;
    createdAt: Date;
    items: Array<{ id: number; productName: string; variationName: string; quantity: number; total: number }>;
    delivery: { id: number; status: string } | null;
  }>;
}) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Card className="divide-y divide-ink-100">
      {orders.map((o) => (
        <div key={o.id}>
          <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-50" onClick={() => setOpen(open === o.id ? null : o.id)}>
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{o.orderNumber}</p>
              <p className="text-xs text-ink-700/60">{o.customerName} · {formatDateTime(o.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-ink-900">{fmtKsh(o.total)}</span>
              <StatusBadge status={o.status} />
              <span className="text-ink-700/50">{open === o.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {open === o.id && (
            <div className="space-y-4 bg-ink-50/50 px-4 py-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-ink-700/60">Items</p>
                <div className="divide-y divide-ink-100 rounded-lg bg-white">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-ink-800">{it.productName} · {it.variationName} × {it.quantity}</span>
                      <span className="font-medium">{fmtKsh(it.total)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-700/60">
                  Subtotal {fmtKsh(o.subtotal)} · Delivery {fmtKsh(o.deliveryFee)} · {o.deliveryMethod}
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <Field label="Order status">
                  <Select defaultValue={o.status} onChange={(e) => run(() => updateOrderStatusAction(o.id, e.target.value))} disabled={pending} className="w-44">
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </Select>
                </Field>
                {o.delivery && (
                  <Field label="Delivery status">
                    <Select defaultValue={o.delivery.status} onChange={(e) => run(() => updateDeliveryStatusAction(o.delivery!.id, e.target.value))} disabled={pending} className="w-44">
                      {DELIVERY_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </Select>
                  </Field>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      {orders.length === 0 && <p className="px-4 py-6 text-sm text-ink-700/60">No orders yet.</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
export function LipaManager({
  accounts,
}: {
  accounts: Array<{
    id: number;
    accountNumber: string;
    userId: number;
    customerName: string;
    productName: string;
    variationName: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    progress: number;
    planSnapshot: string;
    nextPaymentDue: Date | null;
  }>;
}) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Card className="divide-y divide-ink-100">
      {accounts.map((a) => (
        <div key={a.id}>
          <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-50" onClick={() => setOpen(open === a.id ? null : a.id)}>
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{a.productName} · {a.variationName}</p>
              <p className="text-xs text-ink-700/60">{a.accountNumber} · {a.customerName} · {a.planSnapshot}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs text-ink-700/60">Paid {fmtKsh(a.paidAmount)} / {fmtKsh(a.totalAmount)}</p>
                <ProgressBar value={a.progress} className="mt-1 w-24" />
              </div>
              <StatusBadge status={a.status} />
              <span className="text-ink-700/50">{open === a.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {open === a.id && (
            <div className="space-y-4 bg-ink-50/50 px-4 py-4">
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-white p-3 text-center text-sm">
                <div><p className="text-xs text-ink-700/60">Total</p><p className="font-bold">{fmtKsh(a.totalAmount)}</p></div>
                <div><p className="text-xs text-ink-700/60">Paid</p><p className="font-bold text-emerald-600">{fmtKsh(a.paidAmount)}</p></div>
                <div><p className="text-xs text-ink-700/60">Remaining</p><p className="font-bold">{fmtKsh(a.remainingAmount)}</p></div>
              </div>

              <LipaPaymentForm account={a} />

              <div className="flex flex-wrap items-end gap-3">
                <Field label="Set status">
                  <Select defaultValue={a.status} onChange={(e) => run(() => setLipaStatusAction(a.id, e.target.value))} disabled={pending} className="w-48">
                    {LIPA_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </Select>
                </Field>
                <GrantExtension account={a} />
                <Button size="sm" variant="danger" disabled={pending || ["cancelled", "refunded", "delivered"].includes(a.status)} onClick={() => run(() => cancelLipaAction(a.id, "Cancelled by admin"))}>
                  Cancel plan
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {accounts.length === 0 && <p className="px-4 py-6 text-sm text-ink-700/60">No Lipa Polepole accounts yet.</p>}
    </Card>
  );
}

function LipaPaymentForm({ account }: { account: { id: number; userId: number; accountNumber: string } }) {
  const { pending, run } = useRun();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mpesa");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28" />
      <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-28">
        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
      </Select>
      <Button size="sm" variant="outline" disabled={pending || !amount} onClick={() => run(async () => { const r = await recordManualPaymentAction({ userId: account.userId, amount: Number(amount), method, lipaAccountId: account.id, notes: "Recorded by admin" }); setMsg(r.error ?? `Payment applied to ${account.accountNumber} ✓`); setAmount(""); })}>
        Apply payment
      </Button>
      {msg && <p className={cn("text-sm font-medium", msg.startsWith("Payment") ? "text-emerald-600" : "text-red-600")}>{msg}</p>}
    </div>
  );
}

function GrantExtension({ account }: { account: { id: number } }) {
  const { pending, run } = useRun();
  const [due, setDue] = useState("");
  return (
    <div className="flex items-end gap-2">
      <Field label="Extend due date">
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
      </Field>
      <Button size="sm" variant="outline" disabled={pending || !due} onClick={() => run(async () => { await grantExtensionAction(account.id, due, "Extension granted"); setDue(""); })}>
        Grant
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function RefundReview({ request }: {
  request: {
    id: number; customerName: string; amount: number; reason: string | null; status: string; createdAt: Date; lipaAccountId: number | null; orderId: number | null;
  };
}) {
  const { pending, run } = useRun();
  const [amount, setAmount] = useState(String(request.amount));
  const [method, setMethod] = useState("mpesa");
  const [note, setNote] = useState("");

  if (request.status !== "requested" && request.status !== "under_review") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-ink-100 p-4">
        <div>
          <p className="font-semibold text-ink-900">#{request.id} · {request.customerName}</p>
          <p className="text-sm text-ink-700/70">Requested {fmtKsh(request.amount)} · {request.reason}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">#{request.id} · {request.customerName}</p>
        <StatusBadge status={request.status} />
      </div>
      <p className="mt-1 text-sm text-ink-700/70">Requested {fmtKsh(request.amount)} · {request.reason ?? "No reason given"}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28" placeholder="Amount" />
        <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-28">
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </Select>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-40" />
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reviewRefundAction({ requestId: request.id, decision: "approved", refundAmount: Number(amount), refundMethod: method, adminNote: note }))}>
          Approve
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => reviewRefundAction({ requestId: request.id, decision: "rejected", adminNote: note }))}>
          Reject
        </Button>
      </div>
    </div>
  );
}

export function InventoryManager({
  rows,
}: {
  rows: Array<{
    id: number;
    productName: string;
    name: string;
    sku: string | null;
    price: number;
    totalStock: number;
    availableStock: number;
    reservedStock: number;
    soldStock: number;
    active: boolean;
  }>;
}) {
  const { pending, run } = useRun();
  const [delta, setDelta] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-700/60">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Available</th>
              <th className="px-4 py-3 text-center">Reserved</th>
              <th className="px-4 py-3 text-center">Sold</th>
              <th className="px-4 py-3">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((v) => (
              <tr key={v.id} className="hover:bg-ink-50/60">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-ink-900">{v.productName}</p>
                  <p className="text-xs text-ink-700/60">{v.name}{v.sku ? ` · ${v.sku}` : ""}</p>
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{fmtKsh(v.price)}</td>
                <td className="px-4 py-2.5 text-center">{v.totalStock}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-emerald-600">{v.availableStock}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-amber-600">{v.reservedStock}</td>
                <td className="px-4 py-2.5 text-center">{v.soldStock}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="±"
                      value={delta[v.id] ?? ""}
                      onChange={(e) => setDelta((d) => ({ ...d, [v.id]: e.target.value }))}
                      className="w-20 py-1.5"
                    />
                    <Select
                      value={reason[v.id] ?? "manual_adjustment"}
                      onChange={(e) => setReason((r) => ({ ...r, [v.id]: e.target.value }))}
                      className="w-36 py-1.5"
                    >
                      <option value="new_stock">New stock</option>
                      <option value="damaged">Damaged</option>
                      <option value="returned">Returned</option>
                      <option value="manual_adjustment">Adjustment</option>
                    </Select>
                    <Button size="sm" variant="outline" disabled={pending || !delta[v.id] || Number(delta[v.id]) === 0} onClick={() => run(async () => { await adjustStockAction({ variationId: v.id, delta: Number(delta[v.id]), reason: reason[v.id] ?? "manual_adjustment" }); setDelta((d) => { const n = { ...d }; delete n[v.id]; return n; }); })}>
                      Go
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-700/60">No variations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function CustomersManager({
  customers,
}: {
  customers: Array<{ id: number; fullName: string; email: string; phone: string | null; status: string; createdAt: Date }>;
}) {
  const { pending, run } = useRun();
  return (
    <Card className="divide-y divide-ink-100">
      {customers.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{c.fullName}</p>
            <p className="truncate text-xs text-ink-700/60">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <Button
              size="sm"
              variant={c.status === "active" ? "ghost" : "outline"}
              disabled={pending}
              onClick={() => run(() => setCustomerStatusAction(c.id, c.status === "active" ? "suspended" : "active"))}
            >
              {c.status === "active" ? "Suspend" : "Activate"}
            </Button>
          </div>
        </div>
      ))}
      {customers.length === 0 && <p className="px-4 py-6 text-sm text-ink-700/60">No customers yet.</p>}
    </Card>
  );
}

export function SwitchReview({ request }: {
  request: {
    id: number; accountNumber: string; customerName: string; fromName: string; toName: string; reason: string | null; status: string; createdAt: Date;
  };
}) {
  const { pending, run } = useRun();
  const [note, setNote] = useState("");

  if (request.status !== "pending") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-ink-100 p-4">
        <div>
          <p className="font-semibold text-ink-900">{request.accountNumber} · {request.customerName}</p>
          <p className="text-sm text-ink-700/70">{request.fromName} → {request.toName}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">{request.accountNumber} · {request.customerName}</p>
        <StatusBadge status={request.status} />
      </div>
      <p className="mt-1 text-sm text-ink-700/70">{request.fromName} → {request.toName} · {request.reason ?? "No reason given"}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-48" />
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reviewSwitchAction({ requestId: request.id, decision: "approved", adminNote: note }))}>
          Approve
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => reviewSwitchAction({ requestId: request.id, decision: "rejected", adminNote: note }))}>
          Reject
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => reviewSwitchAction({ requestId: request.id, decision: "more_info", adminNote: note }))}>
          Need info
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea, Card } from "@/components/ui";
import { fmtKsh } from "@/lib/utils";
import {
  payInstallmentAction,
  requestSwitchAction,
  requestRefundAction,
} from "@/lib/actions/customer";

export function PayInstallment({
  accountId,
  defaultAmount,
  currency,
}: {
  accountId: number;
  defaultAmount: number;
  currency?: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(defaultAmount || 0));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await payInstallmentAction({ accountId, amount: Number(amount) });
        setOk(true);
        setTimeout(() => router.refresh(), 400);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment failed.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-end gap-3">
        <Field label="Amount (KSh)" htmlFor="amount">
          <Input
            id="amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={pending} variant="accent">
          {pending ? "Paying…" : "Pay via M-Pesa"}
        </Button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {ok && <p className="text-sm font-medium text-emerald-600">Payment recorded ✓</p>}
    </form>
  );
}

export function SwitchRequest({
  accountId,
  variations,
}: {
  accountId: number;
  variations: Array<{ id: number; name: string; price: number; productName: string }>;
}) {
  const [toVariationId, setToVariationId] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await requestSwitchAction({ accountId, toVariationId: Number(toVariationId), reason });
        setMsg("Switch request submitted for review ✓");
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Failed to submit.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Switch to product" htmlFor="switch-to">
        <Select id="switch-to" value={toVariationId} onChange={(e) => setToVariationId(e.target.value)} required>
          <option value="">Select a product…</option>
          {variations.map((v) => (
            <option key={v.id} value={v.id}>
              {v.productName} — {v.name} ({fmtKsh(v.price)})
            </option>
          ))}
        </Select>
      </Field>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why would you like to switch?" />
      <Button type="submit" variant="outline" disabled={pending || !toVariationId}>
        Request switch
      </Button>
      {msg && <p className="text-sm font-medium text-ink-700">{msg}</p>}
    </form>
  );
}

export function RefundRequest({ accountId }: { accountId: number }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await requestRefundAction({ lipaAccountId: accountId, amount: Number(amount), reason });
        setMsg("Refund request submitted for review ✓");
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Failed to submit.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Refund amount (KSh)" htmlFor="refund-amount">
        <Input id="refund-amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for refund request" />
      <Button type="submit" variant="outline" disabled={pending || !amount}>
        Request refund
      </Button>
      {msg && <p className="text-sm font-medium text-ink-700">{msg}</p>}
    </form>
  );
}

export function OrderRefundRequest({ orderId }: { orderId: number }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await requestRefundAction({ orderId, amount: Number(amount), reason });
        setMsg("Refund request submitted for review ✓");
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Failed to submit.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Refund amount (KSh)" htmlFor="order-refund-amount">
        <Input id="order-refund-amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for refund request" />
      <Button type="submit" variant="outline" disabled={pending || !amount}>
        Request refund
      </Button>
      {msg && <p className="text-sm font-medium text-ink-700">{msg}</p>}
    </form>
  );
}

export function LipaActions({
  account,
  variations,
  currency,
}: {
  account: {
    id: number;
    status: string;
    planSnapshot: string;
    installmentAmount: number;
    remainingAmount: number;
  };
  variations: Array<{ id: number; name: string; price: number; productName: string }>;
  currency?: string;
}) {
  const canPay = ["active", "payment_due", "overdue", "extension_approved"].includes(account.status);

  return (
    <Card className="space-y-6 p-5">
      <div>
        <h3 className="font-bold text-ink-900">Make a payment</h3>
        <p className="mt-1 text-xs text-ink-700/60">Remaining: {fmtKsh(account.remainingAmount)} · {account.planSnapshot}</p>
        {canPay ? (
          <div className="mt-3">
            <PayInstallment accountId={account.id} defaultAmount={account.installmentAmount} currency={currency} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-700/70">
            {account.status === "pending"
              ? "Complete your first payment to activate this plan."
              : "Payments are not currently available for this plan."}
          </p>
        )}
      </div>

      {["active", "payment_due", "overdue"].includes(account.status) && (
        <div className="border-t border-ink-100 pt-5">
          <h3 className="font-bold text-ink-900">Request a product switch</h3>
          <div className="mt-3">
            <SwitchRequest accountId={account.id} variations={variations} />
          </div>
        </div>
      )}

      {["active", "payment_due", "overdue", "pending"].includes(account.status) && (
        <div className="border-t border-ink-100 pt-5">
          <h3 className="font-bold text-ink-900">Request a refund</h3>
          <div className="mt-3">
            <RefundRequest accountId={account.id} />
          </div>
        </div>
      )}
    </Card>
  );
}

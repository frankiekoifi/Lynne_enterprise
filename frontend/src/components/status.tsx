import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "gray" | "purple";

const toneMap: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  gray: "bg-ink-100 text-ink-700 ring-ink-600/10",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function statusTone(status: string): Tone {
  switch (status) {
    case "active":
    case "completed":
    case "delivered":
    case "successful":
    case "approved":
    case "processed":
    case "ready_for_collection":
    case "ready_for_delivery":
    case "ready":
      return "green";
    case "pending":
    case "preparing":
    case "assigned":
    case "under_review":
    case "extension_requested":
    case "extension_approved":
    case "switch_requested":
    case "more_info":
    case "requested":
      return "amber";
    case "payment_due":
      return "blue";
    case "overdue":
    case "cancelled":
    case "failed":
    case "rejected":
    case "suspended":
      return "red";
    case "out_for_delivery":
    case "switched":
      return "purple";
    default:
      return "gray";
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
        toneMap[statusTone(status)],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const DELIVERY_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const LIPA_STATUSES = [
  "pending",
  "active",
  "payment_due",
  "overdue",
  "extension_requested",
  "extension_approved",
  "completed",
  "ready_for_collection",
  "ready_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
  "switch_requested",
  "switched",
] as const;

export const PAYMENT_METHODS = ["mpesa", "cash", "card", "bank"] as const;
export const PLAN_FREQUENCIES = ["daily", "weekly", "biweekly", "monthly"] as const;

export function frequencyLabel(f: string): string {
  switch (f) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Biweekly";
    case "monthly":
      return "Monthly";
    default:
      return f;
  }
}

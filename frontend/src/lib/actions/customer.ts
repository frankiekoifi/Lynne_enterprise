"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  users,
  addresses,
  variations,
  products,
  notifications,
  paymentPlans,
  lipaAccounts,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  createLipaAccount,
  placeOrder,
  recordPayment,
  requestProductSwitch,
  requestRefund,
} from "@/lib/core";
import { audit } from "@/lib/helpers";

// ---------------------------------------------------------------------------
// Lipa Polepole
// ---------------------------------------------------------------------------
export async function startLipaAction(input: {
  variationId: number;
  planId: number;
  phone?: string;
}) {
  const user = await requireUser();
  const account = await createLipaAccount(user.id, Number(input.variationId), Number(input.planId), user.id);

  const plan = (
    await db.select().from(paymentPlans).where(eq(paymentPlans.id, account.planId)).limit(1)
  )[0];
  const initial = plan?.initialPayment || plan?.installmentAmount || 0;

  await recordPayment({
    userId: user.id,
    amount: initial,
    method: "mpesa",
    lipaAccountId: account.id,
    mpesaPhone: input.phone ?? user.phone ?? undefined,
    mpesaReceipt: `DEMO-${Date.now().toString().slice(-6)}`,
    notes: "Initial payment (M-Pesa STK Push)",
    actorId: user.id,
  });

  redirect(`/account/lipa/${account.id}?started=1`);
}

export async function payInstallmentAction(input: {
  accountId: number;
  amount: number;
  phone?: string;
}) {
  const user = await requireUser();
  const accountId = Number(input.accountId);
  const account = await db
    .select()
    .from(lipaAccounts)
    .where(eq(lipaAccounts.id, accountId))
    .limit(1);
  if (!account[0] || account[0].userId !== user.id) {
    throw new Error("Account not found.");
  }
  await recordPayment({
    userId: user.id,
    amount: Number(input.amount),
    method: "mpesa",
    lipaAccountId: accountId,
    mpesaPhone: input.phone ?? user.phone ?? undefined,
    mpesaReceipt: `DEMO-${Date.now().toString().slice(-6)}`,
    notes: "Installment (M-Pesa STK Push)",
    actorId: user.id,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Checkout (buy in full)
// ---------------------------------------------------------------------------
const orderSchema = z.object({
  items: z.array(z.object({ variationId: z.number(), quantity: z.number() })).min(1),
  deliveryMethod: z.enum(["delivery", "collection"]),
  addressText: z.string().optional(),
  distanceKm: z.number().optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().min(1),
});

export async function placeOrderAction(input: unknown): Promise<{ error?: string; orderId?: number }> {
  const user = await requireUser();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid checkout details." };

  try {
    const order = await placeOrder({
      userId: user.id,
      items: parsed.data.items,
      deliveryMethod: parsed.data.deliveryMethod,
      addressText: parsed.data.addressText,
      distanceKm: parsed.data.distanceKm,
      notes: parsed.data.notes,
      paymentMethod: parsed.data.paymentMethod,
      actorId: user.id,
    });
    return { orderId: order.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Checkout failed." };
  }
}

// Resolve cart items with authoritative server data (used by checkout UI)
export async function resolveCartItemsAction(variationIds: number[]) {
  const ids = Array.from(new Set(variationIds.map(Number).filter(Boolean)));
  if (!ids.length) return [];
  const varRows = await db
    .select()
    .from(variations)
    .where(and(inArray(variations.id, ids), eq(variations.active, true), eq(variations.cashAvailable, true)));
  const prodIds = Array.from(new Set(varRows.map((v) => v.productId)));
  const prodRows = prodIds.length
    ? await db.select().from(products).where(inArray(products.id, prodIds))
    : [];
  const prodName = new Map(prodRows.map((p) => [p.id, p.name] as const));
  const cover = new Map(prodRows.map((p) => [p.id, p.coverImage] as const));
  const slug = new Map(prodRows.map((p) => [p.id, p.slug] as const));

  return varRows.map((v) => ({
    variationId: v.id,
    name: v.name,
    price: v.price,
    availableStock: v.availableStock,
    productName: prodName.get(v.productId) ?? "Product",
    coverImage: cover.get(v.productId) ?? null,
    slug: slug.get(v.productId) ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
export async function requestSwitchAction(input: {
  accountId: number;
  toVariationId: number;
  reason: string;
}) {
  const user = await requireUser();
  await requestProductSwitch(Number(input.accountId), user.id, Number(input.toVariationId), input.reason);
  return { ok: true };
}

export async function requestRefundAction(input: {
  lipaAccountId?: number | null;
  orderId?: number | null;
  amount: number;
  reason: string;
}) {
  const user = await requireUser();
  await requestRefund(user.id, {
    lipaAccountId: input.lipaAccountId ?? null,
    orderId: input.orderId ?? null,
    amount: Number(input.amount),
    reason: input.reason,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Profile & addresses
// ---------------------------------------------------------------------------
export async function updateProfileAction(input: {
  fullName: string;
  phone: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (fullName.length < 2) return { error: "Enter your full name." };

  const [current, existing] = await Promise.all([
    db.select().from(users).where(eq(users.id, user.id)).limit(1),
    db.select().from(users).where(eq(users.email, email)).limit(1),
  ]);
  if (existing.length && existing[0].id !== user.id) {
    return { error: "That email is already in use." };
  }

  let passwordHash: string | undefined;
  if (input.newPassword && input.newPassword.length > 0) {
    if (!input.currentPassword || !(await verifyPassword(input.currentPassword, current[0].passwordHash))) {
      return { error: "Your current password is incorrect." };
    }
    if (input.newPassword.length < 6) return { error: "New password must be at least 6 characters." };
    passwordHash = await hashPassword(input.newPassword);
  }

  await db
    .update(users)
    .set({
      fullName,
      email,
      phone: input.phone,
      ...(passwordHash ? { passwordHash } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await audit(user.id, "profile.updated", "user", user.id);
  return { ok: true };
}

export async function addAddressAction(input: {
  label: string;
  phone: string;
  town: string;
  area: string;
  details: string;
}) {
  const user = await requireUser();
  await db.insert(addresses).values({
    userId: user.id,
    label: input.label || "Home",
    phone: input.phone,
    town: input.town,
    area: input.area,
    details: input.details,
    isDefault: false,
  });
  return { ok: true };
}

export async function setDefaultAddressAction(id: number) {
  const user = await requireUser();
  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, Number(id)), eq(addresses.userId, user.id)));
  return { ok: true };
}

export async function deleteAddressAction(id: number) {
  const user = await requireUser();
  await db.delete(addresses).where(and(eq(addresses.id, Number(id)), eq(addresses.userId, user.id)));
  return { ok: true };
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
}

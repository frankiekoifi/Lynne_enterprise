"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  categories,
  products,
  variations,
  paymentPlans,
  productImages,
  orders,
  orderItems,
  deliveries,
  lipaAccounts,
  lipaStatusHistory,
  inventoryLog,
  users,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import {
  recordPayment,
  reviewSwitch,
  reviewRefund,
  cancelLipaAccount,
  adjustStock,
} from "@/lib/core";
import { audit, notify } from "@/lib/helpers";
import { slugify, fmtKsh } from "@/lib/utils";
import { saveSetting } from "@/lib/settings";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategoryAction(input: {
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: number | null;
  active?: boolean;
}) {
  const admin = await requireAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  const slug = slugify(name);
  await db.insert(categories).values({
    name,
    slug,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    parentId: input.parentId ?? null,
    active: input.active !== false,
    sortOrder: 0,
  });
  await audit(admin.id, "category.created", "category", undefined, { newValue: { name } });
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
}

export async function updateCategoryAction(id: number, input: {
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: number | null;
  active?: boolean;
}) {
  const admin = await requireAdmin();
  await db
    .update(categories)
    .set({
      name: input.name.trim(),
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      parentId: input.parentId ?? null,
      active: input.active !== false,
    })
    .where(eq(categories.id, Number(id)));
  await audit(admin.id, "category.updated", "category", Number(id));
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(id: number) {
  const admin = await requireAdmin();
  await db.update(categories).set({ active: false }).where(eq(categories.id, Number(id)));
  await audit(admin.id, "category.deactivated", "category", Number(id));
  revalidatePath("/admin/categories");
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const variationInput = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.number(),
  stock: z.number().optional(),
  cash: z.boolean().optional(),
  lipa: z.boolean().optional(),
  plans: z
    .array(
      z.object({
        name: z.string().min(1),
        frequency: z.string().min(1),
        installment: z.number(),
        initial: z.number().optional(),
      }),
    )
    .optional(),
});

const productInput = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  categoryId: z.number(),
  subcategoryId: z.number().nullable().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.string().optional(),
  cashAvailable: z.boolean().optional(),
  lipaAvailable: z.boolean().optional(),
  variations: z.array(variationInput).optional(),
});

export async function createProductAction(input: unknown): Promise<{ error?: string; id?: number }> {
  const admin = await requireAdmin();
  const parsed = productInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid product data." };
  const d = parsed.data;

  const slug = slugify(d.name);
  const exists = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (exists.length) return { error: "A product with this name already exists." };

  const [product] = await db
    .insert(products)
    .values({
      name: d.name,
      slug,
      sku: d.sku ?? null,
      categoryId: d.categoryId,
      subcategoryId: d.subcategoryId ?? null,
      description: d.description ?? null,
      coverImage: d.coverImage ?? (d.images?.[0] ?? null),
      status: d.status ?? "active",
      cashAvailable: d.cashAvailable ?? true,
      lipaAvailable: d.lipaAvailable ?? false,
    })
    .returning();

  if (d.images?.length) {
    for (let i = 0; i < d.images.length; i++) {
      await db.insert(productImages).values({ productId: product.id, url: d.images[i], sortOrder: i });
    }
  }

  for (const v of d.variations ?? []) {
    await createVariation(admin.id, product.id, v);
  }

  await audit(admin.id, "product.created", "product", product.id, { newValue: { name: d.name } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return { id: product.id };
}

async function createVariation(actorId: number, productId: number, v: {
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  cash?: boolean;
  lipa?: boolean;
  plans?: Array<{ name: string; frequency: string; installment: number; initial?: number }>;
}) {
  const stock = Math.max(0, Math.round(v.stock ?? 0));
  const [variation] = await db
    .insert(variations)
    .values({
      productId,
      name: v.name,
      sku: v.sku ?? null,
      price: Math.round(v.price),
      totalStock: stock,
      availableStock: stock,
      reservedStock: 0,
      soldStock: 0,
      cashAvailable: v.cash ?? true,
      lipaAvailable: v.lipa ?? false,
      active: true,
    })
    .returning();
  if (stock > 0) {
    await db.insert(inventoryLog).values({
      variationId: variation.id,
      change: stock,
      reason: "new_stock",
      note: "Initial stock",
      actorId,
    });
  }
  for (let i = 0; i < (v.plans ?? []).length; i++) {
    const p = v.plans![i];
    await db.insert(paymentPlans).values({
      variationId: variation.id,
      name: p.name,
      frequency: p.frequency,
      installmentAmount: Math.round(p.installment),
      initialPayment: Math.round(p.initial ?? p.installment),
      active: true,
      sortOrder: i,
    });
  }
}

export async function updateProductAction(id: number, input: unknown): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const parsed = productInput.partial().safeParse(input);
  if (!parsed.success) return { error: "Invalid product data." };
  const d = parsed.data;
  await db
    .update(products)
    .set({
      name: d.name,
      sku: d.sku ?? null,
      categoryId: d.categoryId,
      subcategoryId: d.subcategoryId ?? null,
      description: d.description ?? null,
      coverImage: d.coverImage ?? null,
      status: d.status,
      cashAvailable: d.cashAvailable,
      lipaAvailable: d.lipaAvailable,
      updatedAt: new Date(),
    })
    .where(eq(products.id, Number(id)));
  await audit(admin.id, "product.updated", "product", Number(id));
  revalidatePath("/admin/products");
  return { ok: true } as { error?: string };
}

export async function deleteProductAction(id: number) {
  const admin = await requireAdmin();
  await db.update(products).set({ status: "inactive", updatedAt: new Date() }).where(eq(products.id, Number(id)));
  await audit(admin.id, "product.deactivated", "product", Number(id));
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Variations & plans
// ---------------------------------------------------------------------------
export async function addVariationAction(productId: number, input: unknown): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const parsed = variationInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid variation." };
  await createVariation(admin.id, Number(productId), parsed.data);
  await audit(admin.id, "variation.created", "product", Number(productId), { newValue: { name: parsed.data.name } });
  revalidatePath("/admin/products");
  return { ok: true } as { error?: string };
}

export async function updateVariationAction(id: number, input: {
  name?: string;
  sku?: string;
  price?: number;
  cashAvailable?: boolean;
  lipaAvailable?: boolean;
  active?: boolean;
}) {
  const admin = await requireAdmin();
  const existing = (await db.select().from(variations).where(eq(variations.id, Number(id))).limit(1))[0];
  await db
    .update(variations)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.price !== undefined ? { price: Math.round(input.price) } : {}),
      ...(input.cashAvailable !== undefined ? { cashAvailable: input.cashAvailable } : {}),
      ...(input.lipaAvailable !== undefined ? { lipaAvailable: input.lipaAvailable } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: new Date(),
    })
    .where(eq(variations.id, Number(id)));
  if (input.price !== undefined && existing && existing.price !== input.price) {
    await audit(admin.id, "product.price_changed", "variation", Number(id), {
      previousValue: existing.price,
      newValue: input.price,
    });
  }
  revalidatePath("/admin/products");
}

export async function deleteVariationAction(id: number) {
  const admin = await requireAdmin();
  await db.update(variations).set({ active: false }).where(eq(variations.id, Number(id)));
  await audit(admin.id, "variation.deactivated", "variation", Number(id));
  revalidatePath("/admin/products");
}

export async function addPlanAction(variationId: number, input: {
  name: string;
  frequency: string;
  installment: number;
  initial?: number;
}) {
  const admin = await requireAdmin();
  await db.insert(paymentPlans).values({
    variationId: Number(variationId),
    name: input.name,
    frequency: input.frequency,
    installmentAmount: Math.round(input.installment),
    initialPayment: Math.round(input.initial ?? input.installment),
    active: true,
    sortOrder: 0,
  });
  await audit(admin.id, "plan.created", "variation", Number(variationId), { newValue: { name: input.name } });
  revalidatePath("/admin/products");
}

export async function updatePlanAction(id: number, input: {
  name?: string;
  frequency?: string;
  installment?: number;
  initial?: number;
  active?: boolean;
}) {
  const admin = await requireAdmin();
  await db
    .update(paymentPlans)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.installment !== undefined ? { installmentAmount: Math.round(input.installment) } : {}),
      ...(input.initial !== undefined ? { initialPayment: Math.round(input.initial) } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    })
    .where(eq(paymentPlans.id, Number(id)));
  await audit(admin.id, "plan.updated", "payment_plan", Number(id));
  revalidatePath("/admin/products");
}

export async function deletePlanAction(id: number) {
  const admin = await requireAdmin();
  await db.update(paymentPlans).set({ active: false }).where(eq(paymentPlans.id, Number(id)));
  await audit(admin.id, "plan.deactivated", "payment_plan", Number(id));
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Payments (manual recording)
// ---------------------------------------------------------------------------
export async function recordManualPaymentAction(input: {
  userId: number;
  amount: number;
  method: string;
  lipaAccountId?: number | null;
  orderId?: number | null;
  notes?: string;
}): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  try {
    await recordPayment({
      userId: Number(input.userId),
      amount: Number(input.amount),
      method: input.method,
      lipaAccountId: input.lipaAccountId ?? null,
      orderId: input.orderId ?? null,
      notes: input.notes ?? "Manually recorded by admin",
      actorId: admin.id,
    });
    revalidatePath("/admin/payments");
    return { ok: true } as { error?: string };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to record payment." };
  }
}

// ---------------------------------------------------------------------------
// Orders & delivery
// ---------------------------------------------------------------------------
export async function updateOrderStatusAction(orderId: number, status: string) {
  const admin = await requireAdmin();
  const order = (await db.select().from(orders).where(eq(orders.id, Number(orderId))).limit(1))[0];
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, Number(orderId)));
  if (order) {
    await notify(order.userId, "order_updated", "Order update", `Your order ${order.orderNumber} is now "${status.replace(/_/g, " ")}".`);
  }
  await audit(admin.id, "order.status_changed", "order", Number(orderId), { newValue: { status } });
  revalidatePath("/admin/orders");
}

export async function updateDeliveryStatusAction(deliveryId: number, status: string, note?: string) {
  const admin = await requireAdmin();
  const delivery = (await db.select().from(deliveries).where(eq(deliveries.id, Number(deliveryId))).limit(1))[0];
  await db
    .update(deliveries)
    .set({ status, trackingNote: note ?? null, updatedAt: new Date() })
    .where(eq(deliveries.id, Number(deliveryId)));
  if (delivery) {
    await notify(delivery.userId, "delivery_update", "Delivery update", `Your delivery is now "${status.replace(/_/g, " ")}".`);
  }
  await audit(admin.id, "delivery.status_changed", "delivery", Number(deliveryId), { newValue: { status } });
  revalidatePath("/admin/deliveries");
}

// ---------------------------------------------------------------------------
// Lipa Polepole management
// ---------------------------------------------------------------------------
export async function setLipaStatusAction(accountId: number, status: string, note?: string) {
  const admin = await requireAdmin();
  const account = (await db.select().from(lipaAccounts).where(eq(lipaAccounts.id, Number(accountId))).limit(1))[0];
  if (!account) throw new Error("Account not found.");
  await db.update(lipaAccounts).set({ status, updatedAt: new Date() }).where(eq(lipaAccounts.id, Number(accountId)));
  await db.insert(lipaStatusHistory).values({
    lipaAccountId: account.id,
    status,
    note: note ?? "Status updated by admin",
    actorId: admin.id,
  });
  await notify(account.userId, "lipa_update", "Lipa Polepole update", `Your Lipa Polepole account is now "${status.replace(/_/g, " ")}".`);
  await audit(admin.id, "lipa.status_changed", "lipa_account", account.id, { newValue: { status } });
  revalidatePath("/admin/lipa");
}

export async function grantExtensionAction(accountId: number, dueDate: string, note?: string) {
  const admin = await requireAdmin();
  const account = (await db.select().from(lipaAccounts).where(eq(lipaAccounts.id, Number(accountId))).limit(1))[0];
  if (!account) throw new Error("Account not found.");
  await db
    .update(lipaAccounts)
    .set({
      status: "extension_approved",
      nextPaymentDue: new Date(dueDate),
      updatedAt: new Date(),
    })
    .where(eq(lipaAccounts.id, Number(accountId)));
  await db.insert(lipaStatusHistory).values({
    lipaAccountId: account.id,
    status: "extension_approved",
    note: note ?? "Extension granted",
    actorId: admin.id,
  });
  await notify(account.userId, "extension_approved", "Extension approved", `Your payment deadline has been extended to ${new Date(dueDate).toLocaleDateString("en-KE")}.`);
  await audit(admin.id, "lipa.extension_granted", "lipa_account", account.id, { newValue: { dueDate } });
  revalidatePath("/admin/lipa");
}

export async function cancelLipaAction(accountId: number, note?: string) {
  const admin = await requireAdmin();
  await cancelLipaAccount(Number(accountId), admin.id, note ?? "");
  revalidatePath("/admin/lipa");
}

// ---------------------------------------------------------------------------
// Switch & refund review
// ---------------------------------------------------------------------------
export async function reviewSwitchAction(input: {
  requestId: number;
  decision: "approved" | "rejected" | "more_info";
  adminNote: string;
}) {
  const admin = await requireAdmin();
  await reviewSwitch(Number(input.requestId), admin.id, input.decision, input.adminNote);
  revalidatePath("/admin/switches");
}

export async function reviewRefundAction(input: {
  requestId: number;
  decision: "approved" | "rejected";
  refundAmount?: number;
  refundMethod?: string;
  adminNote?: string;
}) {
  const admin = await requireAdmin();
  await reviewRefund(Number(input.requestId), admin.id, input.decision, {
    refundAmount: input.refundAmount,
    refundMethod: input.refundMethod,
    adminNote: input.adminNote,
  });
  revalidatePath("/admin/refunds");
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export async function adjustStockAction(input: {
  variationId: number;
  delta: number;
  reason: string;
  note?: string;
}) {
  const admin = await requireAdmin();
  await adjustStock(Number(input.variationId), admin.id, Number(input.delta), input.reason, input.note ?? "");
  revalidatePath("/admin/inventory");
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export async function setCustomerStatusAction(id: number, status: string) {
  const admin = await requireAdmin();
  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, Number(id)));
  await audit(admin.id, "customer.status_changed", "user", Number(id), { newValue: { status } });
  revalidatePath("/admin/customers");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSettingsAction(entries: Record<string, string>) {
  const admin = await requireAdmin();
  for (const [key, value] of Object.entries(entries)) {
    await saveSetting(key, value ?? "");
  }
  await audit(admin.id, "settings.updated", "settings");
  revalidatePath("/admin/settings");
  revalidatePath("/");
}

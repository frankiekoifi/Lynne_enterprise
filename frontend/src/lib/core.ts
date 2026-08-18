import { db } from "@/db";
import {
  payments,
  lipaAccounts,
  lipaStatusHistory,
  variations,
  products,
  paymentPlans,
  orders,
  orderItems,
  deliveries,
  inventoryLog,
  productSwitchRequests,
  refundRequests,
} from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { nextRef, fmtKsh } from "@/lib/utils";
import { notify, notifyAdmins, audit } from "@/lib/helpers";
import { getAllSettings, deliveryFeeForKm } from "@/lib/settings";

async function reserveStock(variationId: number, actorId: number) {
  const [variation] = await db
    .select()
    .from(variations)
    .where(eq(variations.id, variationId));

  if (!variation) {
    throw new Error("Variation not found.");
  }

  if (variation.availableStock < 1) {
    throw new Error("Insufficient available stock to reserve this product.");
  }

  await db
    .update(variations)
    .set({
      availableStock: sql`${variations.availableStock} - 1`,
      reservedStock: sql`${variations.reservedStock} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(variations.id, variationId), gte(variations.availableStock, 1)),
    );

  await db.insert(inventoryLog).values({
    variationId,
    change: -1,
    reason: "lipa_reservation",
    note: "Reserved for Lipa Polepole",
    actorId,
  });
}

async function releaseReservedStock(
  variationId: number,
  actorId: number,
  reason = "product_release",
  note = "Released reservation",
) {
  const [variation] = await db
    .select()
    .from(variations)
    .where(eq(variations.id, variationId));

  if (!variation || variation.reservedStock < 1) {
    return;
  }

  await db
    .update(variations)
    .set({
      reservedStock: sql`${variations.reservedStock} - 1`,
      availableStock: sql`${variations.availableStock} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(variations.id, variationId), gte(variations.reservedStock, 1)),
    );

  await db
    .insert(inventoryLog)
    .values({ variationId, change: 1, reason, note, actorId });
}

async function completeReservedStock(variationId: number, actorId: number) {
  const [variation] = await db
    .select()
    .from(variations)
    .where(eq(variations.id, variationId));

  if (!variation || variation.reservedStock < 1) {
    return;
  }

  await db
    .update(variations)
    .set({
      reservedStock: sql`${variations.reservedStock} - 1`,
      soldStock: sql`${variations.soldStock} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(variations.id, variationId), gte(variations.reservedStock, 1)),
    );

  await db.insert(inventoryLog).values({
    variationId,
    change: 0,
    reason: "lipa_completed",
    note: "Reserved item fully paid — moved to sold",
    actorId,
  });
}

export type PaymentInput = {
  userId: number;
  amount: number;
  method: string;
  orderId?: number | null;
  lipaAccountId?: number | null;
  mpesaReceipt?: string | null;
  mpesaPhone?: string | null;
  mpesaTransactionId?: string | null;
  notes?: string | null;
  actorId?: number | null;
};

function nextDueDate(frequency: string, from = new Date()): Date {
  const d = new Date(from);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "weekly":
    default:
      d.setDate(d.getDate() + 7);
      break;
  }
  return d;
}

export async function recordPayment(input: PaymentInput) {
  const amount = Math.round(input.amount);
  if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

  const [payment] = await db
    .insert(payments)
    .values({
      reference: nextRef("PAY"),
      userId: input.userId,
      orderId: input.orderId ?? null,
      lipaAccountId: input.lipaAccountId ?? null,
      amount,
      method: input.method,
      status: "successful",
      mpesaReceipt: input.mpesaReceipt ?? null,
      mpesaPhone: input.mpesaPhone ?? null,
      mpesaTransactionId: input.mpesaTransactionId ?? null,
      notes: input.notes ?? null,
      verifiedAt: new Date(),
    })
    .returning();

  if (input.lipaAccountId) {
    const account = (
      await db
        .select()
        .from(lipaAccounts)
        .where(eq(lipaAccounts.id, input.lipaAccountId))
        .limit(1)
    )[0];
    if (!account) throw new Error("Lipa Polepole account not found.");
    if (["cancelled", "refunded", "delivered"].includes(account.status)) {
      throw new Error(
        "This Lipa Polepole account is closed and cannot receive payments.",
      );
    }
    const plan = (
      await db
        .select()
        .from(paymentPlans)
        .where(eq(paymentPlans.id, account.planId))
        .limit(1)
    )[0];
    const variation = (
      await db
        .select()
        .from(variations)
        .where(eq(variations.id, account.variationId))
        .limit(1)
    )[0];
    if (!variation) throw new Error("Variation not found.");

    const actorId = input.actorId ?? input.userId;
    const wasCompleted = account.paidAmount >= account.totalAmount;
    const firstPayment = account.paidAmount === 0;

    const paid = account.paidAmount + amount;
    const remaining = Math.max(0, account.totalAmount - paid);
    const progress =
      account.totalAmount > 0
        ? Math.min(100, Math.round((paid / account.totalAmount) * 100))
        : 100;

    let status = account.status;

    if (firstPayment) {
      await reserveStock(variation.id, actorId);
      status = "active";
    }

    if (!wasCompleted && paid >= account.totalAmount) {
      await completeReservedStock(variation.id, actorId);
      status = "ready_for_collection";
      await db.insert(lipaStatusHistory).values({
        lipaAccountId: account.id,
        status: "completed",
        note: "Fully paid",
        actorId,
      });
      await db.insert(lipaStatusHistory).values({
        lipaAccountId: account.id,
        status: "ready_for_collection",
        note: "Payment complete — ready for collection or delivery",
        actorId,
      });
      await notify(
        input.userId,
        "lipa_completed",
        "Payment complete! 🎉",
        `Congratulations! Your payment for this product is complete. It is now ready for collection or delivery.`,
      );
      await notifyAdmins(
        "lipa_completed",
        "Lipa Polepole completed",
        `Account ${account.accountNumber} is fully paid and ready for collection/delivery.`,
      );
    } else if (
      status === "pending" ||
      status === "payment_due" ||
      status === "overdue"
    ) {
      status = "active";
    }

    await db
      .update(lipaAccounts)
      .set({
        paidAmount: paid,
        remainingAmount: remaining,
        progress,
        status,
        nextPaymentDue:
          status === "active"
            ? nextDueDate(plan?.frequency ?? "weekly")
            : account.nextPaymentDue,
        completedAt:
          !wasCompleted && paid >= account.totalAmount
            ? new Date()
            : account.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(lipaAccounts.id, account.id));

    if (!firstPayment && !wasCompleted && !(paid >= account.totalAmount)) {
      await db.insert(lipaStatusHistory).values({
        lipaAccountId: account.id,
        status: "active",
        note: `Installment of ${fmtKsh(amount)} received`,
        actorId,
      });
    }

    await notify(
      input.userId,
      "payment_received",
      "Payment received",
      `${fmtKsh(amount)} applied to your Lipa Polepole account. Remaining balance: ${fmtKsh(remaining)}.`,
    );
    await audit(actorId, "payment.lipa_received", "payment", payment.id, {
      newValue: { amount, account: account.accountNumber, remaining },
    });
  } else if (input.orderId) {
    await notify(
      input.userId,
      "payment_received",
      "Payment received",
      `${fmtKsh(amount)} recorded for your order.`,
    );
    await audit(
      input.actorId ?? input.userId,
      "payment.order_received",
      "payment",
      payment.id,
      {
        newValue: { amount, method: input.method, orderId: input.orderId },
      },
    );
  }

  return payment;
}

export async function createLipaAccount(
  userId: number,
  variationId: number,
  planId: number,
  actorId?: number,
) {
  const variation = (
    await db
      .select()
      .from(variations)
      .where(eq(variations.id, variationId))
      .limit(1)
  )[0];
  if (!variation || !variation.active)
    throw new Error("This product is not available.");
  if (!variation.lipaAvailable)
    throw new Error("This product is not available for Lipa Polepole.");
  if (variation.availableStock < 1)
    throw new Error("This product is out of stock.");

  const plan = (
    await db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.id, planId))
      .limit(1)
  )[0];
  if (!plan || !plan.active)
    throw new Error("This payment plan is not available.");
  if (plan.variationId !== variationId)
    throw new Error("Payment plan does not match the product.");

  const [account] = await db
    .insert(lipaAccounts)
    .values({
      accountNumber: nextRef("LP"),
      userId,
      variationId,
      planId,
      planSnapshot: `${plan.name} — ${fmtKsh(plan.installmentAmount)}`,
      totalAmount: variation.price,
      paidAmount: 0,
      remainingAmount: variation.price,
      progress: 0,
      status: "pending",
      nextPaymentDue: new Date(),
    })
    .returning();

  const actor = actorId ?? userId;
  await db.insert(lipaStatusHistory).values({
    lipaAccountId: account.id,
    status: "pending",
    note: "Account created — awaiting first payment",
    actorId: actor,
  });
  await audit(actor, "lipa.account_created", "lipa_account", account.id, {
    newValue: { variationId, planId, total: variation.price },
  });
  return account;
}

export type OrderLine = { variationId: number; quantity: number };

export async function placeOrder(opts: {
  userId: number;
  items: OrderLine[];
  deliveryMethod: "delivery" | "collection";
  addressText?: string | null;
  distanceKm?: number | null;
  notes?: string | null;
  paymentMethod: string;
  actorId?: number | null;
}) {
  if (!opts.items.length) throw new Error("Your cart is empty.");

  const settings = await getAllSettings();
  const lines: Array<{
    variationId: number;
    productName: string;
    variationName: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }> = [];

  for (const line of opts.items) {
    const qty = Math.max(1, Math.round(line.quantity));
    const variation = (
      await db
        .select()
        .from(variations)
        .where(eq(variations.id, line.variationId))
        .limit(1)
    )[0];
    if (!variation || !variation.active || !variation.cashAvailable) {
      throw new Error("One of the items in your cart is unavailable.");
    }
    if (variation.availableStock < qty) {
      throw new Error(`Insufficient stock for "${variation.name}".`);
    }
    const product = (
      await db
        .select()
        .from(products)
        .where(eq(products.id, variation.productId))
        .limit(1)
    )[0];
    lines.push({
      variationId: variation.id,
      productName: product?.name ?? "Product",
      variationName: variation.name,
      unitPrice: variation.price,
      quantity: qty,
      total: variation.price * qty,
    });
  }

  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  const isDelivery = opts.deliveryMethod === "delivery";
  let deliveryFee = 0;
  if (isDelivery) {
    const km = Math.max(0, Number(opts.distanceKm ?? 0));
    deliveryFee = deliveryFeeForKm(km, settings);
    if (
      settings.freeDeliveryOver > 0 &&
      subtotal >= settings.freeDeliveryOver
    ) {
      deliveryFee = 0;
    }
  }
  const total = subtotal + deliveryFee;

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: nextRef("ORD"),
      userId: opts.userId,
      status: "confirmed",
      subtotal,
      deliveryFee,
      discount: 0,
      total,
      deliveryMethod: opts.deliveryMethod,
      deliveryAddress: isDelivery
        ? (opts.addressText ?? null)
        : "Collection in store",
      deliveryDistanceKm: isDelivery ? Number(opts.distanceKm ?? 0) : null,
      notes: opts.notes ?? null,
    })
    .returning();

  for (const line of lines) {
    await db.insert(orderItems).values({
      orderId: order.id,
      variationId: line.variationId,
      productName: line.productName,
      variationName: line.variationName,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      total: line.total,
    });

    const [variation] = await db
      .select()
      .from(variations)
      .where(eq(variations.id, line.variationId));

    if (!variation || variation.availableStock < line.quantity) {
      throw new Error(`Insufficient stock for "${line.productName}".`);
    }

    await db
      .update(variations)
      .set({
        availableStock: sql`${variations.availableStock} - ${line.quantity}`,
        soldStock: sql`${variations.soldStock} + ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(variations.id, line.variationId),
          gte(variations.availableStock, line.quantity),
        ),
      );

    await db.insert(inventoryLog).values({
      variationId: line.variationId,
      change: -line.quantity,
      reason: "cash_sale",
      note: `Order ${order.orderNumber}`,
      actorId: opts.actorId ?? opts.userId,
    });
  }

  await recordPayment({
    userId: opts.userId,
    amount: total,
    method: opts.paymentMethod,
    orderId: order.id,
    notes: `Payment for order ${order.orderNumber}`,
    actorId: opts.actorId ?? opts.userId,
  });

  if (isDelivery) {
    await db.insert(deliveries).values({
      orderId: order.id,
      userId: opts.userId,
      status: "pending",
      address: opts.addressText ?? null,
    });
  }

  await notify(
    opts.userId,
    "order_placed",
    "Order placed",
    `Your order ${order.orderNumber} was placed successfully.`,
  );
  await notifyAdmins(
    "order_placed",
    "New order received",
    `Order ${order.orderNumber} has been placed.`,
  );
  await audit(opts.actorId ?? opts.userId, "order.placed", "order", order.id, {
    newValue: {
      total,
      deliveryFee,
      method: opts.deliveryMethod,
      items: lines.length,
    },
  });

  return order;
}

export async function requestProductSwitch(
  accountId: number,
  userId: number,
  toVariationId: number,
  reason: string,
) {
  const account = (
    await db
      .select()
      .from(lipaAccounts)
      .where(eq(lipaAccounts.id, accountId))
      .limit(1)
  )[0];
  if (!account || account.userId !== userId)
    throw new Error("Account not found.");
  if (["cancelled", "refunded", "delivered"].includes(account.status)) {
    throw new Error("This account can no longer be switched.");
  }
  const target = (
    await db
      .select()
      .from(variations)
      .where(eq(variations.id, toVariationId))
      .limit(1)
  )[0];
  if (!target || !target.active || !target.lipaAvailable) {
    throw new Error(
      "The requested product is not available for Lipa Polepole.",
    );
  }

  const [req] = await db
    .insert(productSwitchRequests)
    .values({
      lipaAccountId: accountId,
      userId,
      fromVariationId: account.variationId,
      toVariationId,
      reason,
      status: "pending",
    })
    .returning();

  await db
    .update(lipaAccounts)
    .set({ status: "switch_requested", updatedAt: new Date() })
    .where(eq(lipaAccounts.id, accountId));
  await db.insert(lipaStatusHistory).values({
    lipaAccountId: accountId,
    status: "switch_requested",
    note: "Product switch requested",
    actorId: userId,
  });
  await notify(
    userId,
    "switch_requested",
    "Switch request submitted",
    "Your product switch request has been submitted for review.",
  );
  await notifyAdmins(
    "switch_requested",
    "New switch request",
    `Account ${account.accountNumber} requested a product switch.`,
  );
  await audit(userId, "lipa.switch_requested", "product_switch", req.id, {
    newValue: { from: account.variationId, to: toVariationId },
  });
  return req;
}

export async function reviewSwitch(
  requestId: number,
  actorId: number,
  decision: "approved" | "rejected" | "more_info",
  adminNote: string,
) {
  const req = (
    await db
      .select()
      .from(productSwitchRequests)
      .where(eq(productSwitchRequests.id, requestId))
      .limit(1)
  )[0];
  if (!req) throw new Error("Switch request not found.");
  if (req.status !== "pending")
    throw new Error("This request has already been reviewed.");
  const account = (
    await db
      .select()
      .from(lipaAccounts)
      .where(eq(lipaAccounts.id, req.lipaAccountId))
      .limit(1)
  )[0];
  if (!account) throw new Error("Account not found.");

  if (decision === "rejected") {
    await db
      .update(productSwitchRequests)
      .set({
        status: "rejected",
        adminNote,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      })
      .where(eq(productSwitchRequests.id, requestId));
    await db
      .update(lipaAccounts)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(lipaAccounts.id, account.id));
    await db.insert(lipaStatusHistory).values({
      lipaAccountId: account.id,
      status: "active",
      note: "Switch request rejected",
      actorId,
    });
    await notify(
      account.userId,
      "switch_rejected",
      "Switch request declined",
      adminNote || "Your product switch request was declined.",
    );
  } else if (decision === "more_info") {
    await db
      .update(productSwitchRequests)
      .set({
        status: "more_info",
        adminNote,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      })
      .where(eq(productSwitchRequests.id, requestId));
    await notify(
      account.userId,
      "switch_info",
      "More information needed",
      adminNote || "Please provide more information about your switch request.",
    );
  } else {
    const target = (
      await db
        .select()
        .from(variations)
        .where(eq(variations.id, req.toVariationId))
        .limit(1)
    )[0];
    if (!target) throw new Error("Target variation no longer exists.");

    await releaseReservedStock(
      account.variationId,
      actorId,
      "product_switch",
      `Switch to ${target.name}`,
    );
    await reserveStock(target.id, actorId);

    const paid = account.paidAmount;
    const remaining = Math.max(0, target.price - paid);
    const progress =
      target.price > 0
        ? Math.min(100, Math.round((paid / target.price) * 100))
        : 100;
    const fullyPaid = paid >= target.price;

    if (fullyPaid) {
      await completeReservedStock(target.id, actorId);
    }

    await db
      .update(lipaAccounts)
      .set({
        variationId: target.id,
        totalAmount: target.price,
        remainingAmount: remaining,
        progress,
        planSnapshot: `Switched — carried balance ${fmtKsh(paid)}`,
        status: fullyPaid ? "ready_for_collection" : "active",
        completedAt: fullyPaid ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(lipaAccounts.id, account.id));

    await db
      .update(productSwitchRequests)
      .set({
        status: "approved",
        adminNote,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      })
      .where(eq(productSwitchRequests.id, requestId));

    await db.insert(lipaStatusHistory).values({
      lipaAccountId: account.id,
      status: "switched",
      note: `Switched to ${target.name}`,
      actorId,
    });
    await notify(
      account.userId,
      "switch_approved",
      "Switch approved",
      `Your Lipa Polepole account has been switched to "${target.name}".`,
    );
    await notifyAdmins(
      "switch_approved",
      "Switch approved",
      `Account ${account.accountNumber} switched product.`,
    );
  }

  await audit(actorId, "lipa.switch_reviewed", "product_switch", requestId, {
    newValue: { decision, adminNote },
  });
}

export async function requestRefund(
  userId: number,
  opts: {
    lipaAccountId?: number | null;
    orderId?: number | null;
    amount: number;
    reason: string;
  },
) {
  const [req] = await db
    .insert(refundRequests)
    .values({
      userId,
      lipaAccountId: opts.lipaAccountId ?? null,
      orderId: opts.orderId ?? null,
      amount: Math.round(opts.amount),
      reason: opts.reason,
      status: "requested",
    })
    .returning();
  await notify(
    userId,
    "refund_requested",
    "Refund request submitted",
    "Your refund request has been submitted for review.",
  );
  await notifyAdmins(
    "refund_requested",
    "New refund request",
    `Refund request #${req.id} awaiting review.`,
  );
  await audit(userId, "refund.requested", "refund_request", req.id, {
    newValue: {
      amount: req.amount,
      lipaAccountId: opts.lipaAccountId ?? null,
      orderId: opts.orderId ?? null,
    },
  });
  return req;
}

export async function reviewRefund(
  requestId: number,
  actorId: number,
  decision: "approved" | "rejected",
  opts: { refundAmount?: number; refundMethod?: string; adminNote?: string },
) {
  const req = (
    await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, requestId))
      .limit(1)
  )[0];
  if (!req) throw new Error("Refund request not found.");
  if (req.status !== "requested" && req.status !== "under_review") {
    throw new Error("This request has already been processed.");
  }

  if (decision === "rejected") {
    await db
      .update(refundRequests)
      .set({
        status: "rejected",
        adminNote: opts.adminNote ?? null,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      })
      .where(eq(refundRequests.id, requestId));
    await notify(
      req.userId,
      "refund_rejected",
      "Refund request declined",
      opts.adminNote || "Your refund request was declined.",
    );
  } else {
    const refundAmount = Math.round(opts.refundAmount ?? req.amount);
    const method = opts.refundMethod ?? "mpesa";
    await db
      .update(refundRequests)
      .set({
        status: "processed",
        refundAmount,
        refundMethod: method,
        adminNote: opts.adminNote ?? null,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      })
      .where(eq(refundRequests.id, requestId));

    if (req.lipaAccountId) {
      const account = (
        await db
          .select()
          .from(lipaAccounts)
          .where(eq(lipaAccounts.id, req.lipaAccountId))
          .limit(1)
      )[0];
      if (account) {
        await releaseReservedStock(
          account.variationId,
          actorId,
          "returned",
          "Refund — reservation released",
        );
        await db
          .update(lipaAccounts)
          .set({
            status: "refunded",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(lipaAccounts.id, account.id));
        await db.insert(lipaStatusHistory).values({
          lipaAccountId: account.id,
          status: "refunded",
          note: "Refund processed",
          actorId,
        });
      }
    }

    await db.insert(payments).values({
      reference: nextRef("REF"),
      userId: req.userId,
      orderId: req.orderId ?? null,
      lipaAccountId: req.lipaAccountId ?? null,
      amount: -refundAmount,
      method,
      status: "refunded",
      notes: `Refund for request #${req.id} — ${opts.adminNote ?? ""}`.trim(),
      verifiedAt: new Date(),
    });

    await notify(
      req.userId,
      "refund_approved",
      "Refund approved",
      `Your refund of ${fmtKsh(refundAmount)} has been processed.`,
    );
  }

  await audit(actorId, "refund.reviewed", "refund_request", requestId, {
    newValue: {
      decision,
      refundAmount: opts.refundAmount,
      method: opts.refundMethod,
    },
  });
}

export async function cancelLipaAccount(
  accountId: number,
  actorId: number,
  note: string,
) {
  const account = (
    await db
      .select()
      .from(lipaAccounts)
      .where(eq(lipaAccounts.id, accountId))
      .limit(1)
  )[0];
  if (!account) throw new Error("Account not found.");
  if (["cancelled", "refunded", "delivered"].includes(account.status)) {
    throw new Error("This account is already closed.");
  }
  await releaseReservedStock(
    account.variationId,
    actorId,
    "product_release",
    "Plan cancelled — returned to available inventory",
  );
  await db
    .update(lipaAccounts)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(lipaAccounts.id, accountId));
  await db.insert(lipaStatusHistory).values({
    lipaAccountId: accountId,
    status: "cancelled",
    note: note || "Plan cancelled",
    actorId,
  });
  await notify(
    account.userId,
    "lipa_cancelled",
    "Plan cancelled",
    note || "Your Lipa Polepole plan has been cancelled.",
  );
  await audit(actorId, "lipa.cancelled", "lipa_account", accountId, {
    newValue: { note },
  });
}

export async function adjustStock(
  variationId: number,
  actorId: number,
  delta: number,
  reason: string,
  note: string,
) {
  const deltaInt = Math.round(delta);
  await db
    .update(variations)
    .set({
      totalStock: sql`${variations.totalStock} + ${deltaInt}`,
      availableStock: sql`GREATEST(0, ${variations.availableStock} + ${deltaInt})`,
      updatedAt: new Date(),
    })
    .where(eq(variations.id, variationId));
  await db.insert(inventoryLog).values({
    variationId,
    change: deltaInt,
    reason,
    note: note || "Manual adjustment",
    actorId,
  });
  await audit(actorId, "inventory.adjusted", "variation", variationId, {
    newValue: { delta: deltaInt, reason, note },
  });
}

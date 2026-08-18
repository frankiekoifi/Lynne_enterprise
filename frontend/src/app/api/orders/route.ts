import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  orders,
  orderItems,
  variations,
  products,
  inventoryLog,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { readSession } from "@/lib/auth";
import { recordPayment } from "@/lib/core";

// GET - Get user's orders
export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, session.userId))
      .orderBy(orders.createdAt);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      }),
    );

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

// POST - Create a new order
export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      items,
      deliveryMethod = "delivery",
      addressId,
      addressText,
      distanceKm,
      notes,
      paymentMethod = "cash",
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate totals and validate stock
    let subtotal = 0;
    const orderLines = [];

    for (const item of items) {
      const [variation] = await db
        .select()
        .from(variations)
        .where(eq(variations.id, item.variationId));

      if (!variation) {
        return NextResponse.json(
          { error: `Product variation ${item.variationId} not found` },
          { status: 404 },
        );
      }

      if (variation.availableStock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${variation.name}` },
          { status: 400 },
        );
      }

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, variation.productId));

      subtotal += variation.price * item.quantity;
      orderLines.push({
        variationId: variation.id,
        productName: product?.name || "Product",
        variationName: variation.name,
        unitPrice: variation.price,
        quantity: item.quantity,
        total: variation.price * item.quantity,
      });
    }

    // Calculate delivery fee
    const deliveryFee = deliveryMethod === "delivery" ? 200 : 0;
    const total = subtotal + deliveryFee;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId: session.userId,
        status: "confirmed",
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        deliveryMethod,
        deliveryAddress: addressText || null,
        deliveryDistanceKm: distanceKm || null,
        notes: notes || null,
      })
      .returning();

    // Create order items and update stock
    for (const line of orderLines) {
      await db.insert(orderItems).values({
        orderId: order.id,
        variationId: line.variationId,
        productName: line.productName,
        variationName: line.variationName,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        total: line.total,
      });

      // Update stock using sql
      await db
        .update(variations)
        .set({
          availableStock: sql`${variations.availableStock} - ${line.quantity}`,
          soldStock: sql`${variations.soldStock} + ${line.quantity}`,
        })
        .where(eq(variations.id, line.variationId));

      // Log inventory
      await db.insert(inventoryLog).values({
        variationId: line.variationId,
        change: -line.quantity,
        reason: "cash_sale",
        note: `Order ${order.orderNumber}`,
        actorId: session.userId,
      });
    }

    // Record payment
    await recordPayment({
      userId: session.userId,
      amount: total,
      method: paymentMethod,
      orderId: order.id,
      notes: `Payment for order ${order.orderNumber}`,
      actorId: session.userId,
    });

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: orderLines,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}

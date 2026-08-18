import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

// GET - List all orders
export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    const ordersWithDetails = await Promise.all(
      allOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, order.userId));

        return {
          ...order,
          items,
          user: user
            ? {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ orders: ordersWithDetails });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

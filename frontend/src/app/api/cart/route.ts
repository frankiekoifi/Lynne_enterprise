import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cart, variations, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { readSession } from "@/lib/auth";

async function getUserId() {
  const session = await readSession();
  return session?.userId || null;
}

export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        {
          items: [],
          subtotal: 0,
          count: 0,
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    const cartItems = await db
      .select()
      .from(cart)
      .where(eq(cart.userId, userId));

    const itemsWithDetails = await Promise.all(
      cartItems.map(async (item) => {
        const [variation] = await db
          .select()
          .from(variations)
          .where(eq(variations.id, item.variationId));

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, variation?.productId || 0));

        return {
          id: item.id,
          variationId: item.variationId,
          quantity: item.quantity,
          variation,
          product,
          total: variation ? variation.price * item.quantity : 0,
        };
      }),
    );

    const subtotal = itemsWithDetails.reduce(
      (sum, item) => sum + item.total,
      0,
    );
    const count = itemsWithDetails.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return NextResponse.json({
      items: itemsWithDetails,
      subtotal,
      count,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { variationId, quantity = 1 } = body;

    if (!variationId) {
      return NextResponse.json(
        { error: "Variation ID is required" },
        { status: 400 },
      );
    }

    const [variation] = await db
      .select()
      .from(variations)
      .where(eq(variations.id, variationId));

    if (!variation) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(cart)
      .where(and(eq(cart.userId, userId), eq(cart.variationId, variationId)));

    if (existing) {
      const [updated] = await db
        .update(cart)
        .set({
          quantity: existing.quantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(cart.id, existing.id))
        .returning();

      return NextResponse.json({ success: true, cart: updated });
    } else {
      const [newItem] = await db
        .insert(cart)
        .values({
          userId: userId,
          variationId,
          quantity,
        })
        .returning();

      return NextResponse.json({ success: true, cart: newItem });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { cartId, quantity } = body;

    if (!cartId || quantity === undefined) {
      return NextResponse.json(
        { error: "Cart ID and quantity are required" },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      await db
        .delete(cart)
        .where(and(eq(cart.id, cartId), eq(cart.userId, userId)));
      return NextResponse.json({ success: true });
    }

    const [updated] = await db
      .update(cart)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(and(eq(cart.id, cartId), eq(cart.userId, userId)))
      .returning();

    return NextResponse.json({ success: true, cart: updated });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const cartId = searchParams.get("id");

    if (!cartId) {
      return NextResponse.json(
        { error: "Cart ID is required" },
        { status: 400 },
      );
    }

    await db
      .delete(cart)
      .where(and(eq(cart.id, parseInt(cartId)), eq(cart.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return NextResponse.json(
      { error: "Failed to remove from cart" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { readSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, session.userId))
      .orderBy(addresses.isDefault, addresses.createdAt);

    return NextResponse.json({ addresses: userAddresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { label, phone, town, area, details, isDefault } = body;

    if (!label || !phone || !town || !area) {
      return NextResponse.json(
        { error: "Label, phone, town, and area are required" },
        { status: 400 },
      );
    }

    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, session.userId));
    }

    const [newAddress] = await db
      .insert(addresses)
      .values({
        userId: session.userId,
        label,
        phone,
        town,
        area,
        details: details || null,
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json({ address: newAddress });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 },
    );
  }
}

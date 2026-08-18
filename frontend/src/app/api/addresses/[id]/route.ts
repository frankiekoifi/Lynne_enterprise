import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { readSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const [address] = await db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.id, parseInt(id)),
          eq(addresses.userId, session.userId),
        ),
      );

    if (!address) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Error fetching address:", error);
    return NextResponse.json(
      { error: "Failed to fetch address" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { label, phone, town, area, details, isDefault } = body;

    const [existing] = await db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.id, parseInt(id)),
          eq(addresses.userId, session.userId),
        ),
      );

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, session.userId));
    }

    const [updated] = await db
      .update(addresses)
      .set({
        label: label || existing.label,
        phone: phone || existing.phone,
        town: town || existing.town,
        area: area || existing.area,
        details: details !== undefined ? details : existing.details,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      })
      .where(eq(addresses.id, parseInt(id)))
      .returning();

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const [deleted] = await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, parseInt(id)),
          eq(addresses.userId, session.userId),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 },
    );
  }
}

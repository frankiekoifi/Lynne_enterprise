import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await req.json();
    const { name, slug, description, imageUrl, parentId, sortOrder = 0 } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 },
      );
    }

    const [category] = await db
      .insert(categories)
      .values({
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        active: true,
        sortOrder,
      })
      .returning();

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

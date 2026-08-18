import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, variations, productImages, paymentPlans } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const variationsData = await db
      .select()
      .from(variations)
      .where(eq(variations.productId, productId));

    const variationIds = variationsData.map((v) => v.id);
    let plansData: any[] = [];

    if (variationIds.length > 0) {
      plansData = await db
        .select()
        .from(paymentPlans)
        .where(
          sql`payment_plans.variation_id IN (${sql.join(variationIds, sql.raw(","))})`,
        );
    }

    const variationsWithPlans = variationsData.map((v) => ({
      ...v,
      paymentPlans: plansData.filter((p) => p.variationId === v.id),
    }));

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder);

    return NextResponse.json({
      ...product,
      variations: variationsWithPlans,
      images,
    });
  } catch (error) {
    console.error("Error fetching product for admin:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      sku,
      categoryId,
      subcategoryId,
      description,
      coverImage,
      status,
      cashAvailable,
      lipaAvailable,
    } = body;

    const [updated] = await db
      .update(products)
      .set({
        name: name || undefined,
        slug: slug || undefined,
        sku: sku !== undefined ? sku : undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId !== undefined ? subcategoryId : undefined,
        description: description !== undefined ? description : undefined,
        coverImage: coverImage !== undefined ? coverImage : undefined,
        status: status || undefined,
        cashAvailable: cashAvailable !== undefined ? cashAvailable : undefined,
        lipaAvailable: lipaAvailable !== undefined ? lipaAvailable : undefined,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: updated,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    await db.delete(variations).where(eq(variations.productId, productId));

    await db
      .delete(productImages)
      .where(eq(productImages.productId, productId));

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}

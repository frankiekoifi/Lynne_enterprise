import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  products,
  variations,
  productImages,
  paymentPlans,
  categories,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder);

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, product.categoryId));

    for (const v of variationsData) {
      const plans = await db
        .select()
        .from(paymentPlans)
        .where(eq(paymentPlans.variationId, v.id));
      (v as any).paymentPlans = plans;
    }

    return NextResponse.json({
      ...product,
      variations: variationsData,
      images,
      category,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

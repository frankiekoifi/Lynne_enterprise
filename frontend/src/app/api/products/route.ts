import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, variations, productImages, categories } from "@/db/schema";
import { eq, ilike, desc, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [eq(products.status, "active")];

    if (category) {
      conditions.push(eq(products.categoryId, parseInt(category)));
    }

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }

    const results = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const productIds = results.map((p) => p.id);

    let variationsData: any[] = [];
    let imagesData: any[] = [];
    let categoriesData: any[] = [];

    if (productIds.length > 0) {
      variationsData = await db
        .select()
        .from(variations)
        .where(
          sql`${variations.productId} IN (${sql.join(productIds, sql.raw(","))})`,
        );

      imagesData = await db
        .select()
        .from(productImages)
        .where(
          sql`${productImages.productId} IN (${sql.join(productIds, sql.raw(","))})`,
        );

      const categoryIds = [...new Set(results.map((p) => p.categoryId))];
      if (categoryIds.length > 0) {
        categoriesData = await db
          .select()
          .from(categories)
          .where(
            sql`${categories.id} IN (${sql.join(categoryIds, sql.raw(","))})`,
          );
      }
    }

    // Format response
    const formattedResults = results.map((product) => ({
      ...product,
      variations: variationsData.filter((v) => v.productId === product.id),
      images: imagesData.filter((i) => i.productId === product.id),
      category: categoriesData.find((c) => c.id === product.categoryId),
    }));

    return NextResponse.json({ products: formattedResults });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

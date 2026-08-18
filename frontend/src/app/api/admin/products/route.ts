import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, variations, productImages } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const allProducts = await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));

    const productIds = allProducts.map((p) => p.id);
    let variationsData: any[] = [];
    let imagesData: any[] = [];
    let categoriesData: any[] = [];

    if (productIds.length > 0) {
      variationsData = await db
        .select()
        .from(variations)
        .where(
          sql`variations.product_id IN (${sql.join(productIds, sql.raw(","))})`,
        );

      imagesData = await db
        .select()
        .from(productImages)
        .where(
          sql`product_images.product_id IN (${sql.join(productIds, sql.raw(","))})`,
        );

      const categoryIds = [...new Set(allProducts.map((p) => p.categoryId))];
      if (categoryIds.length > 0) {
        categoriesData = await db
          .select()
          .from(categories)
          .where(
            sql`categories.id IN (${sql.join(categoryIds, sql.raw(","))})`,
          );
      }
    }

    const formattedResults = allProducts.map((product) => ({
      ...product,
      variations: variationsData.filter((v) => v.productId === product.id),
      images: imagesData.filter((i) => i.productId === product.id),
      category: categoriesData.find((c) => c.id === product.categoryId),
    }));

    return NextResponse.json({ products: formattedResults });
  } catch (error) {
    console.error("Error fetching admin products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await req.json();
    const {
      name,
      slug,
      sku,
      categoryId,
      subcategoryId,
      description,
      coverImage,
      status = "active",
      cashAvailable = true,
      lipaAvailable = false,
      variations: variationsData = [],
    } = body;

    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { error: "Name, slug, and category are required" },
        { status: 400 },
      );
    }

    const [product] = await db
      .insert(products)
      .values({
        name,
        slug,
        sku: sku || null,
        categoryId,
        subcategoryId: subcategoryId || null,
        description: description || null,
        coverImage: coverImage || null,
        status,
        cashAvailable,
        lipaAvailable,
      })
      .returning();

    for (const v of variationsData) {
      await db.insert(variations).values({
        productId: product.id,
        name: v.name,
        sku: v.sku || null,
        price: v.price || 0,
        totalStock: v.stock || 0,
        availableStock: v.stock || 0,
        reservedStock: 0,
        soldStock: 0,
        cashAvailable: v.cashAvailable !== undefined ? v.cashAvailable : true,
        lipaAvailable: v.lipaAvailable !== undefined ? v.lipaAvailable : false,
        active: true,
      });
    }

    if (body.images && body.images.length > 0) {
      for (let i = 0; i < body.images.length; i++) {
        await db.insert(productImages).values({
          productId: product.id,
          url: body.images[i],
          sortOrder: i,
        });
      }
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}

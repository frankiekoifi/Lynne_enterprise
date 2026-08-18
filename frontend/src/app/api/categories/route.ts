import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    const parentCategories = allCategories.filter((c) => c.parentId === null);
    const subCategories = allCategories.filter((c) => c.parentId !== null);

    const categoryTree = parentCategories.map((parent) => ({
      ...parent,
      subcategories: subCategories.filter((sub) => sub.parentId === parent.id),
    }));

    return NextResponse.json({ categories: categoryTree });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};

    for (const setting of allSettings) {
      settingsMap[setting.key] = setting.value || "";
    }

    const result = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(result)) {
      if (settingsMap[key] !== undefined) {
        (result as any)[key] = settingsMap[key];
      }
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) return adminCheck.response;

    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      const [existing] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key));

      if (existing) {
        await db
          .update(settings)
          .set({
            value: String(value),
            updatedAt: new Date(),
          })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          key,
          value: String(value),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

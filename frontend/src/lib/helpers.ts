import { db } from "@/db";
import { notifications, auditLogs, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function notify(
  userId: number,
  type: string,
  title: string,
  message: string,
): Promise<void> {
  await db.insert(notifications).values({ userId, type, title, message });
}

export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
): Promise<void> {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  for (const admin of admins) {
    await db
      .insert(notifications)
      .values({ userId: admin.id, type, title, message });
  }
}

export async function audit(
  userId: number | null | undefined,
  action: string,
  entity?: string,
  entityId?: number,
  opts: {
    previousValue?: unknown;
    newValue?: unknown;
    metadata?: unknown;
  } = {},
): Promise<void> {
  await db.insert(auditLogs).values({
    userId: userId ?? null,
    action,
    entity: entity ?? null,
    entityId: entityId ?? null,
    previousValue:
      opts.previousValue !== undefined ? JSON.stringify(opts.previousValue) : null,
    newValue: opts.newValue !== undefined ? JSON.stringify(opts.newValue) : null,
    metadata: opts.metadata !== undefined ? JSON.stringify(opts.metadata) : null,
  });
}

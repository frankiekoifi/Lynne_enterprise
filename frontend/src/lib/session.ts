import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readSession } from "@/lib/auth";

export type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
};

export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
    const session = await readSession();
    if (!session) return null;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    const user = rows[0];
    if (!user || user.status !== "active") return null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };
  },
);

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

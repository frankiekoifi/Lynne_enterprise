"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users, addresses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/helpers";

const registerSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(7, "Enter a valid phone number."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  town: z.string().optional(),
  area: z.string().optional(),
  details: z.string().optional(),
});

export async function registerAction(input: unknown, next?: string): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { fullName, email, phone, password, town, area, details } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length) return { error: "An account with this email already exists." };

  const hash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      fullName,
      email: email.toLowerCase(),
      phone,
      passwordHash: hash,
      role: "customer",
      status: "active",
    })
    .returning();

  if (town || area || details) {
    await db.insert(addresses).values({
      userId: user.id,
      label: "Home",
      phone,
      town: town ?? "",
      area: area ?? "",
      details: details ?? "",
      isDefault: true,
    });
  }

  await audit(user.id, "auth.register", "user", user.id, { newValue: { email: user.email } });
  await createSession(user.id, user.role);
  redirect(next && next.startsWith("/") ? next : "/account");
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(input: unknown, next?: string): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, password } = parsed.data;

  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  const user = rows[0];
  if (!user) return { error: "Invalid email or password." };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password." };
  if (user.status !== "active") return { error: "This account has been suspended." };

  await createSession(user.id, user.role);
  await audit(user.id, "auth.login", "user", user.id);
  redirect(next && next.startsWith("/") ? next : user.role === "admin" ? "/admin" : "/account");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

"use client";

import Link from "next/link";
import { useTransition, useState, type FormEvent } from "react";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAction(
        { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") },
        next,
      );
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-600/20">
          {error}
        </div>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required placeholder="••••••••" />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-ink-700/70">
        No account yet?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerAction(
        {
          fullName: String(fd.get("fullName") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          password: String(fd.get("password") ?? ""),
          town: String(fd.get("town") ?? ""),
          area: String(fd.get("area") ?? ""),
          details: String(fd.get("details") ?? ""),
        },
        next,
      );
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-600/20">
          {error}
        </div>
      )}
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required placeholder="Jane Wanjiku" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone number" htmlFor="phone">
          <Input id="phone" name="phone" required placeholder="+254 7XX XXX XXX" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </Field>
      </div>
      <Field label="Password" htmlFor="password" hint="At least 6 characters.">
        <Input id="password" name="password" type="password" required placeholder="••••••••" />
      </Field>

      <div className="rounded-xl bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-800">Delivery address (optional)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input name="town" placeholder="Town / City" />
          <Input name="area" placeholder="Area / Estate" />
        </div>
        <Input name="details" className="mt-3" placeholder="Street / building details" />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-ink-700/70">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

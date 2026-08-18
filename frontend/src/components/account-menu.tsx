"use client";

import Link from "next/link";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { initials } from "@/lib/utils";

export function AccountMenu({ user }: { user: { fullName: string; role: string } | null }) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:border-brand-400 hover:text-brand-700"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-flex"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const home = user.role === "admin" ? "/admin" : "/account";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1 hover:bg-ink-100"
        aria-label="Account menu"
      >
        <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials(user.fullName)}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white p-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="border-b border-ink-100 px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink-900">{user.fullName}</p>
            <p className="text-xs capitalize text-ink-700/70">{user.role}</p>
          </div>
          <Link href={home} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink-800 hover:bg-ink-100">
            Dashboard
          </Link>
          <Link href="/account/orders" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink-800 hover:bg-ink-100">
            My orders
          </Link>
          <Link href="/account/lipa" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink-800 hover:bg-ink-100">
            My Lipa Polepole
          </Link>
          <button
            onClick={() => logoutAction()}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

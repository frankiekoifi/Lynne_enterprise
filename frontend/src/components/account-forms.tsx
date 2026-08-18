"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import {
  updateProfileAction,
  addAddressAction,
  setDefaultAddressAction,
  deleteAddressAction,
} from "@/lib/actions/customer";

export function ProfileForm({
  user,
}: {
  user: { fullName: string; email: string; phone: string | null };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfileAction({
        fullName: String(fd.get("fullName") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        currentPassword: String(fd.get("currentPassword") ?? ""),
        newPassword: String(fd.get("newPassword") ?? ""),
      });
      if (res.error) setMsg({ type: "error", text: res.error });
      else {
        setMsg({ type: "ok", text: "Profile updated ✓" });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
      <Field label="Full name" htmlFor="pf-name">
        <Input id="pf-name" name="fullName" defaultValue={user.fullName} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="pf-email">
          <Input id="pf-email" name="email" type="email" defaultValue={user.email} required />
        </Field>
        <Field label="Phone" htmlFor="pf-phone">
          <Input id="pf-phone" name="phone" defaultValue={user.phone ?? ""} />
        </Field>
      </div>

      <div className="rounded-xl bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-800">Change password (optional)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input name="currentPassword" type="password" placeholder="Current password" />
          <Input name="newPassword" type="password" placeholder="New password" />
        </div>
      </div>

      <Button type="submit" disabled={pending}>Save changes</Button>
    </form>
  );
}

export function AddressManager({
  addresses,
}: {
  addresses: Array<{ id: number; label: string; phone: string | null; town: string | null; area: string | null; details: string | null; isDefault: boolean }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addAddressAction({
        label: String(fd.get("label") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        town: String(fd.get("town") ?? ""),
        area: String(fd.get("area") ?? ""),
        details: String(fd.get("details") ?? ""),
      });
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink-900">
                {a.label} {a.isDefault && <span className="text-xs font-bold text-brand-600">· Default</span>}
              </p>
            </div>
            <p className="mt-1 text-sm text-ink-700/80">
              {[a.details, a.area, a.town].filter(Boolean).join(", ") || "—"}
            </p>
            {a.phone && <p className="text-sm text-ink-700/70">{a.phone}</p>}
            <div className="mt-3 flex gap-2">
              {!a.isDefault && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => { await setDefaultAddressAction(a.id); router.refresh(); })}>
                  Set default
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await deleteAddressAction(a.id); router.refresh(); })}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-ink-900">Add new address</h2>
        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input name="label" placeholder="Label (e.g. Work)" required />
          <Input name="phone" placeholder="Phone" />
          <Input name="town" placeholder="Town / City" required />
          <Input name="area" placeholder="Area / Estate" />
          <Input name="details" className="sm:col-span-2" placeholder="Street / building details" />
          <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-auto">Add address</Button>
        </form>
      </Card>
    </div>
  );
}

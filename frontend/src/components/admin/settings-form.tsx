"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { updateSettingsAction } from "@/lib/actions/admin";
import type { BusinessSettings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const keys = Object.keys(settings);
    const entries: Record<string, string> = {};
    for (const key of keys) {
      const val = fd.get(key);
      if (val !== null) entries[key] = String(val);
    }
    // checkboxes
    entries.deliveryEnabled = fd.get("deliveryEnabled") === "on" ? "true" : "false";

    startTransition(async () => {
      await updateSettingsAction(entries);
      setMsg("Settings saved ✓");
      router.refresh();
      setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {msg && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{msg}</div>}

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-ink-900">Business details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name"><Input name="businessName" defaultValue={settings.businessName} /></Field>
          <Field label="Tagline"><Input name="tagline" defaultValue={settings.tagline} /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={settings.phone} /></Field>
          <Field label="Email"><Input name="email" defaultValue={settings.email} /></Field>
          <Field label="Address"><Input name="address" defaultValue={settings.address} /></Field>
          <Field label="Currency"><Input name="currency" defaultValue={settings.currency} /></Field>
          <Field label="Description"><Textarea name="description" defaultValue={settings.description} className="sm:col-span-2" /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Facebook URL"><Input name="facebook" defaultValue={settings.facebook} /></Field>
          <Field label="Instagram URL"><Input name="instagram" defaultValue={settings.instagram} /></Field>
          <Field label="TikTok URL"><Input name="tiktok" defaultValue={settings.tiktok} /></Field>
          <Field label="WhatsApp number"><Input name="whatsapp" defaultValue={settings.whatsapp} /></Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-ink-900">M-Pesa (Daraja) details</h2>
        <p className="text-xs text-ink-700/60">Stored server-side only — never exposed to the frontend.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paybill number"><Input name="mpesaPaybill" defaultValue={settings.mpesaPaybill} /></Field>
          <Field label="Till number"><Input name="mpesaTill" defaultValue={settings.mpesaTill} /></Field>
          <Field label="Shortcode"><Input name="mpesaShortcode" defaultValue={settings.mpesaShortcode} /></Field>
          <Field label="Passkey"><Input name="mpesaPasskey" type="password" defaultValue={settings.mpesaPasskey} /></Field>
          <Field label="Callback URL" className="sm:col-span-2"><Input name="mpesaCallbackUrl" defaultValue={settings.mpesaCallbackUrl} /></Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-ink-900">Delivery pricing</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Rate per kilometre (KSh)"><Input name="deliveryRatePerKm" type="number" defaultValue={settings.deliveryRatePerKm} /></Field>
          <Field label="Minimum charge (KSh)"><Input name="minimumDeliveryCharge" type="number" defaultValue={settings.minimumDeliveryCharge} /></Field>
          <Field label="Max distance (km, 0 = unlimited)"><Input name="maximumDeliveryDistance" type="number" defaultValue={settings.maximumDeliveryDistance} /></Field>
          <Field label="Free delivery over (KSh, 0 = off)"><Input name="freeDeliveryOver" type="number" defaultValue={settings.freeDeliveryOver} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="deliveryEnabled" defaultChecked={settings.deliveryEnabled} className="size-4 accent-brand-600" />
          Delivery is currently enabled
        </label>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-bold text-ink-900">Terms & policies</h2>
        <Field label="Lipa Polepole terms"><Textarea name="lipaTerms" defaultValue={settings.lipaTerms} /></Field>
        <Field label="Terms & conditions"><Textarea name="termsAndConditions" defaultValue={settings.termsAndConditions} /></Field>
        <Field label="Privacy policy"><Textarea name="privacyPolicy" defaultValue={settings.privacyPolicy} /></Field>
      </Card>

      <Button type="submit" disabled={pending} size="lg">{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

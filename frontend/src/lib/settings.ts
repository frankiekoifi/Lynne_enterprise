import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export type BusinessSettings = {
  businessName: string;
  tagline: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  currency: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  mpesaPaybill: string;
  mpesaTill: string;
  mpesaShortcode: string;
  mpesaPasskey: string;
  mpesaCallbackUrl: string;
  deliveryRatePerKm: number;
  deliveryEnabled: boolean;
  minimumDeliveryCharge: number;
  maximumDeliveryDistance: number;
  freeDeliveryOver: number;
  lipaTerms: string;
  termsAndConditions: string;
  privacyPolicy: string;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Lynne Enterprise",
  tagline: "Quality kitchen, bedding & furniture — pay your way.",
  logo: "",
  phone: "+254 700 000 000",
  email: "hello@lynneenterprise.co.ke",
  address: "Nairobi, Kenya",
  description:
    "Lynne Enterprise is your trusted retail partner for kitchen utensils, household products, bedding, furniture and more. Buy in full or pay gradually with Lipa Polepole.",
  currency: "KSh",
  facebook: "",
  instagram: "",
  tiktok: "",
  whatsapp: "",
  mpesaPaybill: "",
  mpesaTill: "",
  mpesaShortcode: "",
  mpesaPasskey: "",
  mpesaCallbackUrl: "",
  deliveryRatePerKm: 50,
  deliveryEnabled: true,
  minimumDeliveryCharge: 200,
  maximumDeliveryDistance: 100,
  freeDeliveryOver: 0,
  lipaTerms:
    "Lipa Polepole lets you reserve a product and pay gradually. A product is reserved for you immediately after your first payment and is only released for delivery or collection once fully paid.",
  termsAndConditions: "",
  privacyPolicy: "",
};

export async function getAllSettings(): Promise<BusinessSettings> {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value ?? "";
  const result = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<
    keyof BusinessSettings
  >) {
    const raw = map[key];
    if (raw !== undefined && raw !== null && raw !== "") {
      const def = DEFAULT_SETTINGS[key];
      if (typeof def === "number") {
        (result as Record<string, unknown>)[key] = Number(raw);
      } else if (typeof def === "boolean") {
        (result as Record<string, unknown>)[key] = raw === "true";
      } else {
        (result as Record<string, unknown>)[key] = raw;
      }
    }
  }
  return result;
}

export const getSettings = cache(async (): Promise<BusinessSettings> => {
  return getAllSettings();
});

export async function saveSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export function deliveryFeeForKm(km: number, s: BusinessSettings): number {
  if (!s.deliveryEnabled || km <= 0) return 0;
  if (s.maximumDeliveryDistance > 0 && km > s.maximumDeliveryDistance) {
    return 0;
  }
  const fee = Math.max(s.minimumDeliveryCharge, km * s.deliveryRatePerKm);
  return Math.round(fee);
}

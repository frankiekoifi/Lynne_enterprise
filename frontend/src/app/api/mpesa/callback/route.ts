import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { recordPayment } from "@/lib/core";
import { audit } from "@/lib/helpers";

/**
 * M-Pesa Daraja STK Push callback handler.
 *
 * Security notes for production:
 *  - Restrict this endpoint to Safaricom callback IPs.
 *  - Use the configured queue timeout (default 30s).
 *  - Validate the CheckoutRequestID against a locally-created pending payment.
 *  - Validate the received amount equals the expected amount before crediting.
 *  - Credentials (shortcode/passkey) live only in process.env — never client-side.
 */

interface MetadataItem {
  Name?: string;
  Value?: string | number;
}

function ack() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        Body?: {
          stkCallback?: {
            ResultCode?: number;
            CheckoutRequestID?: string;
            CallbackMetadata?: { Item?: MetadataItem[] };
          };
        };
      }
    | null;

  if (!body?.Body?.stkCallback) {
    // Unknown callback shape — acknowledge to avoid retries.
    return ack();
  }

  const cb = body.Body.stkCallback;
  const resultCode = Number(cb.ResultCode);
  const checkoutRequestId = cb.CheckoutRequestID;

  if (resultCode !== 0 || !checkoutRequestId) {
    // Failed or cancelled transaction — nothing to record.
    return ack();
  }

  const meta = cb.CallbackMetadata?.Item ?? [];
  const get = (name: string) => meta.find((i) => i.Name === name)?.Value;
  const receipt = get("MpesaReceiptNumber") ? String(get("MpesaReceiptNumber")) : null;
  const amount = Number(get("Amount")) || 0;
  const phone = get("PhoneNumber") ? String(get("PhoneNumber")) : null;

  if (!receipt || amount <= 0) {
    // Cannot verify amount/receipt — do not credit.
    return ack();
  }

  const pending = await db
    .select()
    .from(payments)
    .where(and(eq(payments.mpesaTransactionId, checkoutRequestId), eq(payments.status, "pending")))
    .limit(1);

  if (pending[0]) {
    // Record the verified payment (single source of truth) and supersede the
    // pending intent so totals are never double-counted.
    await recordPayment({
      userId: pending[0].userId,
      amount,
      method: "mpesa",
      lipaAccountId: pending[0].lipaAccountId,
      orderId: pending[0].orderId,
      mpesaReceipt: receipt,
      mpesaPhone: phone,
      mpesaTransactionId: checkoutRequestId,
      notes: "Verified via M-Pesa callback",
      actorId: null,
    });
    await db
      .update(payments)
      .set({ status: "failed", notes: "Superseded by verified payment" })
      .where(eq(payments.id, pending[0].id));
    await audit(null, "payment.mpesa_callback_verified", "payment", pending[0].id, {
      newValue: { receipt, amount },
    });
  }

  return ack();
}

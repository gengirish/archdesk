import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ── Create payment link for invoice ──────────────────────────
export async function createPaymentLink({
  amount,       // in paise (rupees × 100)
  description,
  customerName,
  customerPhone,
  customerEmail,
  referenceId,
  expiryDate,
}: {
  amount: number;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  referenceId: string;
  expiryDate?: Date;
}) {
  const link = await razorpay.paymentLink.create({
    amount,
    currency: "INR",
    description,
    reference_id: referenceId,
    customer: {
      name: customerName,
      contact: `+91${customerPhone}`,
      email: customerEmail,
    },
    notify: {
      sms: true,
      email: !!customerEmail,
      whatsapp: true,
    },
    reminder_enable: true,
    expire_by: expiryDate ? Math.floor(expiryDate.getTime() / 1000) : undefined,
  });

  return { id: link.id, url: link.short_url };
}

// ── Verify webhook signature ──────────────────────────────────
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

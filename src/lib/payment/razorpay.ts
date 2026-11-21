/**
 * Hosted Razorpay Payment Gateway Adapter & Signature Verifier (PRD-F13 / S18 / S19 / S20)
 * 
 * INVARIANTS:
 * 1. Monetary values sent to Razorpay are strictly in minor units (paise in INR).
 * 2. Signature verification uses HMAC-SHA256 over `${orderId}|${paymentId}` with key secret.
 * 3. Webhook signature verification uses HMAC-SHA256 over raw request body.
 * 4. Timing attacks prevented using crypto.timingSafeEqual.
 */

import crypto from "crypto";
import { isDemoMode, requireSecret } from "@/lib/runtime";

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_synthetic_2026";
// Secrets resolve lazily and fail closed in production when unset (S-PROD).
const getKeySecret = () => requireSecret("RAZORPAY_KEY_SECRET", "rzp_secret_synthetic_2026");
const getWebhookSecret = () => requireSecret("RAZORPAY_WEBHOOK_SECRET", "rzp_webhook_secret_2026");

/** True when the configured key pair looks like real Razorpay credentials. */
function hasRealGatewayKeys(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!/^rzp_(test|live)_[A-Za-z0-9]{8,}$/.test(keyId) || secret.length < 8) return false;
  return !/placeholder|synthetic/i.test(keyId + secret);
}

export interface CreateGatewayOrderParams {
  amountPaise: bigint | number;
  receipt: string; // Order number or ID
  notes?: Record<string, string>;
  currency?: string;
}

export interface GatewayOrderResult {
  id: string; // e.g. "order_H12345678"
  amount: number;
  currency: string;
  receipt: string;
}

/**
 * Creates a hosted Razorpay order (or deterministic test sandbox order).
 */
export async function createGatewayOrder(
  params: CreateGatewayOrderParams
): Promise<GatewayOrderResult> {
  const numericAmount = typeof params.amountPaise === "bigint" ? Number(params.amountPaise) : params.amountPaise;
  const currency = params.currency || "INR";

  // Real Razorpay Orders API whenever genuine keys are configured; the gateway
  // order binds the server-computed amount so the client cannot alter it.
  if (hasRealGatewayKeys()) {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${getKeySecret()}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numericAmount, currency, receipt: params.receipt, notes: params.notes || {} }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Razorpay order creation failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { id: string; amount: number; currency: string; receipt: string };
    return { id: data.id, amount: data.amount, currency: data.currency, receipt: data.receipt };
  }

  if (!isDemoMode()) {
    throw new Error("Razorpay keys are not configured. Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET before accepting payments.");
  }

  // Demo/sandbox: a simulated gateway order ID keeps the local flow testable.
  const orderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: orderId,
    amount: numericAmount,
    currency,
    receipt: params.receipt,
  };
}

/**
 * Verifies standard client redirect payment signature.
 * Formula: HMAC_SHA256(order_id + "|" + payment_id, secret) == signature
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}): boolean {
  const secret = params.secret || getKeySecret();
  if (!params.orderId || !params.paymentId || !params.signature) {
    return false;
  }

  const payload = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(params.signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature over raw HTTP body (S20 Invariant).
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secret?: string;
}): boolean {
  const secret = params.secret || getWebhookSecret();
  if (!params.rawBody || !params.signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(params.signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Generates a valid test signature for integration and webhook simulation.
 */
export function generateTestPaymentSignature(orderId: string, paymentId: string, secret?: string): string {
  const s = secret || getKeySecret();
  return crypto.createHmac("sha256", s).update(`${orderId}|${paymentId}`).digest("hex");
}

export function generateTestWebhookSignature(rawBody: string, secret?: string): string {
  const s = secret || getWebhookSecret();
  return crypto.createHmac("sha256", s).update(rawBody).digest("hex");
}


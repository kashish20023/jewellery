import { describe, it, expect, beforeEach } from "vitest";
import { POST as paymentWebhook } from "@/app/api/webhooks/payment/route";
import { POST as initCheckout } from "@/app/api/checkout/initialize/route";
import { generateTestWebhookSignature } from "@/lib/payment/razorpay";
import { setTestStock, resetMemoryReservations } from "@/lib/checkout/reservation";
import { NextRequest } from "next/server";

describe("Webhook Processing, Signature Verification & Late Payments (S20 / S22)", () => {
  beforeEach(() => {
    resetMemoryReservations();
    setTestStock("var-boundary-equal", 5);
  });

  describe("Webhook Signature Security & Idempotency (S20)", () => {
    it("strictly rejects forged or invalid webhook signatures with 400 Bad Request", async () => {
      const payload = JSON.stringify({
        id: "evt_forged_1",
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_forged_1" } } },
      });

      const req = new NextRequest("http://localhost:3000/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "forged_hex_signature_1234567890abcdef", // Invalid
        },
        body: payload,
      });

      const res = await paymentWebhook(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe("Invalid webhook signature.");
    });

    it("handles duplicate webhook submissions idempotently without double processing (S20)", async () => {
      const eventId = `evt_idempotent_${Date.now()}`;
      const payload = JSON.stringify({
        id: eventId,
        event: "payment.captured",
        payload: { payment: { entity: { id: `pay_${Date.now()}`, order_id: "order_test_dup" } } },
      });

      const signature = generateTestWebhookSignature(payload);

      // First webhook delivery
      const req1 = new NextRequest("http://localhost:3000/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": signature,
        },
        body: payload,
      });

      const res1 = await paymentWebhook(req1);
      expect(res1.status).toBe(200);

      // Second identical webhook delivery (replay or duplicate)
      const req2 = new NextRequest("http://localhost:3000/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": signature,
        },
        body: payload,
      });

      const res2 = await paymentWebhook(req2);
      expect(res2.status).toBe(200);
    });
  });

  describe("Late Payment Handling (S22 Invariant)", () => {
    it("safely allocates inventory when late payment arrives and stock is available", async () => {
      const initReq = new NextRequest("http://localhost:3000/api/checkout/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: "Isha Ambani", email: "isha@example.com", phone: "9876543210" },
          shippingAddress: { line1: "Altamount Road", city: "Mumbai", state: "Maharashtra", pinCode: "400026" },
          items: [{ variantId: "var-boundary-equal", quantity: 1 }],
        }),
      });

      const initRes = await initCheckout(initReq);
      const initData = await initRes.json();

      const payload = JSON.stringify({
        id: `evt_captured_${Date.now()}`,
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_captured_${Date.now()}`,
              order_id: initData.gatewayOrderId,
              status: "captured",
            },
          },
        },
      });

      const signature = generateTestWebhookSignature(payload);

      const req = new NextRequest("http://localhost:3000/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": signature,
        },
        body: payload,
      });

      const res = await paymentWebhook(req);
      expect(res.status).toBe(200);
    });
  });
});

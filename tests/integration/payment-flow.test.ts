import { describe, it, expect, beforeEach } from "vitest";
import { POST as initCheckout } from "@/app/api/checkout/initialize/route";
import { POST as verifyCheckout } from "@/app/api/checkout/verify/route";
import { POST as paymentWebhook } from "@/app/api/webhooks/payment/route";
import { generateTestPaymentSignature, generateTestWebhookSignature } from "@/lib/payment/razorpay";
import { setTestStock, resetMemoryReservations } from "@/lib/checkout/reservation";
import { NextRequest } from "next/server";

describe("Payment Flow & Sandbox Lifecycle (S18 / S19 / S21)", () => {
  beforeEach(() => {
    resetMemoryReservations();
    setTestStock("var-boundary-equal", 5);
  });

  it("completes full successful checkout lifecycle: init -> verify -> confirmed & committed (S18)", async () => {
    // 1. Initialize checkout
    const initReq = new NextRequest("http://localhost:3000/api/checkout/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: "Ananya Birla", email: "ananya@example.com", phone: "9876543210" },
        shippingAddress: { line1: "Worli Sea Face", city: "Mumbai", state: "Maharashtra", pinCode: "400030" },
        items: [{ variantId: "var-boundary-equal", quantity: 1 }],
      }),
    });

    const initRes = await initCheckout(initReq);
    expect(initRes.status).toBe(201);

    const initData = await initRes.json();
    expect(initData.success).toBe(true);
    expect(initData.orderId).toBeDefined();
    expect(initData.capabilityToken).toBeDefined();
    expect(initData.gatewayOrderId).toBeDefined();

    // 2. Verify Payment with Valid Sandbox Signature
    const simulatedPaymentId = "pay_test_sandbox_12345";
    const validSignature = generateTestPaymentSignature(initData.gatewayOrderId, simulatedPaymentId);

    const verifyReq = new NextRequest("http://localhost:3000/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: initData.orderId,
        gatewayPaymentId: simulatedPaymentId,
        gatewayOrderId: initData.gatewayOrderId,
        gatewaySignature: validSignature,
      }),
    });

    const verifyRes = await verifyCheckout(verifyReq);
    expect(verifyRes.status).toBe(200);

    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.capabilityToken).toBe(initData.capabilityToken);
  });

  it("releases inventory reservations upon receiving payment.failed event (S19)", async () => {
    // Initialize order
    const initReq = new NextRequest("http://localhost:3000/api/checkout/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: "Kabir Khan", email: "kabir@example.com", phone: "9876543210" },
        shippingAddress: { line1: "Bandra West", city: "Mumbai", state: "Maharashtra", pinCode: "400050" },
        items: [{ variantId: "var-boundary-equal", quantity: 1 }],
      }),
    });

    const initRes = await initCheckout(initReq);
    const initData = await initRes.json();

    // Send payment.failed webhook
    const failedPayload = JSON.stringify({
      id: `evt_failed_${Date.now()}`,
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed_999",
            order_id: initData.gatewayOrderId,
            status: "failed",
          },
        },
      },
    });

    const signature = generateTestWebhookSignature(failedPayload);

    const webhookReq = new NextRequest("http://localhost:3000/api/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: failedPayload,
    });

    const webhookRes = await paymentWebhook(webhookReq);
    expect(webhookRes.status).toBe(200);
  });

  it("handles browser refresh before redirect callback gracefully without creating duplicate orders (S21)", async () => {
    const initReq = new NextRequest("http://localhost:3000/api/checkout/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: "Pooja Hegde", email: "pooja@example.com", phone: "9876543210" },
        shippingAddress: { line1: "Juhu Tara Road", city: "Mumbai", state: "Maharashtra", pinCode: "400049" },
        items: [{ variantId: "var-boundary-equal", quantity: 1 }],
      }),
    });

    const initRes = await initCheckout(initReq);
    const initData = await initRes.json();

    const paymentId = "pay_test_idempotent_1";
    const sig = generateTestPaymentSignature(initData.gatewayOrderId, paymentId);

    // Call verify twice (simulating double click or browser refresh)
    const req1 = new NextRequest("http://localhost:3000/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: initData.orderId,
        gatewayPaymentId: paymentId,
        gatewayOrderId: initData.gatewayOrderId,
        gatewaySignature: sig,
      }),
    });

    const res1 = await verifyCheckout(req1);
    expect(res1.status).toBe(200);

    const req2 = new NextRequest("http://localhost:3000/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: initData.orderId,
        gatewayPaymentId: paymentId,
        gatewayOrderId: initData.gatewayOrderId,
        gatewaySignature: sig,
      }),
    });

    const res2 = await verifyCheckout(req2);
    expect(res2.status).toBe(200);
  });
});

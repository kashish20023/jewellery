import { describe, it, expect } from "vitest";
import { validateAndPriceCart } from "@/lib/checkout/cartValidation";
import { POST as initCheckout } from "@/app/api/checkout/initialize/route";
import { NextRequest } from "next/server";

describe("Cart Quantity & Price Tampering Protection (S16 Invariant)", () => {
  it("detects and overrides client price tampering, recalculating strictly from DB", async () => {
    // Attempt to tamper price of the ₹1,00,000 (10,000,000 paise) choker to ₹1 (100 paise)
    const tamperedPayload = [
      {
        variantId: "var-boundary-equal",
        quantity: 1,
        claimedUnitPricePaise: "100", // Tampered: 1 Rupee!
      },
    ];

    const result = await validateAndPriceCart(tamperedPayload, "103"); // Tampered total: ₹1.03

    expect(result.isValid).toBe(true);
    expect(result.tamperDetected).toBe(true);

    // Server-enforced true price
    const item = result.items[0];
    expect(item.unitPricePaise).toBe(10_000_000n); // ₹1,00,000
    expect(result.subtotalPaise).toBe(10_000_000n);
    expect(result.taxPaise).toBe(300_000n); // 3% GST = ₹3,000
    expect(result.totalPaise).toBe(10_300_000n); // ₹1,03,000
  });

  it("strictly rejects negative or non-integer quantities at API level", async () => {
    const req = new NextRequest("http://localhost:3000/api/checkout/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: "Rohan Varma", email: "rohan@example.com", phone: "9876543210" },
        shippingAddress: { line1: "123 Nariman Point", city: "Mumbai", state: "Maharashtra", pinCode: "400021" },
        items: [{ variantId: "var-boundary-equal", quantity: -2 }], // Negative quantity!
      }),
    });

    const res = await initCheckout(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("strictly rejects checkout on items marked isEnquiryOnly regardless of client request", async () => {
    // "var-enquiry-only" is enquiryOnly
    const enquiryItem = [
      {
        variantId: "var-enquiry-only",
        quantity: 1,
      },
    ];

    const result = await validateAndPriceCart(enquiryItem);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("inquiry-only bespoke piece");
  });

  it("strictly rejects checkout on pieces with priceVisibility ON_REQUEST", async () => {
    // "var-on-request" is ON_REQUEST
    const onRequestItem = [
      {
        variantId: "var-on-request",
        quantity: 1,
      },
    ];

    const result = await validateAndPriceCart(onRequestItem);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("upon request");
  });
});

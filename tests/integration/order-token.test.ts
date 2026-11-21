import { describe, it, expect } from "vitest";
import { GET as getOrderByToken } from "@/app/api/orders/[token]/route";
import { POST as initCheckout } from "@/app/api/checkout/initialize/route";
import { NextRequest } from "next/server";

describe("Guest Order Capability Token Security (S24 Invariant)", () => {
  it("strictly rejects sequential or numeric order ID guesses with 404 Not Found", async () => {
    // Attempt sequential integer guessing
    const reqNumeric = new NextRequest("http://localhost:3000/api/orders/1");
    const resNumeric = await getOrderByToken(reqNumeric, {
      params: Promise.resolve({ token: "1" }),
    });
    expect(resNumeric.status).toBe(404);

    // Attempt human order number guessing
    const reqOrderNum = new NextRequest("http://localhost:3000/api/orders/ORD-2026-1001");
    const resOrderNum = await getOrderByToken(reqOrderNum, {
      params: Promise.resolve({ token: "ORD-2026-1001" }),
    });
    expect(resOrderNum.status).toBe(404);

    // Attempt arbitrary non-UUID string
    const reqArbitrary = new NextRequest("http://localhost:3000/api/orders/admin_guess");
    const resArbitrary = await getOrderByToken(reqArbitrary, {
      params: Promise.resolve({ token: "admin_guess" }),
    });
    expect(resArbitrary.status).toBe(404);
  });

  it("retrieves order successfully using valid opaque capability token (uuidv4)", async () => {
    // 1. Initialize an order to receive a real capabilityToken
    const initReq = new NextRequest("http://localhost:3000/api/checkout/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: "Mira Rajput", email: "mira@example.com", phone: "9876543210" },
        shippingAddress: { line1: "Juhu Beach Road", city: "Mumbai", state: "Maharashtra", pinCode: "400049" },
        items: [{ variantId: "var-boundary-equal", quantity: 1 }],
      }),
    });

    const initRes = await initCheckout(initReq);
    const initData = await initRes.json();
    const token = initData.capabilityToken;

    expect(token).toBeDefined();

    // 2. Query with valid capability token
    const queryReq = new NextRequest(`http://localhost:3000/api/orders/${token}`);
    const queryRes = await getOrderByToken(queryReq, {
      params: Promise.resolve({ token }),
    });

    expect(queryRes.status).toBe(200);

    const queryData = await queryRes.json();
    expect(queryData.success).toBe(true);
    expect(queryData.order.customerName).toBe("Mira Rajput");
    expect(queryData.order.orderNumber).toBe(initData.orderNumber);
    expect(queryData.order.items).toHaveLength(1);
  });
});

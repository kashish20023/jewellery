import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/policy/evaluate/route";
import { NextRequest } from "next/server";

function createPostRequest(body: any): NextRequest {
  return new NextRequest("http://localhost:3000/api/policy/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Server-Authoritative Product Policy API (/api/policy/evaluate)", () => {
  it("evaluates boundary item at exact threshold (10,000,000 paise) enabling Buy AND WhatsApp (S06)", async () => {
    const req = createPostRequest({ slug: "heritage-polki-emerald-choker" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.canPurchase).toBe(true);
    expect(data.isHighValue).toBe(true);
    expect(data.showWhatsApp).toBe(true);
    expect(data.ctaType).toBe("BUY_AND_WHATSAPP");
    expect(data.displayPrice).toBe("₹1,00,000");
  });

  it("evaluates item below threshold (9,999,900 paise) enabling Buy Now without WhatsApp", async () => {
    const req = createPostRequest({ slug: "solitaire-diamond-pendant-18k" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.canPurchase).toBe(true);
    expect(data.isHighValue).toBe(false);
    expect(data.showWhatsApp).toBe(false);
    expect(data.ctaType).toBe("BUY_NOW");
    expect(data.displayPrice).toBe("₹99,999");
  });

  it("strictly disables purchase on enquiryOnly item regardless of client parameters (S07)", async () => {
    const req = createPostRequest({ slug: "bespoke-bridal-nath-maang-tikka-set" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.canPurchase).toBe(false);
    expect(data.showWhatsApp).toBe(true);
    expect(data.ctaType).toBe("WHATSAPP_ONLY");
    expect(data.requiresEnquiry).toBe(true);
  });

  it("strictly disables purchase and hides price on ON_REQUEST item (S08)", async () => {
    const req = createPostRequest({ slug: "royal-nizam-basra-pearl-diamond-necklace" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.canPurchase).toBe(false);
    expect(data.priceVisibility).toBe("ON_REQUEST");
    expect(data.displayPrice).toBe("Price upon request");
    expect(data.ctaType).toBe("WHATSAPP_ONLY");
  });

  it("returns 400 Bad Request when identifiers are missing", async () => {
    const req = createPostRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 404 Not Found when product does not exist", async () => {
    const req = createPostRequest({ slug: "non-existent-luxury-item-404" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});


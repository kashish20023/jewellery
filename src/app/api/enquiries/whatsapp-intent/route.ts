import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const intentSchema = z.object({
  sku: z.string().trim().max(64).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
});

/** Only http(s) URLs are ever stored; anything else (javascript:, data:) is dropped. */
function sanitizeSourceUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://invalid.local");
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return url.slice(0, 500);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const { isLimited } = checkRateLimit(`wa_intent_${clientIp}`, { limit: 20, windowMs: 600_000 });
    if (isLimited) {
      // Tracking endpoint: rate-limited silently, still a 200 so the UI never blocks.
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = intentSchema.safeParse(body);
    const sku = parsed.success ? parsed.data.sku || null : null;
    const sourceUrl = parsed.success ? sanitizeSourceUrl(parsed.data.sourceUrl) : null;

    // Record intention asynchronously
    try {
      await db.enquiryLead.create({
        data: {
          type: "WHATSAPP_INTENT",
          customerName: "Anonymous WhatsApp Clicker",
          customerPhone: "0000000000",
          variantSku: sku,
          sourceUrl,
          status: "NEW",
          consentToContact: true,
        },
      });
    } catch (err) {
      // Invariant S10: Tracking failure must never throw or block
      console.warn("WhatsApp intent DB record skipped:", err);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

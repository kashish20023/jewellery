import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const callbackSchema = z.object({
  customerName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+91[\-\s]?)?[6789]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
  customerEmail: z.string().trim().max(254).email("Invalid email format").optional().or(z.literal("")),
  preferredTime: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
  productId: z.string().trim().max(64).optional(),
  variantSku: z.string().trim().max(64).optional(),
  consentToContact: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Anti-spam rate limiting by IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { isLimited, resetTimeMs } = checkRateLimit(`callback_${clientIp}`, {
      limit: 5,
      windowMs: 600_000, // 10 minutes
    });

    if (isLimited) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many callback requests submitted. Please wait a few minutes or contact our WhatsApp concierge directly.",
          retryAfterSeconds: Math.ceil(resetTimeMs / 1000),
        },
        { status: 429 }
      );
    }

    // 2. Validate payload
    const body = await req.json();
    const parsed = callbackSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 3. Persist lead in PostgreSQL (S11 Invariant)
    try {
      const lead = await db.enquiryLead.create({
        data: {
          type: "CALLBACK",
          customerName: data.customerName,
          customerPhone: data.customerPhone.replace(/\D/g, "").slice(-10), // normalize to 10 digits
          customerEmail: data.customerEmail || null,
          preferredTime: data.preferredTime || "Anytime during business hours (10 AM - 7 PM)",
          message: data.message || null,
          productId: data.productId || null,
          variantSku: data.variantSku || null,
          consentToContact: data.consentToContact,
          status: "NEW",
        },
      });

      return NextResponse.json(
        {
          success: true,
          leadId: lead.id,
          message: "Your callback request has been registered. An atelier concierge stylist will contact you shortly.",
        },
        { status: 201 }
      );
    } catch (dbError) {
      // S11: Database failure reports honest failure response so client can retry
      console.error("Database error saving callback lead:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Our atelier reservation system is currently experiencing high load. Please retry or contact us directly on WhatsApp.",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Unhandled error in callback API:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred processing your request." },
      { status: 500 }
    );
  }
}


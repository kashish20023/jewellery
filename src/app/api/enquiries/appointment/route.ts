import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const appointmentSchema = z.object({
  customerName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+91[\-\s]?)?[6789]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
  customerEmail: z.string().trim().max(254).email("Please provide a valid email address for consultation details"),
  requestedDate: z.string().trim().min(6, "Please select an appointment date").max(40),
  requestedTimeSlot: z.string().trim().min(3, "Please select a consultation time slot").max(60),
  locationPreference: z.enum(["IN_STORE", "VIRTUAL"]),
  productId: z.string().trim().max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { isLimited, resetTimeMs } = checkRateLimit(`appointment_${clientIp}`, {
      limit: 5,
      windowMs: 600_000,
    });

    if (isLimited) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many appointment requests submitted. Please wait or connect directly with our WhatsApp concierge.",
          retryAfterSeconds: Math.ceil(resetTimeMs / 1000),
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    let parsedDate: Date;
    try {
      parsedDate = new Date(data.requestedDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid appointment date format provided." },
        { status: 400 }
      );
    }

    // Persist appointment request in database (S12 Invariant)
    try {
      const appointment = await db.appointmentRequest.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone.replace(/\D/g, "").slice(-10),
          customerEmail: data.customerEmail,
          requestedDate: parsedDate,
          requestedTimeSlot: data.requestedTimeSlot,
          locationPreference: data.locationPreference,
          productId: data.productId || null,
          status: "NEW",
        },
      });

      // S12 Contract: Returned explicitly as UNCONFIRMED request requiring concierge confirmation
      return NextResponse.json(
        {
          success: true,
          status: "REQUESTED_UNCONFIRMED",
          appointmentId: appointment.id,
          message:
            "Your appointment request has been submitted. Our concierge team will review availability and contact you via phone or WhatsApp to confirm your private slot.",
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error("Database error saving appointment request:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to schedule appointment at this time. Please retry or contact us directly on WhatsApp.",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Unhandled error in appointment API:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}


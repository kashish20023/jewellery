import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { FIXTURE_OFFERS } from "@/lib/fixtures/offers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const offerSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(240).optional().nullable(),
  code: z.string().trim().max(32).optional().nullable(),
  isAuto: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(999).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const offers = await db.offer.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ success: true, offers });
  } catch {
    return NextResponse.json({
      success: true,
      offers: FIXTURE_OFFERS,
      warning: "Database not connected; returned fixture offers (read-only).",
    });
  }
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(session.role, "MANAGER")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only MANAGER or OWNER can manage offers." },
      { status: 403 }
    );
  }

  const parsed = offerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid offer payload." }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const offer = await db.offer.create({
      data: {
        title: d.title,
        description: d.description || null,
        code: d.code ? d.code.toUpperCase() : null,
        isAuto: d.isAuto ?? !d.code,
        isActive: d.isActive ?? true,
        displayOrder: d.displayOrder ?? 0,
        startsAt: d.startsAt ? new Date(d.startsAt) : null,
        endsAt: d.endsAt ? new Date(d.endsAt) : null,
      },
    });
    await writeAudit({
      data: {
        userId: session.id,
        action: "OFFER_CREATE",
        entityType: "Offer",
        entityId: offer.id,
        details: { title: offer.title, code: offer.code },
      },
    });
    return NextResponse.json({ success: true, offer }, { status: 201 });
  } catch (error) {
    console.error("Offer create failed:", error);
    return NextResponse.json({ success: false, error: "Failed to create offer." }, { status: 500 });
  }
}

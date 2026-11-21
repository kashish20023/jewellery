import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const dynamic = "force-dynamic";

const offerPatchSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(240).optional().nullable(),
  code: z.string().trim().max(32).optional().nullable(),
  isAuto: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(999).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

function guard(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  if (!hasRole(session.role, "MANAGER")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden: Only MANAGER or OWNER can manage offers." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

function revalidate() {
  try {
    revalidatePath("/shop");
    revalidatePath("/products/[slug]", "page");
  } catch {
    // no-op outside the Next runtime
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = guard(req);
  if ("error" in g) return g.error;
  const { id } = await params;

  const parsed = offerPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid offer payload." }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const offer = await db.offer.update({
      where: { id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description || null }),
        ...(d.code !== undefined && { code: d.code ? d.code.toUpperCase() : null }),
        ...(d.isAuto !== undefined && { isAuto: d.isAuto }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        ...(d.displayOrder !== undefined && { displayOrder: d.displayOrder }),
        ...(d.startsAt !== undefined && { startsAt: d.startsAt ? new Date(d.startsAt) : null }),
        ...(d.endsAt !== undefined && { endsAt: d.endsAt ? new Date(d.endsAt) : null }),
      },
    });
    await writeAudit({
      data: {
        userId: g.session.id,
        action: "OFFER_UPDATE",
        entityType: "Offer",
        entityId: offer.id,
        details: d,
      },
    });
    revalidate();
    return NextResponse.json({ success: true, offer });
  } catch (error) {
    console.error("Offer update failed:", error);
    return NextResponse.json({ success: false, error: "Failed to update offer." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = guard(req);
  if ("error" in g) return g.error;
  const { id } = await params;
  try {
    await db.offer.delete({ where: { id } });
    await writeAudit({
      data: { userId: g.session.id, action: "OFFER_DELETE", entityType: "Offer", entityId: id, details: {} },
    });
    revalidate();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Offer delete failed:", error);
    return NextResponse.json({ success: false, error: "Failed to delete offer." }, { status: 500 });
  }
}

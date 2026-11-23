import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { slugify } from "@/lib/utils";
import { revalidateCollectionSurfaces } from "@/lib/admin/revalidate";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(600).optional().nullable(),
  bannerImageUrl: z.string().trim().max(600).optional().nullable(),
  displayOrder: z.number().int().min(0).max(999).optional(),
  showInNav: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

type AdminSession = NonNullable<ReturnType<typeof getAdminSessionFromRequest>>;

/**
 * Explicit union with `never` arms so a truthiness check on `error` narrows
 * cleanly. (`"error" in g` would not: the property is optional on both arms,
 * so the handlers' return type would pick up `undefined`.)
 */
type Guard = { error: NextResponse; session?: never } | { error?: never; session: AdminSession };

function guard(req: NextRequest): Guard {
  const session = getAdminSessionFromRequest(req);
  if (!session) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  if (!hasRole(session.role, "MANAGER")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden: Only MANAGER or OWNER can manage collections." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = guard(req);
  if (g.error) return g.error;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid collection payload." }, { status: 400 });
  }
  const d = parsed.data;

  // Renaming the slug moves the public URL, so it has to stay unique.
  let slug: string | undefined;
  if (d.slug !== undefined) {
    slug = slugify(d.slug);
    if (!slug) {
      return NextResponse.json({ success: false, error: "The slug must contain at least one letter or digit." }, { status: 400 });
    }
    const clash = await db.collection.findUnique({ where: { slug }, select: { id: true, title: true } });
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { success: false, error: `“${clash.title}” already uses /collections/${slug}.` },
        { status: 409 }
      );
    }
  }

  try {
    const collection = await db.collection.update({
      where: { id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(slug !== undefined && { slug }),
        ...(d.description !== undefined && { description: d.description || null }),
        ...(d.bannerImageUrl !== undefined && { bannerImageUrl: d.bannerImageUrl || null }),
        ...(d.displayOrder !== undefined && { displayOrder: d.displayOrder }),
        ...(d.showInNav !== undefined && { showInNav: d.showInNav }),
        ...(d.isArchived !== undefined && { isArchived: d.isArchived }),
      },
      include: { _count: { select: { products: true } } },
    });
    await writeAudit({
      data: {
        userId: g.session.id,
        action: "COLLECTION_UPDATE",
        entityType: "Collection",
        entityId: collection.id,
        details: { ...d, ...(slug !== undefined && { slug }) },
      },
    });
    revalidateCollectionSurfaces();
    const { _count, ...rest } = collection;
    return NextResponse.json({ success: true, collection: { ...rest, productCount: _count.products } });
  } catch (error) {
    console.error("Collection update failed:", error);
    return NextResponse.json({ success: false, error: "Failed to update collection." }, { status: 500 });
  }
}

/**
 * DELETE: removes the collection and its product tags (ProductCollection
 * cascades). Products themselves are untouched. Archive instead when the
 * collection may come back.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = guard(req);
  if (g.error) return g.error;
  const { id } = await params;
  try {
    const existing = await db.collection.findUnique({ where: { id }, select: { slug: true, title: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "That collection no longer exists." }, { status: 404 });
    }
    await db.collection.delete({ where: { id } });
    await writeAudit({
      data: {
        userId: g.session.id,
        action: "COLLECTION_DELETE",
        entityType: "Collection",
        entityId: id,
        details: { slug: existing.slug, title: existing.title },
      },
    });
    revalidateCollectionSurfaces();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Collection delete failed:", error);
    return NextResponse.json({ success: false, error: "Failed to delete collection." }, { status: 500 });
  }
}

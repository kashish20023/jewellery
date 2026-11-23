import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { slugify } from "@/lib/utils";
import { FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";
import { revalidateCollectionSurfaces } from "@/lib/admin/revalidate";
import { z } from "zod";

export const dynamic = "force-dynamic";

const collectionSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(600).optional().nullable(),
  bannerImageUrl: z.string().trim().url().max(600).optional().nullable().or(z.literal("")),
  displayOrder: z.number().int().min(0).max(999).optional(),
  showInNav: z.boolean().optional(),
});

/**
 * GET: every collection the owner has, archived ones included, so the admin
 * list can restore them. The product editor reads the same payload to build
 * its tag checkboxes.
 */
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const collections = await db.collection.findMany({
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({
      success: true,
      collections: collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        bannerImageUrl: c.bannerImageUrl,
        displayOrder: c.displayOrder,
        showInNav: c.showInNav,
        isArchived: c.isArchived,
        productCount: c._count.products,
      })),
    });
  } catch {
    return NextResponse.json({
      success: true,
      collections: FIXTURE_COLLECTIONS.map((c) => ({
        id: c.slug,
        slug: c.slug,
        title: c.title,
        description: c.description,
        bannerImageUrl: c.bannerImageUrl,
        displayOrder: c.displayOrder,
        showInNav: true,
        isArchived: false,
        productCount: 0,
      })),
      warning: "Database not connected; fixture collections returned (read-only).",
    });
  }
}

/** POST: create a collection. MANAGER+ only; the slug is derived when absent. */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(session.role, "MANAGER")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only MANAGER or OWNER can manage collections." },
      { status: 403 }
    );
  }

  const parsed = collectionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid collection payload." }, { status: 400 });
  }
  const d = parsed.data;
  const slug = slugify(d.slug || d.title);
  if (!slug) {
    return NextResponse.json({ success: false, error: "The title must contain at least one letter or digit." }, { status: 400 });
  }

  try {
    const clash = await db.collection.findUnique({ where: { slug }, select: { id: true, title: true, isArchived: true } });
    if (clash) {
      return NextResponse.json(
        {
          success: false,
          error: clash.isArchived
            ? `“${clash.title}” already uses /collections/${slug} and is archived. Restore it instead, or choose another name.`
            : `“${clash.title}” already uses /collections/${slug}. Choose another name or set a different slug.`,
        },
        { status: 409 }
      );
    }

    const collection = await db.collection.create({
      data: {
        slug,
        title: d.title,
        description: d.description || null,
        bannerImageUrl: d.bannerImageUrl || null,
        displayOrder: d.displayOrder ?? 0,
        showInNav: d.showInNav ?? true,
      },
    });
    await writeAudit({
      data: {
        userId: session.id,
        action: "COLLECTION_CREATE",
        entityType: "Collection",
        entityId: collection.id,
        details: { slug: collection.slug, title: collection.title, showInNav: collection.showInNav },
      },
    });
    revalidateCollectionSurfaces();
    return NextResponse.json(
      { success: true, collection: { ...collection, productCount: 0 } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Collection create failed:", error);
    return NextResponse.json({ success: false, error: "Failed to create collection." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const collections = await db.collection.findMany({
      where: { isArchived: false },
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({
      success: true,
      collections: collections.map((c) => ({ id: c.id, slug: c.slug, title: c.title, productCount: c._count.products })),
    });
  } catch {
    return NextResponse.json({
      success: true,
      collections: FIXTURE_COLLECTIONS.map((c) => ({ id: c.slug, slug: c.slug, title: c.title, productCount: 0 })),
      warning: "Database not connected; fixture collections returned (read-only).",
    });
  }
}

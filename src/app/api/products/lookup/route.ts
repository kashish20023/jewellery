import { NextRequest, NextResponse } from "next/server";
import { getCatalogueProducts } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

/**
 * Public wishlist resolver: maps saved product ids/slugs to public DTOs.
 * Everything returned has already passed toPublicProductDto, so ON_REQUEST
 * pieces arrive price-redacted — raw fixture data never reaches the client.
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (ids.length === 0) {
    return NextResponse.json({ success: true, products: [] });
  }

  const all = await getCatalogueProducts();
  const wanted = new Set(ids);
  const products = all.filter((p) => wanted.has(p.id) || wanted.has(p.slug));

  return NextResponse.json({ success: true, products });
}

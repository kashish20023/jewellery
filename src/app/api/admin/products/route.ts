import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";
import { rupeesToPaise } from "@/lib/money";
import { PriceVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await db.product.findMany({
      include: {
        variants: true,
        media: {
          orderBy: { displayOrder: "asc" },
        },
        collections: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = products.map((p) => ({
      ...p,
      collectionSlugs: p.collections.map((pc) => pc.collection.slug),
      variants: p.variants.map((v) => ({
        ...v,
        pricePaise: v.pricePaise !== null ? v.pricePaise.toString() : null,
        compareAtPricePaise: v.compareAtPricePaise !== null ? v.compareAtPricePaise.toString() : null,
        goldValuePaise: v.goldValuePaise !== null ? v.goldValuePaise.toString() : null,
        stoneValuePaise: v.stoneValuePaise !== null ? v.stoneValuePaise.toString() : null,
        makingChargesPaise: v.makingChargesPaise !== null ? v.makingChargesPaise.toString() : null,
      })),
    }));

    return NextResponse.json({
      success: true,
      products: serialized,
    });
  } catch {
    // Resilient fallback to fixtures
    const serializedFixtures = FIXTURE_PRODUCTS.map((p) => ({
      id: p.id,
      slug: p.slug,
      skuGroup: p.skuGroup,
      title: p.title,
      description: p.description,
      craftsmanshipNotes: p.craftsmanshipNotes,
      materialSummary: p.materialSummary,
      stoneDetails: p.stoneDetails,
      certificationData: p.certificationData,
      isEnquiryOnly: p.isEnquiryOnly,
      priceVisibility: p.priceVisibility,
      forceWhatsApp: p.forceWhatsApp,
      category: p.category ?? null,
      isNewArrival: p.isNewArrival ?? false,
      isBestSeller: p.isBestSeller ?? false,
      styleId: p.styleId ?? null,
      stylingTip: p.stylingTip ?? null,
      dimensions: p.dimensions ?? null,
      diamondWeightCts: p.diamondWeightCts ?? null,
      diamondQuality: p.diamondQuality ?? null,
      polkiWeightCts: p.polkiWeightCts ?? null,
      polkiCount: p.polkiCount ?? null,
      otherStones: p.otherStones ?? null,
      grossWeightGrams: p.grossWeightGrams ?? null,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        metalType: v.metalType,
        metalColour: v.metalColour ?? null,
        size: v.size,
        purity: v.purity,
        pricePaise: v.pricePaise !== null ? v.pricePaise.toString() : null,
        compareAtPricePaise: v.compareAtPricePaise != null ? v.compareAtPricePaise.toString() : null,
        offerLabel: v.offerLabel ?? null,
        goldValuePaise: v.goldValuePaise != null ? v.goldValuePaise.toString() : null,
        stoneValuePaise: v.stoneValuePaise != null ? v.stoneValuePaise.toString() : null,
        makingChargesPaise: v.makingChargesPaise != null ? v.makingChargesPaise.toString() : null,
        makingDiscountPercent: v.makingDiscountPercent ?? null,
        goldWeightGrams: v.goldWeightGrams ?? null,
        stockQuantity: v.stockQuantity,
        isMadeToOrder: v.isMadeToOrder,
        leadTimeDays: v.leadTimeDays,
        isPurchaseEnabled: v.isPurchaseEnabled,
      })),
      media: p.media,
      collectionSlugs: p.collectionSlugs,
    }));

    return NextResponse.json({
      success: true,
      products: serializedFixtures,
    });
  }
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Creating products requires MANAGER or OWNER role
  if (!hasRole(session.role, "MANAGER")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only MANAGER or OWNER can create products." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      title,
      slug,
      skuGroup,
      description,
      materialSummary,
      stoneDetails,
      certificationData,
      craftsmanshipNotes,
      isEnquiryOnly = false,
      priceVisibility = "PUBLIC",
      forceWhatsApp = false,
      category,
      isNewArrival = false,
      isBestSeller = false,
      styleId,
      stylingTip,
      dimensions,
      diamondWeightCts,
      diamondQuality,
      polkiWeightCts,
      polkiCount,
      otherStones,
      grossWeightGrams,
      variants = [],
    } = body;
    const num = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

    if (!title || !slug || !skuGroup || !materialSummary) {
      return NextResponse.json(
        { success: false, error: "Missing required product fields: title, slug, skuGroup, materialSummary." },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug))) {
      return NextResponse.json({ success: false, error: "Slug must be lowercase letters, numbers and single hyphens." }, { status: 400 });
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ success: false, error: "Add at least one variant (colour, purity, size, price)." }, { status: 400 });
    }
    const skus = variants.map((v: { sku?: string }) => String(v.sku || "").trim().toUpperCase()).filter(Boolean);
    if (skus.length !== variants.length || new Set(skus).size !== skus.length) {
      return NextResponse.json({ success: false, error: "Every variant needs a unique SKU." }, { status: 400 });
    }
    const clash = await db.product.findFirst({ where: { OR: [{ slug }, { skuGroup }] }, select: { slug: true, skuGroup: true } });
    if (clash) {
      return NextResponse.json(
        { success: false, error: clash.slug === slug ? `This slug "${slug}" is already created in the backend. Choose a different slug, or edit the existing product.` : `SKU group "${skuGroup}" is already used in the backend.` },
        { status: 409 }
      );
    }
    const skuClash = await db.variant.findFirst({ where: { sku: { in: skus } }, select: { sku: true } });
    if (skuClash) {
      return NextResponse.json({ success: false, error: `SKU "${skuClash.sku}" already exists on another product.` }, { status: 409 });
    }

    const created = await db.product.create({
      data: {
        title,
        slug,
        skuGroup,
        description: description || `${title} fine jewellery.`,
        materialSummary,
        stoneDetails: stoneDetails || null,
        certificationData: certificationData || null,
        craftsmanshipNotes: craftsmanshipNotes || null,
        isEnquiryOnly: Boolean(isEnquiryOnly),
        priceVisibility: priceVisibility as PriceVisibility,
        forceWhatsApp: Boolean(forceWhatsApp),
        category: category || null,
        isNewArrival: Boolean(isNewArrival),
        isBestSeller: Boolean(isBestSeller),
        styleId: styleId || null,
        stylingTip: stylingTip || null,
        dimensions: dimensions || null,
        diamondWeightCts: num(diamondWeightCts),
        diamondQuality: diamondQuality || null,
        polkiWeightCts: num(polkiWeightCts),
        polkiCount: num(polkiCount) === null ? null : Math.round(Number(polkiCount)),
        otherStones: otherStones || null,
        grossWeightGrams: num(grossWeightGrams),
        variants: {
          create: variants.map((v: {
            sku: string;
            metalType: string;
            metalColour?: string;
            size?: string;
            purity?: string;
            priceInr?: number;
            compareAtPriceInr?: number;
            offerLabel?: string;
            goldValueInr?: number;
            stoneValueInr?: number;
            makingChargesInr?: number;
            makingDiscountPercent?: number;
            goldWeightGrams?: number;
            stockQuantity?: number;
            isMadeToOrder?: boolean;
            leadTimeDays?: number;
          }) => ({
            sku: String(v.sku).trim().toUpperCase(),
            metalType: v.metalType,
            metalColour: v.metalColour || null,
            size: v.size || null,
            purity: v.purity || null,
            pricePaise: v.priceInr ? rupeesToPaise(v.priceInr) : null,
            compareAtPricePaise: v.compareAtPriceInr ? rupeesToPaise(v.compareAtPriceInr) : null,
            offerLabel: v.offerLabel || null,
            goldValuePaise: v.goldValueInr ? rupeesToPaise(v.goldValueInr) : null,
            stoneValuePaise: v.stoneValueInr ? rupeesToPaise(v.stoneValueInr) : null,
            makingChargesPaise: v.makingChargesInr ? rupeesToPaise(v.makingChargesInr) : null,
            makingDiscountPercent: num(v.makingDiscountPercent),
            goldWeightGrams: num(v.goldWeightGrams),
            stockQuantity: v.stockQuantity || 0,
            isMadeToOrder: Boolean(v.isMadeToOrder),
            leadTimeDays: v.leadTimeDays ?? 14,
          })),
        },
      },
      include: {
        variants: true,
      },
    });

    // Photography (URL or uploaded) and collection membership
    const mediaRows = (Array.isArray(body.media) ? (body.media as Array<Record<string, unknown>>) : [])
      .filter((m) => typeof m.url === "string" && /^(https?:\/\/|\/uploads\/)/.test(String(m.url).trim()))
      .map((m, i) => ({
        productId: created.id,
        url: String(m.url).trim(),
        altText: (m.altText && String(m.altText).trim()) || title,
        displayOrder: Number.isFinite(Number(m.displayOrder)) ? Number(m.displayOrder) : i + 1,
        isPrimary: Boolean(m.isPrimary),
        isHoverImage: Boolean(m.isHoverImage),
        variantId: null as string | null,
      }));
    if (mediaRows.length > 0) {
      if (!mediaRows.some((r) => r.isPrimary)) mediaRows[0].isPrimary = true;
      await db.productMedia.createMany({ data: mediaRows });
    }
    if (Array.isArray(body.collectionSlugs) && body.collectionSlugs.length > 0) {
      const cols = await db.collection.findMany({ where: { slug: { in: (body.collectionSlugs as unknown[]).map(String) } }, select: { id: true } });
      if (cols.length) {
        await db.productCollection.createMany({ data: cols.map((c) => ({ productId: created.id, collectionId: c.id })), skipDuplicates: true });
      }
    }
    try {
      revalidatePath("/shop");
      revalidatePath("/");
      revalidatePath("/collections");
    } catch {
      // no-op outside the Next runtime
    }

    await writeAudit({
      data: {
        userId: session.id,
        action: "PRODUCT_CREATE",
        entityType: "Product",
        entityId: created.id,
        details: { title, slug, skuGroup },
      },
    });

    return NextResponse.json(
      {
        success: true,
        product: {
          ...created,
          variants: created.variants.map((v) => ({
            ...v,
            pricePaise: v.pricePaise !== null ? v.pricePaise.toString() : null,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product in database." },
      { status: 500 }
    );
  }
}


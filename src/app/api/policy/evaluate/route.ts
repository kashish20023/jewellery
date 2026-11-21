import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PriceVisibility } from "@prisma/client";
import { evaluateProductPolicy } from "@/lib/policy/evaluateProductPolicy";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";

export const dynamic = "force-dynamic";

interface VariantCandidate {
  id: string;
  sku: string;
  pricePaise: bigint | number | null;
  stockQuantity: number;
  isMadeToOrder: boolean;
  leadTimeDays: number;
  isPurchaseEnabled: boolean;
}

interface ProductCandidate {
  id: string;
  slug: string;
  isEnquiryOnly: boolean;
  priceVisibility: PriceVisibility;
  forceWhatsApp: boolean;
  variants: VariantCandidate[];
}

interface StoreSettingsCandidate {
  highValueThresholdPaise?: bigint | number;
  enablePurchases?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, variantId, slug, sku } = body;

    if (!productId && !slug && !variantId && !sku) {
      return NextResponse.json(
        { error: "Product identifier (productId or slug) or variant identifier (variantId or sku) is required" },
        { status: 400 }
      );
    }

    let productRecord: ProductCandidate | null = null;
    let variantRecord: VariantCandidate | null = null;
    let storeSettings: StoreSettingsCandidate | null = null;

    // 1. Fetch store settings
    try {
      storeSettings = await db.storeSettings.findUnique({
        where: { id: "default" },
      });
    } catch {
      // Graceful fallback defaults if DB is offline
      storeSettings = {
        highValueThresholdPaise: 10_000_000n,
        enablePurchases: true,
      };
    }

    // 2. Fetch product and variant from DB
    try {
      if (productId || slug) {
        const foundProduct = await db.product.findUnique({
          where: productId ? { id: productId } : { slug },
          include: { variants: true },
        });

        if (foundProduct) {
          productRecord = foundProduct as ProductCandidate;
          variantRecord = variantId
            ? productRecord.variants.find((v) => v.id === variantId) || null
            : sku
            ? productRecord.variants.find((v) => v.sku === sku) || null
            : productRecord.variants[0] || null;
        }
      } else if (variantId || sku) {
        const foundVariant = await db.variant.findUnique({
          where: variantId ? { id: variantId } : { sku },
          include: { product: { include: { variants: true } } },
        });
        if (foundVariant) {
          variantRecord = foundVariant as VariantCandidate;
          productRecord = foundVariant.product as ProductCandidate;
        }
      }
    } catch {
      // DB disconnected; will use fixtures fallback
    }

    // Fallback to fixtures if DB query did not find it
    if (!productRecord || !variantRecord) {
      const fixtureProduct = FIXTURE_PRODUCTS.find(
        (p) => p.id === productId || p.slug === slug || p.variants.some((v) => v.id === variantId || v.sku === sku)
      );

      if (fixtureProduct) {
        productRecord = fixtureProduct as ProductCandidate;
        variantRecord = variantId
          ? fixtureProduct.variants.find((v) => v.id === variantId) || null
          : sku
          ? fixtureProduct.variants.find((v) => v.sku === sku) || null
          : fixtureProduct.variants[0] || null;
      }
    }

    if (!productRecord || !variantRecord) {
      return NextResponse.json(
        { error: "Product or variant not found in catalogue" },
        { status: 404 }
      );
    }

    // 3. Centralized server-authoritative policy evaluation
    const policy = evaluateProductPolicy({
      product: {
        isEnquiryOnly: productRecord.isEnquiryOnly,
        priceVisibility: productRecord.priceVisibility,
        forceWhatsApp: productRecord.forceWhatsApp,
      },
      variant: {
        pricePaise: variantRecord.pricePaise !== null ? BigInt(variantRecord.pricePaise) : null,
        stockQuantity: variantRecord.stockQuantity,
        isMadeToOrder: variantRecord.isMadeToOrder,
        leadTimeDays: variantRecord.leadTimeDays,
        isPurchaseEnabled: variantRecord.isPurchaseEnabled,
      },
      storeSettings: {
        highValueThresholdPaise: storeSettings?.highValueThresholdPaise
          ? BigInt(storeSettings.highValueThresholdPaise)
          : 10_000_000n,
        enablePurchases: storeSettings?.enablePurchases ?? true,
      },
    });

    return NextResponse.json({
      productId: productRecord.id,
      productSlug: productRecord.slug,
      variantId: variantRecord.id,
      variantSku: variantRecord.sku,
      ...policy,
    });
  } catch (err) {
    console.error("Policy evaluation error:", err);
    return NextResponse.json(
      { error: "Internal server error during policy evaluation" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { rupeesToPaise } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { PriceVisibility } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        variants: true,
        media: true,
        collections: { include: { collection: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        variants: product.variants.map((v) => ({
          ...v,
          pricePaise: v.pricePaise !== null ? v.pricePaise.toString() : null,
          compareAtPricePaise: v.compareAtPricePaise !== null ? v.compareAtPricePaise.toString() : null,
          goldValuePaise: v.goldValuePaise !== null ? v.goldValuePaise.toString() : null,
          stoneValuePaise: v.stoneValuePaise !== null ? v.stoneValuePaise.toString() : null,
          makingChargesPaise: v.makingChargesPaise !== null ? v.makingChargesPaise.toString() : null,
        })),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Updating product pricing, stock, or policy requires MANAGER or OWNER (S13)
  if (!hasRole(session.role, "MANAGER")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only MANAGER or OWNER can modify products." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  try {
    // 1. Fetch current product and variants to inspect previous values for audit logging
    const existing = await db.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    // 2. Process Product-level updates (policy, description, visibility)
    const productUpdates: Record<string, unknown> = {};
    let policyChanged = false;

    if (body.title !== undefined) productUpdates.title = body.title;
    if (body.description !== undefined) productUpdates.description = body.description;
    if (body.craftsmanshipNotes !== undefined) productUpdates.craftsmanshipNotes = body.craftsmanshipNotes;
    if (body.materialSummary !== undefined) productUpdates.materialSummary = body.materialSummary;
    if (body.stoneDetails !== undefined) productUpdates.stoneDetails = body.stoneDetails;
    if (body.certificationData !== undefined) productUpdates.certificationData = body.certificationData;

    // Merchandising + product sheet fields (no policy impact)
    const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
    const num = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
    if (body.isArchived !== undefined && Boolean(body.isArchived) !== existing.isArchived) {
      productUpdates.isArchived = Boolean(body.isArchived);
      policyChanged = true;
    }
    if (body.category !== undefined) productUpdates.category = str(body.category);
    if (body.isNewArrival !== undefined) productUpdates.isNewArrival = Boolean(body.isNewArrival);
    if (body.isBestSeller !== undefined) productUpdates.isBestSeller = Boolean(body.isBestSeller);
    if (body.styleId !== undefined) productUpdates.styleId = str(body.styleId);
    if (body.stylingTip !== undefined) productUpdates.stylingTip = str(body.stylingTip);
    if (body.dimensions !== undefined) productUpdates.dimensions = str(body.dimensions);
    if (body.diamondWeightCts !== undefined) productUpdates.diamondWeightCts = num(body.diamondWeightCts);
    if (body.diamondQuality !== undefined) productUpdates.diamondQuality = str(body.diamondQuality);
    if (body.polkiWeightCts !== undefined) productUpdates.polkiWeightCts = num(body.polkiWeightCts);
    if (body.polkiCount !== undefined) productUpdates.polkiCount = num(body.polkiCount) === null ? null : Math.round(Number(body.polkiCount));
    if (body.otherStones !== undefined) productUpdates.otherStones = str(body.otherStones);
    if (body.grossWeightGrams !== undefined) productUpdates.grossWeightGrams = num(body.grossWeightGrams);

    if (body.isEnquiryOnly !== undefined && body.isEnquiryOnly !== existing.isEnquiryOnly) {
      productUpdates.isEnquiryOnly = Boolean(body.isEnquiryOnly);
      policyChanged = true;
    }

    if (body.priceVisibility !== undefined && body.priceVisibility !== existing.priceVisibility) {
      productUpdates.priceVisibility = body.priceVisibility as PriceVisibility;
      policyChanged = true;
    }

    if (body.forceWhatsApp !== undefined && body.forceWhatsApp !== existing.forceWhatsApp) {
      productUpdates.forceWhatsApp = Boolean(body.forceWhatsApp);
      policyChanged = true;
    }

    if (Object.keys(productUpdates).length > 0) {
      await db.product.update({
        where: { id },
        data: productUpdates,
      });

      if (policyChanged) {
        await writeAudit({
          data: {
            userId: session.id,
            action: "POLICY_UPDATE",
            entityType: "Product",
            entityId: id,
            details: {
              previousPolicy: {
                isEnquiryOnly: existing.isEnquiryOnly,
                priceVisibility: existing.priceVisibility,
                forceWhatsApp: existing.forceWhatsApp,
              },
              newPolicy: {
                isEnquiryOnly: productUpdates.isEnquiryOnly ?? existing.isEnquiryOnly,
                priceVisibility: productUpdates.priceVisibility ?? existing.priceVisibility,
                forceWhatsApp: productUpdates.forceWhatsApp ?? existing.forceWhatsApp,
              },
            },
          },
        });
      }
    }

    // 3. Process Variant-level updates (Price & Stock)
    if (body.variantUpdates && Array.isArray(body.variantUpdates)) {
      for (const vUpdate of body.variantUpdates) {
        const variant = existing.variants.find((v) => v.id === vUpdate.id || v.sku === vUpdate.sku);
        if (!variant) continue;

        const variantData: Record<string, unknown> = {};

        // Price Update
        if (vUpdate.priceInr !== undefined || vUpdate.pricePaise !== undefined) {
          const newPricePaise =
            vUpdate.pricePaise !== undefined
              ? BigInt(vUpdate.pricePaise)
              : rupeesToPaise(Number(vUpdate.priceInr));

          if (variant.pricePaise !== newPricePaise) {
            variantData.pricePaise = newPricePaise;

            // Audit Record for Price Update (S14)
            await writeAudit({
              data: {
                userId: session.id,
                action: "PRICE_UPDATE",
                entityType: "Variant",
                entityId: variant.id,
                details: {
                  sku: variant.sku,
                  productId: id,
                  previousPricePaise: variant.pricePaise !== null ? variant.pricePaise.toString() : null,
                  newPricePaise: newPricePaise.toString(),
                },
              },
            });
          }
        }

        // Stock Update
        if (vUpdate.stockQuantity !== undefined && vUpdate.stockQuantity !== variant.stockQuantity) {
          const newStock = Number(vUpdate.stockQuantity);
          variantData.stockQuantity = newStock;

          // Audit Record for Stock Adjust (S14)
          await writeAudit({
            data: {
              userId: session.id,
              action: "STOCK_ADJUST",
              entityType: "Variant",
              entityId: variant.id,
              details: {
                sku: variant.sku,
                productId: id,
                previousStock: variant.stockQuantity,
                newStock: newStock,
              },
            },
          });
        }

        if (vUpdate.isPurchaseEnabled !== undefined) {
          variantData.isPurchaseEnabled = Boolean(vUpdate.isPurchaseEnabled);
        }

        // Option attributes, offer pricing and indicative breakup (no policy impact)
        const money = (inr: unknown) =>
          inr === null || inr === undefined || inr === "" || Number.isNaN(Number(inr)) ? null : rupeesToPaise(Number(inr));
        if (vUpdate.metalType !== undefined && vUpdate.metalType) variantData.metalType = String(vUpdate.metalType);
        if (vUpdate.metalColour !== undefined) variantData.metalColour = str(vUpdate.metalColour);
        if (vUpdate.purity !== undefined) variantData.purity = str(vUpdate.purity);
        if (vUpdate.size !== undefined) variantData.size = str(vUpdate.size);
        if (vUpdate.compareAtPriceInr !== undefined) variantData.compareAtPricePaise = money(vUpdate.compareAtPriceInr);
        if (vUpdate.offerLabel !== undefined) variantData.offerLabel = str(vUpdate.offerLabel);
        if (vUpdate.goldValueInr !== undefined) variantData.goldValuePaise = money(vUpdate.goldValueInr);
        if (vUpdate.stoneValueInr !== undefined) variantData.stoneValuePaise = money(vUpdate.stoneValueInr);
        if (vUpdate.makingChargesInr !== undefined) variantData.makingChargesPaise = money(vUpdate.makingChargesInr);
        if (vUpdate.makingDiscountPercent !== undefined) variantData.makingDiscountPercent = num(vUpdate.makingDiscountPercent);
        if (vUpdate.goldWeightGrams !== undefined) variantData.goldWeightGrams = num(vUpdate.goldWeightGrams);
        if (vUpdate.isMadeToOrder !== undefined) variantData.isMadeToOrder = Boolean(vUpdate.isMadeToOrder);
        if (vUpdate.leadTimeDays !== undefined && num(vUpdate.leadTimeDays) !== null) variantData.leadTimeDays = Math.round(Number(vUpdate.leadTimeDays));
        if (vUpdate.isArchived !== undefined) variantData.isArchived = Boolean(vUpdate.isArchived);

        if (Object.keys(variantData).length > 0) {
          await db.variant.update({
            where: { id: variant.id },
            data: variantData,
          });
        }
      }
    }

    // 3b. New variants (e.g. another purity or colour of the same design)
    if (body.newVariants && Array.isArray(body.newVariants)) {
      const money = (inr: unknown) =>
        inr === null || inr === undefined || inr === "" || Number.isNaN(Number(inr)) ? null : rupeesToPaise(Number(inr));
      for (const nv of body.newVariants) {
        if (!nv?.sku || !nv?.metalType) continue;
        const created = await db.variant.create({
          data: {
            productId: id,
            sku: String(nv.sku).trim().toUpperCase(),
            metalType: String(nv.metalType),
            metalColour: str(nv.metalColour),
            purity: str(nv.purity),
            size: str(nv.size),
            pricePaise: money(nv.priceInr),
            compareAtPricePaise: money(nv.compareAtPriceInr),
            offerLabel: str(nv.offerLabel),
            goldValuePaise: money(nv.goldValueInr),
            stoneValuePaise: money(nv.stoneValueInr),
            makingChargesPaise: money(nv.makingChargesInr),
            makingDiscountPercent: num(nv.makingDiscountPercent),
            goldWeightGrams: num(nv.goldWeightGrams),
            stockQuantity: Math.max(0, Math.round(Number(nv.stockQuantity) || 0)),
            isMadeToOrder: Boolean(nv.isMadeToOrder),
            leadTimeDays: Math.round(Number(nv.leadTimeDays) || 14),
            isPurchaseEnabled: nv.isPurchaseEnabled === undefined ? true : Boolean(nv.isPurchaseEnabled),
          },
        });
        await writeAudit({
          data: {
            userId: session.id,
            action: "VARIANT_CREATE",
            entityType: "Variant",
            entityId: created.id,
            details: { sku: created.sku, productId: id, pricePaise: created.pricePaise?.toString() ?? null },
          },
        });
      }
    }

    // 3c. Photography: replace the media set (URL based; uploads need object storage)
    if (body.media && Array.isArray(body.media)) {
      const rows = (body.media as Array<Record<string, unknown>>)
        .filter((m) => typeof m.url === "string" && /^(https?:\/\/|\/uploads\/)/.test(String(m.url).trim()))
        .map((m, i) => ({
          productId: id,
          url: String(m.url).trim(),
          altText: str(m.altText) || existing.title,
          displayOrder: Number.isFinite(Number(m.displayOrder)) ? Number(m.displayOrder) : i + 1,
          isPrimary: Boolean(m.isPrimary),
          isHoverImage: Boolean(m.isHoverImage),
          variantId: str(m.variantId),
        }));
      if (rows.length > 0 && !rows.some((r) => r.isPrimary)) rows[0].isPrimary = true;
      await db.$transaction([
        db.productMedia.deleteMany({ where: { productId: id } }),
        db.productMedia.createMany({ data: rows }),
      ]);
      await writeAudit({
        data: { userId: session.id, action: "MEDIA_UPDATE", entityType: "Product", entityId: id, details: { count: rows.length } },
      });
    }

    // 3d. Merchandising: collection membership
    if (body.collectionSlugs && Array.isArray(body.collectionSlugs)) {
      const slugs = (body.collectionSlugs as unknown[]).map(String);
      const cols = await db.collection.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
      await db.$transaction([
        db.productCollection.deleteMany({ where: { productId: id } }),
        db.productCollection.createMany({ data: cols.map((c) => ({ productId: id, collectionId: c.id })), skipDuplicates: true }),
      ]);
      await writeAudit({
        data: { userId: session.id, action: "COLLECTIONS_UPDATE", entityType: "Product", entityId: id, details: { slugs } },
      });
    }

    // 4. Invalidate storefront caches (S14 Invariant)
    try {
      revalidatePath(`/products/${existing.slug}`);
      revalidatePath("/collections");
      revalidatePath("/shop");
      revalidatePath("/");
    } catch {
      // In standalone or test context, revalidatePath may be a no-op
    }

    // 5. Fetch and return updated product
    const updated = await db.product.findUnique({
      where: { id },
      include: { variants: true, media: { orderBy: { displayOrder: "asc" } }, collections: { include: { collection: true } } },
    });

    return NextResponse.json({
      success: true,
      message: "Product and variants updated successfully.",
      product: updated
        ? {
            ...updated,
            variants: updated.variants.map((v) => ({
              ...v,
              pricePaise: v.pricePaise !== null ? v.pricePaise.toString() : null,
              compareAtPricePaise: v.compareAtPricePaise !== null ? v.compareAtPricePaise.toString() : null,
              goldValuePaise: v.goldValuePaise !== null ? v.goldValuePaise.toString() : null,
              stoneValuePaise: v.stoneValuePaise !== null ? v.stoneValuePaise.toString() : null,
              makingChargesPaise: v.makingChargesPaise !== null ? v.makingChargesPaise.toString() : null,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product." },
      { status: 500 }
    );
  }
}

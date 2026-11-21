import { PrismaClient, PriceVisibility, Role } from "@prisma/client";
import { FIXTURE_COLLECTIONS, FIXTURE_PRODUCTS } from "../src/lib/fixtures/products";
import { FIXTURE_OFFERS } from "../src/lib/fixtures/offers";
import { hashPassword, DEFAULT_ADMIN_PASSWORD } from "../src/lib/admin/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with Store Settings, Collections, and Deterministic Fixtures...");

  // 1. Upsert Store Settings
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {
      storeName: "Chudiwalas",
      whatsappNumber: "919876543210",
      highValueThresholdPaise: 10_000_000n, // ₹1,00,000
      gstPercentage: 3.0,
      enablePurchases: true,
      contactEmail: "concierge@chudiwalas.com",
    },
    create: {
      id: "default",
      storeName: "Chudiwalas",
      whatsappNumber: "919876543210",
      highValueThresholdPaise: 10_000_000n,
      gstPercentage: 3.0,
      enablePurchases: true,
      contactEmail: "concierge@chudiwalas.com",
    },
  });
  console.log("✓ StoreSettings configured (Threshold: 10,000,000 paise / ₹1,00,000)");

  // 2. Upsert the three sandbox admin accounts (ids match FIXTURE_ADMIN_USERS so audit rows link).
  // Demo identities never reach a real production database.
  const seedDemoAdmins = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
  const admins = seedDemoAdmins ? [
    { id: "admin-owner-default", email: "owner@aurumatelier.internal", name: "Chudiwalas Owner", role: Role.OWNER },
    { id: "admin-manager-default", email: "manager@aurumatelier.internal", name: "Chudiwalas Manager", role: Role.MANAGER },
    { id: "admin-staff-default", email: "staff@aurumatelier.internal", name: "Chudiwalas Concierge", role: Role.STAFF },
  ] : [];
  for (const a of admins) {
    await prisma.adminUser.upsert({
      where: { email: a.email },
      update: { name: a.name, role: a.role, isActive: true },
      create: {
        id: a.id,
        email: a.email,
        // Real PBKDF2 hash of the shared sandbox password, so password
        // verification works through the normal hash path too.
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        name: a.name,
        role: a.role,
        isActive: true,
      },
    });
  }
  console.log(`✓ ${admins.length} sandbox admin users upserted`);

  // 3. Upsert Collections
  const collectionMap = new Map<string, string>();
  for (const col of FIXTURE_COLLECTIONS) {
    const record = await prisma.collection.upsert({
      where: { slug: col.slug },
      update: {
        title: col.title,
        description: col.description,
        bannerImageUrl: col.bannerImageUrl,
        displayOrder: col.displayOrder,
      },
      create: {
        slug: col.slug,
        title: col.title,
        description: col.description,
        bannerImageUrl: col.bannerImageUrl,
        displayOrder: col.displayOrder,
      },
    });
    collectionMap.set(col.slug, record.id);
  }
  console.log(`✓ ${FIXTURE_COLLECTIONS.length} Collections seeded`);

  // 4. Upsert Products, Variants, Media, and Collection Relations
  for (const item of FIXTURE_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        skuGroup: item.skuGroup,
        title: item.title,
        description: item.description,
        craftsmanshipNotes: item.craftsmanshipNotes,
        materialSummary: item.materialSummary,
        stoneDetails: item.stoneDetails,
        certificationData: item.certificationData,
        isEnquiryOnly: item.isEnquiryOnly,
        priceVisibility: item.priceVisibility as PriceVisibility,
        forceWhatsApp: item.forceWhatsApp,
        category: item.category ?? null,
        isNewArrival: item.isNewArrival ?? false,
        isBestSeller: item.isBestSeller ?? false,
        styleId: item.styleId ?? null,
        stylingTip: item.stylingTip ?? null,
        dimensions: item.dimensions ?? null,
        diamondWeightCts: item.diamondWeightCts ?? null,
        diamondQuality: item.diamondQuality ?? null,
        polkiWeightCts: item.polkiWeightCts ?? null,
        polkiCount: item.polkiCount ?? null,
        otherStones: item.otherStones ?? null,
        grossWeightGrams: item.grossWeightGrams ?? null,
      },
      create: {
        id: item.id,
        slug: item.slug,
        skuGroup: item.skuGroup,
        title: item.title,
        description: item.description,
        craftsmanshipNotes: item.craftsmanshipNotes,
        materialSummary: item.materialSummary,
        stoneDetails: item.stoneDetails,
        certificationData: item.certificationData,
        isEnquiryOnly: item.isEnquiryOnly,
        priceVisibility: item.priceVisibility as PriceVisibility,
        forceWhatsApp: item.forceWhatsApp,
        category: item.category ?? null,
        isNewArrival: item.isNewArrival ?? false,
        isBestSeller: item.isBestSeller ?? false,
        styleId: item.styleId ?? null,
        stylingTip: item.stylingTip ?? null,
        dimensions: item.dimensions ?? null,
        diamondWeightCts: item.diamondWeightCts ?? null,
        diamondQuality: item.diamondQuality ?? null,
        polkiWeightCts: item.polkiWeightCts ?? null,
        polkiCount: item.polkiCount ?? null,
        otherStones: item.otherStones ?? null,
        grossWeightGrams: item.grossWeightGrams ?? null,
      },
    });

    // Media and collection links are rebuilt; variants are upserted by SKU because
    // order items and reservations reference them and must never be orphaned.
    await prisma.productMedia.deleteMany({ where: { productId: product.id } });
    await prisma.productCollection.deleteMany({ where: { productId: product.id } });

    // Seed Media
    for (const media of item.media) {
      await prisma.productMedia.create({
        data: {
          id: media.id,
          productId: product.id,
          url: media.url,
          altText: media.altText,
          displayOrder: media.displayOrder,
          isPrimary: media.isPrimary,
          isHoverImage: media.isHoverImage,
          width: media.width,
          height: media.height,
        },
      });
    }

    // Seed Variants (upsert by SKU)
    for (const v of item.variants) {
      const variantData = {
        productId: product.id,
        metalType: v.metalType,
        size: v.size,
        purity: v.purity,
        metalColour: v.metalColour ?? null,
        pricePaise: v.pricePaise !== null ? BigInt(v.pricePaise) : null,
        compareAtPricePaise: v.compareAtPricePaise != null ? BigInt(v.compareAtPricePaise) : null,
        offerLabel: v.offerLabel ?? null,
        goldValuePaise: v.goldValuePaise != null ? BigInt(v.goldValuePaise) : null,
        stoneValuePaise: v.stoneValuePaise != null ? BigInt(v.stoneValuePaise) : null,
        makingChargesPaise: v.makingChargesPaise != null ? BigInt(v.makingChargesPaise) : null,
        makingDiscountPercent: v.makingDiscountPercent ?? null,
        goldWeightGrams: v.goldWeightGrams ?? null,
        currency: v.currency,
        stockQuantity: v.stockQuantity,
        leadTimeDays: v.leadTimeDays,
        isMadeToOrder: v.isMadeToOrder,
        isPurchaseEnabled: v.isPurchaseEnabled,
        isArchived: false,
      };
      await prisma.variant.upsert({
        where: { sku: v.sku },
        update: variantData,
        create: { id: v.id, sku: v.sku, ...variantData },
      });
    }

    // Seed Collection Associations
    for (const colSlug of item.collectionSlugs) {
      const collectionId = collectionMap.get(colSlug);
      if (collectionId) {
        await prisma.productCollection.create({
          data: {
            productId: product.id,
            collectionId,
          },
        });
      }
    }
  }

  console.log(`✓ ${FIXTURE_PRODUCTS.length} Deterministic Products and Variants seeded`);

  // 5. Upsert Offers (display-only, shown on product pages)
  for (const offer of FIXTURE_OFFERS) {
    await prisma.offer.upsert({
      where: { id: offer.id },
      update: {
        title: offer.title,
        description: offer.description ?? null,
        code: offer.code ?? null,
        isAuto: offer.isAuto,
        isActive: offer.isActive,
        displayOrder: offer.displayOrder,
      },
      create: {
        id: offer.id,
        title: offer.title,
        description: offer.description ?? null,
        code: offer.code ?? null,
        isAuto: offer.isAuto,
        isActive: offer.isActive,
        displayOrder: offer.displayOrder,
      },
    });
  }
  console.log(`✓ ${FIXTURE_OFFERS.length} Offers seeded`);

  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


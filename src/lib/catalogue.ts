import { db } from "./db";
import { Prisma } from "@prisma/client";
import {
  PublicProductDto,
  PublicCollectionDto,
  PublicOfferDto,
} from "./types";
import {
  toPublicProductDto,
  toPublicCollectionDto,
  toPublicOfferDto,
  RawProduct,
} from "./dto/product";
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from "./fixtures/products";
import { FIXTURE_OFFERS } from "./fixtures/offers";

export interface CatalogueFilters {
  collectionSlug?: string;
  metal?: string;
  minPricePaise?: bigint | number;
  maxPricePaise?: bigint | number;
  inStockOnly?: boolean;
  search?: string;
  sort?: "featured" | "price_asc" | "price_desc" | "newest";
}

/**
 * Fetches all active curated collections with piece counts.
 */
export async function getCollections(): Promise<PublicCollectionDto[]> {
  try {
    const collections = await db.collection.findMany({
      where: { isArchived: false },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    if (collections.length > 0) {
      return collections.map((c) => toPublicCollectionDto(c, c._count.products));
    }
  } catch (err) {
    // Graceful fallback to deterministic fixtures if DB is disconnected/initializing
    console.warn("Database unavailable; loading collections from fixtures.", err);
  }

  return FIXTURE_COLLECTIONS.map((c) => {
    const count = FIXTURE_PRODUCTS.filter((p) => p.collectionSlugs.includes(c.slug)).length;
    return toPublicCollectionDto(
      {
        id: c.slug,
        slug: c.slug,
        title: c.title,
        description: c.description,
        bannerImageUrl: c.bannerImageUrl,
      },
      count
    );
  });
}

/**
 * Fetches collection by slug with public DTO mapping.
 */
export async function getCollectionBySlug(slug: string): Promise<PublicCollectionDto | null> {
  try {
    const collection = await db.collection.findUnique({
      where: { slug, isArchived: false },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (collection) {
      return toPublicCollectionDto(collection, collection._count.products);
    }
  } catch (err) {
    console.warn(`Database unavailable; fetching collection ${slug} from fixtures.`, err);
  }

  const fixture = FIXTURE_COLLECTIONS.find((c) => c.slug === slug);
  if (!fixture) return null;

  const count = FIXTURE_PRODUCTS.filter((p) => p.collectionSlugs.includes(slug)).length;
  return toPublicCollectionDto(
    {
      id: fixture.slug,
      slug: fixture.slug,
      title: fixture.title,
      description: fixture.description,
      bannerImageUrl: fixture.bannerImageUrl,
    },
    count
  );
}

// Store settings feed the policy engine (high-value threshold, purchase switch).
// Cached briefly so catalogue listings do not query settings per product.
let settingsCache: { value: { highValueThresholdPaise: bigint; enablePurchases: boolean } | undefined; at: number } = { value: undefined, at: 0 };
async function getPublicStoreSettings(): Promise<{ highValueThresholdPaise: bigint; enablePurchases: boolean } | undefined> {
  if (Date.now() - settingsCache.at < 60_000) return settingsCache.value;
  try {
    const settings = await db.storeSettings.findUnique({ where: { id: "default" } });
    settingsCache = {
      value: settings
        ? { highValueThresholdPaise: settings.highValueThresholdPaise, enablePurchases: settings.enablePurchases }
        : undefined,
      at: Date.now(),
    };
  } catch {
    settingsCache = { value: undefined, at: Date.now() };
  }
  return settingsCache.value;
}

/**
 * Fetches single product by slug with all variants and media.
 */
export async function getProductBySlug(slug: string): Promise<PublicProductDto | null> {
  const storeSettings = await getPublicStoreSettings();
  try {
    const product = await db.product.findUnique({
      where: { slug, isArchived: false },
      include: {
        variants: {
          where: { isArchived: false },
          orderBy: { createdAt: "asc" },
        },
        media: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (product) {
      return toPublicProductDto(product as unknown as RawProduct, storeSettings);
    }
  } catch (err) {
    console.warn(`Database unavailable; fetching product ${slug} from fixtures.`, err);
  }

  const fixture = FIXTURE_PRODUCTS.find((p) => p.slug === slug);
  if (!fixture) return null;

  return toPublicProductDto(fixture, storeSettings);
}

/**
 * Queries catalogue products with multi-axis filtering, search, and sorting.
 */
export async function getCatalogueProducts(
  filters: CatalogueFilters = {}
): Promise<PublicProductDto[]> {
  let products: PublicProductDto[] = [];
  const storeSettings = await getPublicStoreSettings();

  try {
    const whereClause: Prisma.ProductWhereInput = {
      isArchived: false,
    };

    if (filters.collectionSlug) {
      whereClause.collections = {
        some: {
          collection: { slug: filters.collectionSlug },
        },
      };
    }

    if (filters.search) {
      const term = filters.search.trim();
      whereClause.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { materialSummary: { contains: term, mode: "insensitive" } },
        { stoneDetails: { contains: term, mode: "insensitive" } },
        { skuGroup: { contains: term, mode: "insensitive" } },
      ];
    }

    const dbProducts = await db.product.findMany({
      where: whereClause,
      include: {
        variants: {
          where: { isArchived: false },
          orderBy: { createdAt: "asc" },
        },
        media: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (dbProducts.length > 0) {
      products = dbProducts.map((p) => toPublicProductDto(p as unknown as RawProduct, storeSettings));
    }
  } catch (err) {
    console.warn("Database query failed; filtering from deterministic fixtures.", err);
  }

  // Fallback to in-memory fixtures if database yields empty or failed
  if (products.length === 0) {
    let raw = [...FIXTURE_PRODUCTS];

    if (filters.collectionSlug) {
      raw = raw.filter((p) => p.collectionSlugs.includes(filters.collectionSlug!));
    }

    if (filters.search) {
      const term = filters.search.toLowerCase().trim();
      raw = raw.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.materialSummary.toLowerCase().includes(term) ||
          p.skuGroup.toLowerCase().includes(term) ||
          (p.stoneDetails && p.stoneDetails.toLowerCase().includes(term))
      );
    }

    products = raw.map((p) => toPublicProductDto(p, storeSettings));
  }

  // In-memory filters for metal, price range, and stock
  if (filters.metal) {
    const metalLower = filters.metal.toLowerCase();
    products = products.filter((p) =>
      p.variants.some((v) => v.metalType.toLowerCase().includes(metalLower))
    );
  }

  if (filters.inStockOnly) {
    products = products.filter((p) =>
      p.variants.some((v) => v.stockQuantity > 0 || v.isMadeToOrder)
    );
  }

  if (filters.minPricePaise !== undefined) {
    const min = BigInt(filters.minPricePaise);
    products = products.filter((p) => {
      const priceStr = p.defaultVariant.pricePaise;
      if (!priceStr) return false;
      return BigInt(priceStr) >= min;
    });
  }

  if (filters.maxPricePaise !== undefined) {
    const max = BigInt(filters.maxPricePaise);
    products = products.filter((p) => {
      const priceStr = p.defaultVariant.pricePaise;
      if (!priceStr) return false;
      return BigInt(priceStr) <= max;
    });
  }

  // Sort products
  if (filters.sort === "price_asc") {
    products.sort((a, b) => {
      const pA = a.defaultVariant.pricePaise ? BigInt(a.defaultVariant.pricePaise) : null;
      const pB = b.defaultVariant.pricePaise ? BigInt(b.defaultVariant.pricePaise) : null;
      if (pA === null && pB === null) return 0;
      if (pA === null) return 1; // ON_REQUEST sorted last
      if (pB === null) return -1;
      return pA < pB ? -1 : pA > pB ? 1 : 0;
    });
  } else if (filters.sort === "price_desc") {
    products.sort((a, b) => {
      const pA = a.defaultVariant.pricePaise ? BigInt(a.defaultVariant.pricePaise) : null;
      const pB = b.defaultVariant.pricePaise ? BigInt(b.defaultVariant.pricePaise) : null;
      if (pA === null && pB === null) return 0;
      if (pA === null) return 1;
      if (pB === null) return -1;
      return pA > pB ? -1 : pA < pB ? 1 : 0;
    });
  }

  return products;
}


/**
 * Active storefront offers for product pages (display only, ordered).
 */
export async function getActiveOffers(): Promise<PublicOfferDto[]> {
  try {
    const now = new Date();
    const offers = await db.offer.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { displayOrder: "asc" },
      take: 8,
    });
    return offers.map(toPublicOfferDto);
  } catch (err) {
    console.warn("Database unavailable; loading offers from fixtures.", err);
    return FIXTURE_OFFERS.filter((o) => o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toPublicOfferDto);
  }
}

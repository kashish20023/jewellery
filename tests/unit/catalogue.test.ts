import { describe, it, expect } from "vitest";
import {
  getCatalogueProducts,
  getCollections,
  getCollectionBySlug,
  getProductBySlug,
} from "@/lib/catalogue";

describe("Catalogue Query & Multi-Axis Filtering Service (PRD-F02 / S02)", () => {
  it("fetches all curated collections with piece counts", async () => {
    const collections = await getCollections();
    expect(collections.length).toBe(4);
    for (const c of collections) {
      expect(c.slug).toBeDefined();
      expect(c.title).toBeDefined();
      expect(c.productCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("fetches single collection by slug", async () => {
    const col = await getCollectionBySlug("royal-polki-heritage");
    expect(col).toBeDefined();
    expect(col?.title).toBe("Royal Polki Heritage");
  });

  it("returns null for non-existent collection slug", async () => {
    const col = await getCollectionBySlug("non-existent-collection-404");
    expect(col).toBeNull();
  });

  it("fetches single product by slug with public DTO guarantees", async () => {
    const product = await getProductBySlug("heritage-polki-emerald-choker");
    expect(product).toBeDefined();
    expect(product?.slug).toBe("heritage-polki-emerald-choker");
    expect(product?.defaultVariant).toBeDefined();
    expect(product?.defaultVariant.policy).toBeDefined();
  });

  it("filters products by precious metal type", async () => {
    const platinumProducts = await getCatalogueProducts({ metal: "Platinum" });
    expect(platinumProducts.length).toBeGreaterThan(0);
    for (const p of platinumProducts) {
      const hasPlatinum = p.variants.some((v) =>
        v.metalType.toLowerCase().includes("platinum")
      );
      expect(hasPlatinum).toBe(true);
    }
  });

  it("filters products by in-stock availability", async () => {
    const inStock = await getCatalogueProducts({ inStockOnly: true });
    expect(inStock.length).toBeGreaterThan(0);
    for (const p of inStock) {
      const isAvailable = p.variants.some(
        (v) => v.stockQuantity > 0 || v.isMadeToOrder
      );
      expect(isAvailable).toBe(true);
    }
  });

  it("filters products by search keyword across title, description, and stones", async () => {
    const emeraldResults = await getCatalogueProducts({ search: "Emerald" });
    expect(emeraldResults.length).toBeGreaterThan(0);
    for (const p of emeraldResults) {
      const match =
        p.title.toLowerCase().includes("emerald") ||
        p.description.toLowerCase().includes("emerald") ||
        (p.stoneDetails && p.stoneDetails.toLowerCase().includes("emerald"));
      expect(match).toBe(true);
    }
  });

  it("sorts products by price ascending with ON_REQUEST items sorted last", async () => {
    const sortedAsc = await getCatalogueProducts({ sort: "price_asc" });
    expect(sortedAsc.length).toBeGreaterThan(1);

    // Verify ascending order
    for (let i = 0; i < sortedAsc.length - 1; i++) {
      const priceA = sortedAsc[i].defaultVariant.pricePaise;
      const priceB = sortedAsc[i + 1].defaultVariant.pricePaise;

      if (priceA && priceB) {
        expect(BigInt(priceA)).toBeLessThanOrEqual(BigInt(priceB));
      } else if (!priceA) {
        // null / ON_REQUEST must be sorted at the end
        expect(priceB).toBeFalsy();
      }
    }
  });

  it("sorts products by price descending", async () => {
    const sortedDesc = await getCatalogueProducts({ sort: "price_desc" });
    expect(sortedDesc.length).toBeGreaterThan(1);

    const firstPrice = sortedDesc[0].defaultVariant.pricePaise;
    expect(firstPrice).not.toBeNull();
    expect(BigInt(firstPrice!)).toBeGreaterThanOrEqual(10_000_000n);
  });
});

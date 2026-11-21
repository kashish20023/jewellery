import { describe, it, expect } from "vitest";
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";

describe("Deterministic Test Fixtures Verification", () => {
  it("contains all three boundary price fixtures (below, equal, above threshold)", () => {
    const prices = FIXTURE_PRODUCTS.flatMap((p) => p.variants.map((v) => v.pricePaise));

    expect(prices).toContain(9_999_900n);  // Below threshold
    expect(prices).toContain(10_000_000n); // Exact threshold
    expect(prices).toContain(10_000_100n); // Above threshold
  });

  it("contains at least one ON_REQUEST fixture with null price", () => {
    const onRequest = FIXTURE_PRODUCTS.find((p) => p.priceVisibility === "ON_REQUEST");
    expect(onRequest).toBeDefined();
    expect(onRequest?.variants.every((v) => v.pricePaise === null)).toBe(true);
  });

  it("contains at least one enquiryOnly fixture", () => {
    const enquiryOnly = FIXTURE_PRODUCTS.find((p) => p.isEnquiryOnly === true);
    expect(enquiryOnly).toBeDefined();
    expect(enquiryOnly?.variants[0].pricePaise).not.toBeNull();
  });

  it("ensures all product slugs and SKU groups are globally unique", () => {
    const slugs = FIXTURE_PRODUCTS.map((p) => p.slug);
    const skuGroups = FIXTURE_PRODUCTS.map((p) => p.skuGroup);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(skuGroups).size).toBe(skuGroups.length);
  });

  it("ensures all variant SKUs are globally unique", () => {
    const skus = FIXTURE_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku));
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("ensures all collections have unique slugs", () => {
    const slugs = FIXTURE_COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("verifies every product has valid media with alt text", () => {
    for (const product of FIXTURE_PRODUCTS) {
      expect(product.media.length).toBeGreaterThan(0);
      for (const m of product.media) {
        expect(m.url).toMatch(/^https?:\/\//);
        expect(m.altText.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it("verifies craftsmanship and certification claims are populated", () => {
    for (const product of FIXTURE_PRODUCTS) {
      expect(product.materialSummary.trim().length).toBeGreaterThan(3);
      expect(product.craftsmanshipNotes).toBeDefined();
    }
  });
});


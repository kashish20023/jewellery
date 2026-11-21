import { describe, it, expect } from "vitest";
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";
import { toPublicProductDto, toPublicCollectionDto } from "@/lib/dto/product";

describe("Storefront Route Data Resolution & Smoke Matrix Contracts", () => {
  describe("PDP Route Data Resolution (/products/[slug])", () => {
    it("resolves valid product slug and computes truthful metadata and DTO", () => {
      const slug = "heritage-polki-emerald-choker";
      const rawProduct = FIXTURE_PRODUCTS.find((p) => p.slug === slug);
      expect(rawProduct).toBeDefined();

      const publicDto = toPublicProductDto(rawProduct!);
      expect(publicDto.slug).toBe(slug);
      expect(publicDto.title).toContain("Heritage Polki");
      expect(publicDto.media.length).toBeGreaterThanOrEqual(1);
      expect(publicDto.defaultVariant.policy.canPurchase).toBe(true);
      expect(publicDto.defaultVariant.policy.isHighValue).toBe(true);
    });

    it("identifies unknown product slug for 404 notFound() response (S03)", () => {
      const unknownSlug = "non-existent-gold-ring-9999";
      const rawProduct = FIXTURE_PRODUCTS.find((p) => p.slug === unknownSlug);
      expect(rawProduct).toBeUndefined();
    });
  });

  describe("Collection Route Data Resolution (/collections/[slug])", () => {
    it("resolves valid collection slug and filters associated products", () => {
      const colSlug = "royal-polki-heritage";
      const collection = FIXTURE_COLLECTIONS.find((c) => c.slug === colSlug);
      expect(collection).toBeDefined();

      const products = FIXTURE_PRODUCTS.filter((p) => p.collectionSlugs.includes(colSlug));
      expect(products.length).toBeGreaterThan(0);
      for (const p of products) {
        expect(p.collectionSlugs).toContain(colSlug);
      }
    });

    it("identifies unknown collection slug for 404 notFound() response (S03)", () => {
      const unknownColSlug = "imaginary-ruby-collection-888";
      const collection = FIXTURE_COLLECTIONS.find((c) => c.slug === unknownColSlug);
      expect(collection).toBeUndefined();
    });
  });

  describe("Editorial Homepage Data Resolution (/)", () => {
    it("resolves all curated collections and all distinct products for homepage", () => {
      expect(FIXTURE_COLLECTIONS.length).toBe(4);
      // The seven contract fixtures (3 boundary, ON_REQUEST, enquiry-only, sold out, made-to-order)
      // plus any merchandising fixtures added later. Every one must resolve to a public DTO.
      expect(FIXTURE_PRODUCTS.length).toBeGreaterThanOrEqual(7);

      const publicProducts = FIXTURE_PRODUCTS.map((p) => toPublicProductDto(p));
      expect(publicProducts.length).toBe(FIXTURE_PRODUCTS.length);
      expect(new Set(publicProducts.map((p) => p.slug)).size).toBe(FIXTURE_PRODUCTS.length);

      // Verify that every product has a valid default variant and policy
      for (const p of publicProducts) {
        expect(p.defaultVariant).toBeDefined();
        expect(p.defaultVariant.policy).toBeDefined();
        expect(p.defaultVariant.policy.displayPrice).toBeDefined();
      }
    });
  });
});


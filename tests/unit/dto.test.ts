import { describe, it, expect } from "vitest";
import { toPublicProductDto, toPublicCollectionDto } from "@/lib/dto/product";
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";

describe("Public DTO Transformation & Sanitization", () => {
  it("strictly redacts pricePaise (sets to null) when product priceVisibility is ON_REQUEST", () => {
    const rawOnRequestProduct = FIXTURE_PRODUCTS.find((p) => p.slug === "royal-nizam-basra-pearl-diamond-necklace")!;
    expect(rawOnRequestProduct).toBeDefined();

    const publicDto = toPublicProductDto(rawOnRequestProduct);

    expect(publicDto.priceVisibility).toBe("ON_REQUEST");
    expect(publicDto.defaultVariant.pricePaise).toBeNull();
    expect(publicDto.defaultVariant.formattedPrice).toBe("Price upon request");
    for (const v of publicDto.variants) {
      expect(v.pricePaise).toBeNull();
      expect(v.formattedPrice).toBe("Price upon request");
    }
  });

  it("converts BigInt pricePaise to string to prevent JSON serialization crashes", () => {
    const rawPublicProduct = FIXTURE_PRODUCTS.find((p) => p.slug === "heritage-polki-emerald-choker")!;
    expect(rawPublicProduct).toBeDefined();

    const publicDto = toPublicProductDto(rawPublicProduct);

    // Must be a string, not a BigInt
    expect(typeof publicDto.defaultVariant.pricePaise).toBe("string");
    expect(publicDto.defaultVariant.pricePaise).toBe("10000000");

    // JSON.stringify must succeed without TypeError: Do not know how to serialize a BigInt
    expect(() => JSON.stringify(publicDto)).not.toThrow();
  });

  it("sorts media items by displayOrder ascending", () => {
    const rawProduct = FIXTURE_PRODUCTS[0];
    const publicDto = toPublicProductDto(rawProduct);

    for (let i = 0; i < publicDto.media.length - 1; i++) {
      expect(publicDto.media[i].displayOrder).toBeLessThanOrEqual(publicDto.media[i + 1].displayOrder);
    }
  });

  it("transforms collection raw entity to public collection DTO", () => {
    const col = FIXTURE_COLLECTIONS[0];
    const dto = toPublicCollectionDto(
      {
        id: "col-1",
        slug: col.slug,
        title: col.title,
        description: col.description,
        bannerImageUrl: col.bannerImageUrl,
        _count: { products: 5 },
      },
      5
    );

    expect(dto.slug).toBe(col.slug);
    expect(dto.title).toBe(col.title);
    expect(dto.productCount).toBe(5);
  });
});


import { describe, it, expect } from "vitest";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";
import { toPublicProductDto } from "@/lib/dto/product";
import {
  cardPrice,
  findVariant,
  initialVariant,
  pickVariant,
  optionCompatible,
  mediaForVariant,
  variantHref,
} from "@/lib/variants";
import { buildProductWhatsAppLink } from "@/lib/whatsapp";

const dto = (slug: string) => toPublicProductDto(FIXTURE_PRODUCTS.find((p) => p.slug === slug)!);

describe("Variant resolution helpers", () => {
  it("shows 'From ₹…' only when eligible public variants actually differ", () => {
    const pendant = cardPrice(dto("solitaire-diamond-pendant-18k")); // 14K ₹84,500 vs 18K ₹99,999
    expect(pendant.isFrom).toBe(true);
    expect(pendant.label).toBe("From ₹84,500");
    expect(pendant.variant.sku).toBe("AUR-SOL-002-14YG");

    const band = cardPrice(dto("constellation-diamond-signet-band")); // two sizes, same price
    expect(band.isFrom).toBe(false);
    expect(band.label).toBe("₹68,000");

    const onRequest = cardPrice(dto("royal-nizam-basra-pearl-diamond-necklace"));
    expect(onRequest.isFrom).toBe(false);
    expect(onRequest.label).toBe("Price upon request");
  });

  it("resolves a shareable variant reference and falls back safely for stale SKUs", () => {
    const p = dto("solitaire-diamond-pendant-18k");
    expect(findVariant(p, "aur-sol-002-14rg")?.sku).toBe("AUR-SOL-002-14RG");
    expect(findVariant(p, "AUR-SOL-002-ARCHIVED")).toBeNull();
    expect(initialVariant(p, "does-not-exist").id).toBe(p.defaultVariant.id);
    expect(variantHref(p, p.variants[1])).toBe("/products/solitaire-diamond-pendant-18k?variant=AUR-SOL-002-RG");
  });

  it("keeps the other options when one changes and reports forced changes", () => {
    const p = dto("solitaire-diamond-pendant-18k");
    const yg18 = p.variants.find((v) => v.sku === "AUR-SOL-002-YG")!;

    const rose = pickVariant(p, yg18, "metalColour", "Rose Gold");
    expect(rose.variant.sku).toBe("AUR-SOL-002-RG");
    expect(rose.changed).toEqual([]);

    const k14 = pickVariant(p, rose.variant, "purityLabel", "14K");
    expect(k14.variant.sku).toBe("AUR-SOL-002-14RG");
    expect(k14.changed).toEqual([]);

    // Round solitaire: White Gold exists only in size 12; from Rose Gold size 14 the size must change.
    const ring = dto("classic-solitaire-ring-round");
    const rose14 = ring.variants.find((v) => v.sku === "AUR-RNG-008-SZ14")!;
    expect(optionCompatible(ring, rose14, "metalColour", "White Gold")).toBe(false);
    const white = pickVariant(ring, rose14, "metalColour", "White Gold");
    expect(white.variant.sku).toBe("AUR-RNG-008-SZ12-WG");
    expect(white.changed).toEqual(["size"]);
  });

  it("uses product-level photos when a variant has none assigned", () => {
    const p = dto("solitaire-diamond-pendant-18k");
    expect(mediaForVariant(p, p.variants[0].id).length).toBe(p.media.length);
  });

  it("builds the WhatsApp message with colour, purity, SKU and URL, and omits hidden prices", () => {
    const p = dto("solitaire-diamond-pendant-18k");
    const v = p.variants.find((x) => x.sku === "AUR-SOL-002-14RG")!;
    const link = buildProductWhatsAppLink({
      productTitle: p.title,
      variantSku: v.sku,
      metalType: v.metalType,
      metalColour: v.metalColour,
      purity: v.purityLabel,
      size: v.size,
      formattedPrice: v.formattedPrice,
      productUrl: "https://chudiwalas.com/products/solitaire-diamond-pendant-18k?variant=AUR-SOL-002-14RG",
    });
    const text = decodeURIComponent(link.split("text=")[1]);
    expect(text).toContain("I'm interested in Solitaire Brilliant Diamond Pendant in 18K Yellow Gold, Rose Gold, 14K, size 16-18 Inch Adjustable, SKU AUR-SOL-002-14RG.");
    expect(text).toContain("₹84,500");
    expect(text).toContain("?variant=AUR-SOL-002-14RG");

    const hidden = dto("royal-nizam-basra-pearl-diamond-necklace");
    const hv = hidden.defaultVariant;
    const hiddenLink = buildProductWhatsAppLink({
      productTitle: hidden.title,
      variantSku: hv.sku,
      metalType: hv.metalType,
      formattedPrice: hv.formattedPrice,
    });
    expect(decodeURIComponent(hiddenLink)).not.toMatch(/Price:/);
  });
});

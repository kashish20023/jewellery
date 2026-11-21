import { describe, it, expect } from "vitest";
import {
  constructMetadata,
  constructOrganizationJsonLd,
  constructProductJsonLd,
  constructBreadcrumbJsonLd,
  constructCollectionJsonLd,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { FIXTURE_PRODUCTS, FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";
import { toPublicProductDto, toPublicCollectionDto } from "@/lib/dto/product";

describe("SEO, Metadata & Schema.org / JSON-LD Engine (PRD-F16 / S27)", () => {
  describe("constructMetadata()", () => {
    it("generates default metadata with canonical URL and OpenGraph tags", () => {
      const meta = constructMetadata();
      expect(meta.title).toBe(`${SITE_NAME} — Fine Jewellery, Jaipur`);
      expect(meta.description).toContain("crafted in Jaipur");
      expect(meta.alternates?.canonical).toBe(`${SITE_URL}/`);
      expect(meta.openGraph?.siteName).toBe(SITE_NAME);
      expect(meta.openGraph?.locale).toBe("en_IN");
      expect((meta.twitter as Record<string, unknown>)?.card).toBe("summary_large_image");
      expect(meta.robots).toEqual(
        expect.objectContaining({
          index: true,
          follow: true,
        })
      );
    });

    it("generates custom page metadata with prefixed title and path", () => {
      const meta = constructMetadata({
        title: "Royal Polki Heritage",
        description: "Bespoke bridal polki jewellery suites.",
        path: "/collections/royal-polki-heritage",
      });
      expect(meta.title).toBe(`Royal Polki Heritage | ${SITE_NAME}`);
      expect(meta.description).toBe("Bespoke bridal polki jewellery suites.");
      expect(meta.alternates?.canonical).toBe(
        `${SITE_URL}/collections/royal-polki-heritage`
      );
      expect(meta.openGraph?.url).toBe(
        `${SITE_URL}/collections/royal-polki-heritage`
      );
    });

    it("applies noindex, nofollow directives for private/admin/checkout routes", () => {
      const meta = constructMetadata({
        title: "Secure Checkout",
        noIndex: true,
        path: "/checkout",
      });
      expect(meta.robots).toEqual(
        expect.objectContaining({
          index: false,
          follow: false,
        })
      );
    });
  });

  describe("constructOrganizationJsonLd()", () => {
    it("generates valid Schema.org JewelryStore / Organization metadata", () => {
      const org = constructOrganizationJsonLd();
      expect(org["@context"]).toBe("https://schema.org");
      expect(org["@type"]).toBe("JewelryStore");
      expect(org.name).toBe(SITE_NAME);
      expect(org.url).toBe(SITE_URL);
      expect(org.currenciesAccepted).toBe("INR");
      expect(org.priceRange).toBe("₹₹₹₹");
      expect(org.address).toEqual(
        expect.objectContaining({
          "@type": "PostalAddress",
          addressLocality: "Jaipur",
          addressRegion: "Rajasthan",
          addressCountry: "IN",
        })
      );
      expect(org.telephone).toBe("+91-9876543210");
      expect(org.contactPoint.areaServed).toBe("IN");
    });
  });

  describe("constructProductJsonLd() (S08 / S27 Zero Price Leak Contract)", () => {
    it("generates compliant Schema.org Product for public priced piece", () => {
      const rawProduct = FIXTURE_PRODUCTS.find(
        (p) => p.priceVisibility === "PUBLIC" && p.variants[0]?.pricePaise !== null
      )!;
      const publicDto = toPublicProductDto(rawProduct);
      const canonicalUrl = `${SITE_URL}/products/${publicDto.slug}`;

      const schema = constructProductJsonLd(publicDto, canonicalUrl);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Product");
      expect(schema.name).toBe(publicDto.title);
      expect(schema.sku).toBe(publicDto.defaultVariant.sku);
      expect(schema.offers).toBeDefined();

      const offer = schema.offers as Record<string, unknown>;
      expect(offer["@type"]).toBe("Offer");
      expect(offer.priceCurrency).toBe("INR");
      expect(typeof offer.price).toBe("string");
      expect(Number(offer.price)).toBeGreaterThan(0);
      expect(offer.availability).toBe("https://schema.org/InStock");
    });

    it("S08/S27 Invariant: Strictly redacts price and prevents leaks for ON_REQUEST pieces", () => {
      const rawProduct = FIXTURE_PRODUCTS.find(
        (p) => p.priceVisibility === "ON_REQUEST" || p.slug === "nizam-heritage-basra-pearl-choker"
      )!;
      const publicDto = toPublicProductDto(rawProduct);
      const canonicalUrl = `${SITE_URL}/products/${publicDto.slug}`;

      const schema = constructProductJsonLd(publicDto, canonicalUrl);
      const offer = schema.offers as Record<string, unknown>;

      // CRITICAL CONTRACT: Must never output 0, negative, or numeric internal price
      expect(offer.price).toBe("Upon Request");
      expect(offer.price).not.toBe(0);
      expect(offer.price).not.toBe("0");
      expect(offer.price).not.toBe("0.00");
      expect(offer.availability).toBe("https://schema.org/PreOrder");
    });

    it("S08/S27 Invariant: Strictly sets Upon Request for enquiryOnly pieces", () => {
      const rawProduct = FIXTURE_PRODUCTS.find((p) => p.isEnquiryOnly)!;
      const publicDto = toPublicProductDto(rawProduct);
      const canonicalUrl = `${SITE_URL}/products/${publicDto.slug}`;

      const schema = constructProductJsonLd(publicDto, canonicalUrl);
      const offer = schema.offers as Record<string, unknown>;

      expect(offer.price).toBe("Upon Request");
      expect(offer.availability).toBe("https://schema.org/PreOrder");
    });

    it("S08/S27 Invariant: Handles synthetic product with null pricePaise without crashing or leaking", () => {
      const rawProduct = FIXTURE_PRODUCTS.find((p) => p.priceVisibility === "ON_REQUEST")!;
      const syntheticDto = toPublicProductDto({
        ...rawProduct,
        id: "prod-synth",
        slug: "bespoke-choker",
        variants: [
          {
            ...rawProduct.variants[0],
            id: "var-1",
            pricePaise: null,
          },
        ],
      });

      const schema = constructProductJsonLd(syntheticDto, `${SITE_URL}/products/bespoke-choker`);
      const offer = schema.offers as Record<string, unknown>;
      expect(offer.price).toBe("Upon Request");
      expect(offer.availability).toBe("https://schema.org/PreOrder");
    });
  });

  describe("constructBreadcrumbJsonLd()", () => {
    it("generates correct BreadcrumbList with 1-based indexing", () => {
      const breadcrumb = constructBreadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Collections", path: "/collections" },
        { name: "Solitaire Ring", path: "/products/solitaire-ring" },
      ]);

      expect(breadcrumb["@context"]).toBe("https://schema.org");
      expect(breadcrumb["@type"]).toBe("BreadcrumbList");
      expect(breadcrumb.itemListElement).toHaveLength(3);
      expect(breadcrumb.itemListElement[0]).toEqual({
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      });
      expect(breadcrumb.itemListElement[2]).toEqual({
        "@type": "ListItem",
        position: 3,
        name: "Solitaire Ring",
        item: `${SITE_URL}/products/solitaire-ring`,
      });
    });
  });

  describe("constructCollectionJsonLd()", () => {
    it("generates valid CollectionPage schema with nested ItemList", () => {
      const rawCollection = FIXTURE_COLLECTIONS[0];
      const publicCol = toPublicCollectionDto(
        {
          ...rawCollection,
          id: rawCollection.slug,
        },
        2
      );
      const publicProds = FIXTURE_PRODUCTS.slice(0, 2).map((p) => toPublicProductDto(p));

      const schema = constructCollectionJsonLd(
        publicCol,
        publicProds,
        `${SITE_URL}/collections/${publicCol.slug}`
      );

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.name).toContain(publicCol.title);
      expect(schema.mainEntity["@type"]).toBe("ItemList");
      expect(schema.mainEntity.numberOfItems).toBe(2);
      expect(schema.mainEntity.itemListElement).toHaveLength(2);
      expect(schema.mainEntity.itemListElement[0].url).toContain("/products/");
    });
  });

  describe("Sitemap & Robots Route Generation (S28)", () => {
    it("sitemap() returns static, collection, and product URLs", async () => {
      const items = await sitemap();
      expect(items.length).toBeGreaterThan(5);

      const urls = items.map((i) => i.url);
      expect(urls).toContain(SITE_URL);
      expect(urls).toContain(`${SITE_URL}/collections`);
      expect(urls).toContain(`${SITE_URL}/consultation`);

      // Verify product URLs exist
      const hasProduct = urls.some((u) => u.includes("/products/"));
      expect(hasProduct).toBe(true);

      // Verify collection URLs exist
      const hasCollection = urls.some((u) => u.includes("/collections/"));
      expect(hasCollection).toBe(true);
    });

    it("robots() disallows private and sensitive paths", () => {
      const config = robots();
      expect(config.sitemap).toBe(`${SITE_URL}/sitemap.xml`);

      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      expect(rules.allow).toBe("/");
      expect(rules.disallow).toEqual(
        expect.arrayContaining(["/admin", "/admin/*", "/api/*", "/checkout", "/order/*"])
      );
    });
  });
});

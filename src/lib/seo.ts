import type { Metadata } from "next";
import type { PublicProductDto, PublicCollectionDto } from "@/lib/types";

export const SITE_NAME = "Chudiwalas";
export const SITE_TAGLINE = "Fine Jewellery, Jaipur";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chudiwalas.com";
export const DEFAULT_DESCRIPTION =
  "Chudiwalas Fine Jewellery: polki, jadau and certified solitaires crafted in Jaipur and sold direct to you with no middlemen. BIS hallmarked gold, certified natural stones, insured delivery across India.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image.png`;

export interface ConstructMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string[];
}

/**
 * Server-side metadata builder conforming to Next.js 15 App Router standards.
 * Enforces canonical URLs, OpenGraph, Twitter cards, and robots directives.
 */
export function constructMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  keywords = [
    "Indian Jewellery",
    "Polki Choker",
    "Solitaire Diamonds",
    "18K Gold",
    "22K Gold",
    "BIS Hallmarked Jewellery",
    "High Jewellery",
  ],
}: ConstructMetadataOptions = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`;
  const canonicalUrl = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    title: fullTitle,
    description,
    keywords,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

/**
 * Generates Schema.org JewelryStore / Organization structured data
 */
export function constructOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: SITE_NAME,
    alternateName: "Chudiwalas Fine Jewellery",
    url: SITE_URL,
    logo: "https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255325/chudiwalas/site/brand/lockup-black.png",
    image: DEFAULT_OG_IMAGE,
    description: DEFAULT_DESCRIPTION,
    priceRange: "₹₹₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Credit Card, Debit Card, Net Banking, UPI",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jaipur Emporium International (address to be confirmed)",
      addressLocality: "Jaipur",
      addressRegion: "Rajasthan",
      postalCode: "302001",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "19.0657",
      longitude: "72.8687",
    },
    telephone: "+91-9876543210",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-9876543210",
      contactType: "concierge",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "10:30",
        closes: "19:30",
      },
    ],
  };
}

/**
 * Generates Schema.org Product & Offer structured data
 * Enforces strict ZERO PRICE LEAK invariants (S08, S27) for ON_REQUEST or enquiry-only items.
 */
export function constructProductJsonLd(
  product: PublicProductDto,
  canonicalUrl: string
) {
  const primaryMedia = product.media[0];
  const images = product.media.map((m: { url: string }) => m.url);
  const variant = product.defaultVariant;

  const isOnRequest =
    product.priceVisibility === "ON_REQUEST" ||
    variant.pricePaise === null ||
    product.isEnquiryOnly;

  // Build compliant Offer object
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: canonicalUrl,
    priceCurrency: "INR",
    itemCondition: "https://schema.org/NewCondition",
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
  };

  if (isOnRequest) {
    // S08 / S27 ZERO PRICE LEAK INVARIANT:
    // Never leak internal costs or print 0.00
    offer.price = "Upon Request";
    offer.availability = "https://schema.org/PreOrder";
  } else {
    offer.price = (Number(variant.pricePaise) / 100).toFixed(2);
    offer.availability =
      variant.stockQuantity > 0 || variant.isMadeToOrder
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: images.length > 0 ? images : (primaryMedia ? [primaryMedia.url] : [DEFAULT_OG_IMAGE]),
    description: product.description,
    sku: variant.sku,
    mpn: product.skuGroup,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    material: product.materialSummary,
    ...(product.stoneDetails ? { gemstoneDetails: product.stoneDetails } : {}),
    ...(product.certificationData ? { award: product.certificationData } : {}),
    category: "Jewellery",
    offers: offer,
  };
}

/**
 * Generates Schema.org BreadcrumbList structured data
 */
export function constructBreadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path.startsWith("/") ? crumb.path : `/${crumb.path}`}`,
    })),
  };
}

/**
 * Generates Schema.org CollectionPage / ItemList structured data
 */
export function constructCollectionJsonLd(
  collection: PublicCollectionDto,
  products: PublicProductDto[],
  canonicalUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${collection.title} | ${SITE_NAME}`,
    description: collection.description || DEFAULT_DESCRIPTION,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      name: collection.title,
      numberOfItems: products.length,
      itemListElement: products.map((prod, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/products/${prod.slug}`,
        name: prod.title,
      })),
    },
  };
}

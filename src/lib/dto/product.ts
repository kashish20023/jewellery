import {
  PublicProductDto,
  PublicVariantDto,
  PublicMediaDto,
  PublicCollectionDto,
  PublicOfferDto,
  PriceBreakupDto,
  PriceVisibility,
} from "../types";
import { evaluateProductPolicy } from "../policy/evaluateProductPolicy";
import { formatPaiseToInr } from "../money";

export interface RawVariant {
  id: string;
  sku: string;
  metalType: string;
  size?: string | null;
  purity?: string | null;
  metalColour?: string | null;
  pricePaise: bigint | number | null;
  compareAtPricePaise?: bigint | number | null;
  offerLabel?: string | null;
  goldValuePaise?: bigint | number | null;
  stoneValuePaise?: bigint | number | null;
  makingChargesPaise?: bigint | number | null;
  makingDiscountPercent?: number | null;
  goldWeightGrams?: number | null;
  currency: string;
  stockQuantity: number;
  isMadeToOrder: boolean;
  leadTimeDays: number;
  isPurchaseEnabled: boolean;
}

export interface RawMedia {
  id: string;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  isHoverImage: boolean;
  variantId?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface RawProduct {
  id: string;
  slug: string;
  skuGroup: string;
  title: string;
  description: string;
  craftsmanshipNotes?: string | null;
  materialSummary: string;
  stoneDetails?: string | null;
  certificationData?: string | null;
  isEnquiryOnly: boolean;
  priceVisibility: PriceVisibility;
  forceWhatsApp: boolean;
  category?: string | null;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  styleId?: string | null;
  stylingTip?: string | null;
  dimensions?: string | null;
  diamondWeightCts?: number | null;
  diamondQuality?: string | null;
  polkiWeightCts?: number | null;
  polkiCount?: number | null;
  otherStones?: string | null;
  grossWeightGrams?: number | null;
  media: RawMedia[];
  variants: RawVariant[];
}

export interface RawCollection {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  _count?: {
    products: number;
  };
}

export interface RawOffer {
  id: string;
  title: string;
  description?: string | null;
  code?: string | null;
  isAuto: boolean;
}

/* ------------------------------------------------------------------ */
/* Option helpers                                                       */
/* ------------------------------------------------------------------ */

const COLOUR_ORDER = ["Yellow Gold", "Rose Gold", "White Gold", "Platinum"];

/** Derives a colour label from free-text metalType when metalColour is not set. */
export function deriveMetalColour(metalType: string, metalColour?: string | null): string {
  if (metalColour && metalColour.trim()) return metalColour.trim();
  const m = metalType.toLowerCase();
  if (m.includes("platinum")) return "Platinum";
  if (m.includes("rose")) return "Rose Gold";
  if (m.includes("white")) return "White Gold";
  return "Yellow Gold";
}

/** Normalises "750 / 18K", "18K Yellow Gold", "Pt 950" into "18K" / "Platinum". */
export function derivePurityLabel(purity?: string | null, metalType?: string): string {
  const source = `${purity || ""} ${metalType || ""}`;
  const karat = source.match(/(\d{1,2})\s*K/i);
  if (karat) return `${karat[1]}K`;
  if (/platinum|pt\s*950/i.test(source)) return "Platinum";
  if (/916/.test(source)) return "22K";
  if (/750/.test(source)) return "18K";
  if (/585/.test(source)) return "14K";
  if (/375/.test(source)) return "9K";
  return purity?.trim() || "Gold";
}

const toBig = (v: bigint | number | null | undefined): bigint | null =>
  v === null || v === undefined ? null : typeof v === "bigint" ? v : BigInt(v);

function buildPriceBreakup(variant: RawVariant): PriceBreakupDto | null {
  const gold = toBig(variant.goldValuePaise);
  const stone = toBig(variant.stoneValuePaise);
  const making = toBig(variant.makingChargesPaise);
  if (gold === null && stone === null && making === null) return null;

  const discount = variant.makingDiscountPercent ?? null;
  const makingAfter =
    making !== null && discount !== null && discount > 0
      ? (making * BigInt(100 - discount)) / 100n
      : making;

  return {
    goldValuePaise: gold !== null ? gold.toString() : null,
    stoneValuePaise: stone !== null ? stone.toString() : null,
    makingChargesPaise: making !== null ? making.toString() : null,
    makingDiscountPercent: discount,
    makingChargesAfterDiscountPaise: makingAfter !== null ? makingAfter.toString() : null,
    formatted: {
      goldValue: gold !== null ? formatPaiseToInr(gold) : null,
      stoneValue: stone !== null ? formatPaiseToInr(stone) : null,
      makingCharges: making !== null ? formatPaiseToInr(making) : null,
      makingChargesAfterDiscount: makingAfter !== null ? formatPaiseToInr(makingAfter) : null,
    },
  };
}

/**
 * Transforms a raw variant into a sanitized public DTO.
 * Explicitly redacts pricePaise, compare-at price and the breakup if price is ON_REQUEST.
 */
export function toPublicVariantDto(
  variant: RawVariant,
  productContext: {
    isEnquiryOnly: boolean;
    priceVisibility: PriceVisibility;
    forceWhatsApp: boolean;
  },
  storeSettings?: {
    highValueThresholdPaise?: bigint | number;
    enablePurchases?: boolean;
  }
): PublicVariantDto {
  const policy = evaluateProductPolicy({
    product: productContext,
    variant,
    storeSettings,
  });

  const isPriceRedacted =
    policy.priceVisibility === "ON_REQUEST" ||
    variant.pricePaise === null ||
    variant.pricePaise === undefined;

  const price = toBig(variant.pricePaise);
  const compareAt = toBig(variant.compareAtPricePaise);
  // Only show a struck-through price when it is genuinely higher than the selling price.
  const showCompareAt = !isPriceRedacted && compareAt !== null && price !== null && compareAt > price;

  return {
    id: variant.id,
    sku: variant.sku,
    metalType: variant.metalType,
    size: variant.size,
    purity: variant.purity,
    purityLabel: derivePurityLabel(variant.purity, variant.metalType),
    metalColour: deriveMetalColour(variant.metalType, variant.metalColour),
    // INVARIANT: Redact pricePaise when price is ON_REQUEST
    pricePaise: isPriceRedacted ? null : price!.toString(),
    formattedPrice: policy.displayPrice,
    compareAtPricePaise: showCompareAt ? compareAt!.toString() : null,
    formattedCompareAtPrice: showCompareAt ? formatPaiseToInr(compareAt!) : null,
    offerLabel: isPriceRedacted ? null : variant.offerLabel || null,
    priceBreakup: isPriceRedacted ? null : buildPriceBreakup(variant),
    goldWeightGrams: variant.goldWeightGrams ?? null,
    currency: variant.currency || "INR",
    stockQuantity: variant.stockQuantity,
    isMadeToOrder: variant.isMadeToOrder,
    isReadyToShip: variant.stockQuantity > 0 && !variant.isMadeToOrder,
    leadTimeDays: variant.leadTimeDays,
    isPurchaseEnabled: variant.isPurchaseEnabled,
    policy,
  };
}

/**
 * Transforms a raw media item into a clean public DTO.
 */
export function toPublicMediaDto(media: RawMedia): PublicMediaDto {
  return {
    id: media.id,
    url: media.url,
    altText: media.altText,
    displayOrder: media.displayOrder,
    isPrimary: media.isPrimary,
    isHoverImage: media.isHoverImage,
    variantId: media.variantId ?? null,
    width: media.width,
    height: media.height,
  };
}

function uniqueInOrder(values: string[], order?: string[]): string[] {
  const unique = [...new Set(values.filter(Boolean))];
  if (!order) return unique;
  return unique.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

const karatValue = (label: string) => {
  const m = label.match(/(\d{1,2})K/);
  return m ? Number(m[1]) : label === "Platinum" ? 100 : 0;
};

/**
 * Transforms a raw product into a safe public DTO.
 */
export function toPublicProductDto(
  product: RawProduct,
  storeSettings?: {
    highValueThresholdPaise?: bigint | number;
    enablePurchases?: boolean;
  }
): PublicProductDto {
  const sortedMedia = [...product.media].sort((a, b) => a.displayOrder - b.displayOrder);
  const mediaDtos = sortedMedia.map(toPublicMediaDto);

  const productContext = {
    isEnquiryOnly: product.isEnquiryOnly,
    priceVisibility: product.priceVisibility,
    forceWhatsApp: product.forceWhatsApp,
  };

  const variantDtos = product.variants.map((v) =>
    toPublicVariantDto(v, productContext, storeSettings)
  );

  const defaultVariant: PublicVariantDto = variantDtos[0] || {
    id: "default",
    sku: product.skuGroup,
    metalType: "18K Gold",
    size: null,
    purity: "18K",
    purityLabel: "18K",
    metalColour: "Yellow Gold",
    pricePaise: null,
    formattedPrice: "Price upon request",
    compareAtPricePaise: null,
    formattedCompareAtPrice: null,
    offerLabel: null,
    priceBreakup: null,
    goldWeightGrams: null,
    currency: "INR",
    stockQuantity: 0,
    isMadeToOrder: false,
    isReadyToShip: false,
    leadTimeDays: 0,
    isPurchaseEnabled: false,
    policy: evaluateProductPolicy({
      product: productContext,
      variant: {
        pricePaise: null,
        stockQuantity: 0,
        isMadeToOrder: false,
        isPurchaseEnabled: false,
      },
      storeSettings,
    }),
  };

  return {
    id: product.id,
    slug: product.slug,
    skuGroup: product.skuGroup,
    title: product.title,
    description: product.description,
    craftsmanshipNotes: product.craftsmanshipNotes,
    materialSummary: product.materialSummary,
    stoneDetails: product.stoneDetails,
    certificationData: product.certificationData,
    isEnquiryOnly: product.isEnquiryOnly,
    priceVisibility: product.priceVisibility,
    forceWhatsApp: product.forceWhatsApp,
    category: product.category ?? null,
    isNewArrival: Boolean(product.isNewArrival),
    isBestSeller: Boolean(product.isBestSeller),
    styleId: product.styleId ?? null,
    stylingTip: product.stylingTip ?? null,
    dimensions: product.dimensions ?? null,
    diamondWeightCts: product.diamondWeightCts ?? null,
    diamondQuality: product.diamondQuality ?? null,
    polkiWeightCts: product.polkiWeightCts ?? null,
    polkiCount: product.polkiCount ?? null,
    otherStones: product.otherStones ?? null,
    grossWeightGrams: product.grossWeightGrams ?? null,
    media: mediaDtos,
    variants: variantDtos,
    defaultVariant,
    options: {
      colours: uniqueInOrder(variantDtos.map((v) => v.metalColour), COLOUR_ORDER),
      purities: uniqueInOrder(variantDtos.map((v) => v.purityLabel)).sort(
        (a, b) => karatValue(a) - karatValue(b)
      ),
      sizes: uniqueInOrder(variantDtos.map((v) => v.size || "")),
    },
  };
}

/**
 * Transforms collection to public DTO.
 */
export function toPublicCollectionDto(
  collection: RawCollection,
  productCount = 0
): PublicCollectionDto {
  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    bannerImageUrl: collection.bannerImageUrl,
    productCount: collection._count?.products ?? productCount,
  };
}

export function toPublicOfferDto(offer: RawOffer): PublicOfferDto {
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description ?? null,
    code: offer.code ?? null,
    isAuto: offer.isAuto,
  };
}

export type PriceVisibility = "PUBLIC" | "ON_REQUEST";

export type Role = "OWNER" | "MANAGER" | "STAFF";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "RECONCILIATION_REQUIRED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED_RECORDED";

export type FulfilmentStatus =
  | "UNFULFILLED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ReservationStatus =
  | "ACTIVE"
  | "COMMITTED"
  | "RELEASED"
  | "EXPIRED";

export type EnquiryType = "CALLBACK" | "WHATSAPP_INTENT" | "APPOINTMENT";

export type EnquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "SCHEDULED"
  | "CLOSED_CONVERTED"
  | "CLOSED_LOST";

export type CtaType =
  | "BUY_NOW"
  | "BUY_AND_WHATSAPP"
  | "WHATSAPP_ONLY"
  | "OUT_OF_STOCK";

export interface ProductPolicyResult {
  canPurchase: boolean;
  priceVisibility: PriceVisibility;
  displayPrice: string;
  isHighValue: boolean;
  showWhatsApp: boolean;
  ctaType: CtaType;
  requiresEnquiry: boolean;
  isOutOfStock: boolean;
  isMadeToOrder: boolean;
  leadTimeDays: number;
  reason: string;
}

export interface PublicMediaDto {
  id: string;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  isHoverImage: boolean;
  /** When set, this photo belongs to one variant (e.g. the rose-gold shot). */
  variantId?: string | null;
  width?: number | null;
  height?: number | null;
}

/**
 * Indicative price breakup shown on the product sheet (all values in paise,
 * serialised as strings). Only present when the price itself is PUBLIC.
 */
export interface PriceBreakupDto {
  goldValuePaise: string | null;
  stoneValuePaise: string | null;
  makingChargesPaise: string | null;
  makingDiscountPercent: number | null;
  /** Making charges after the discount, if any. */
  makingChargesAfterDiscountPaise: string | null;
  formatted: {
    goldValue: string | null;
    stoneValue: string | null;
    makingCharges: string | null;
    makingChargesAfterDiscount: string | null;
  };
}

export interface PublicVariantDto {
  id: string;
  sku: string;
  metalType: string;
  size?: string | null;
  purity?: string | null;
  /** Normalised purity label used by selectors, e.g. "18K", "22K", "Platinum". */
  purityLabel: string;
  /** "Yellow Gold" | "Rose Gold" | "White Gold" | "Platinum" (derived from metalType when unset). */
  metalColour: string;
  /**
   * Only present when priceVisibility === 'PUBLIC'.
   * Never exposed when price is ON_REQUEST or null.
   */
  pricePaise?: string | null;
  formattedPrice: string;
  /** Regular price when an offer applies; redacted with the price. */
  compareAtPricePaise?: string | null;
  formattedCompareAtPrice?: string | null;
  offerLabel?: string | null;
  priceBreakup?: PriceBreakupDto | null;
  goldWeightGrams?: number | null;
  currency: string;
  stockQuantity: number;
  isMadeToOrder: boolean;
  /** In stock and not made to order: ships from the atelier within 48 hours. */
  isReadyToShip: boolean;
  leadTimeDays: number;
  isPurchaseEnabled: boolean;
  policy: ProductPolicyResult;
}

export interface PublicProductDto {
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
  isNewArrival: boolean;
  isBestSeller: boolean;
  styleId?: string | null;
  stylingTip?: string | null;
  dimensions?: string | null;
  diamondWeightCts?: number | null;
  diamondQuality?: string | null;
  polkiWeightCts?: number | null;
  polkiCount?: number | null;
  otherStones?: string | null;
  grossWeightGrams?: number | null;
  media: PublicMediaDto[];
  variants: PublicVariantDto[];
  defaultVariant: PublicVariantDto;
  /** Distinct option values across variants, in display order. */
  options: {
    colours: string[];
    purities: string[];
    sizes: string[];
  };
}

export interface PublicOfferDto {
  id: string;
  title: string;
  description?: string | null;
  code?: string | null;
  isAuto: boolean;
}

export interface PublicCollectionDto {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  productCount: number;
}


import { ProductPolicyResult, PriceVisibility, CtaType } from "../types";
import { formatPaiseToInr, isHighValueItem, DEFAULT_HIGH_VALUE_THRESHOLD_PAISE } from "../money";

export interface PolicyEvaluationInput {
  product: {
    isEnquiryOnly: boolean;
    priceVisibility: PriceVisibility;
    forceWhatsApp: boolean;
  };
  variant: {
    pricePaise: bigint | number | null | undefined;
    stockQuantity: number;
    isMadeToOrder: boolean;
    leadTimeDays?: number;
    isPurchaseEnabled: boolean;
  };
  storeSettings?: {
    highValueThresholdPaise?: bigint | number;
    enablePurchases?: boolean;
  };
}

/**
 * Server-authoritative product policy evaluator.
 * Single source of truth for both storefront CTA logic and backend order admission.
 */
export function evaluateProductPolicy(input: PolicyEvaluationInput): ProductPolicyResult {
  const { product, variant, storeSettings } = input;
  const leadTimeDays = variant.leadTimeDays ?? (variant.isMadeToOrder ? 21 : 0);
  const isGlobalPurchasingDisabled = storeSettings?.enablePurchases === false;
  const thresholdPaise = storeSettings?.highValueThresholdPaise ?? DEFAULT_HIGH_VALUE_THRESHOLD_PAISE;

  // Case 1: Missing price, zero price, or explicitly ON_REQUEST
  const hasValidPrice =
    variant.pricePaise !== null &&
    variant.pricePaise !== undefined &&
    (typeof variant.pricePaise === "bigint" ? variant.pricePaise > 0n : variant.pricePaise > 0);

  const isPriceOnRequest =
    product.priceVisibility === "ON_REQUEST" || !hasValidPrice;

  if (isPriceOnRequest) {
    return {
      canPurchase: false,
      priceVisibility: "ON_REQUEST",
      displayPrice: "Price upon request",
      isHighValue: false,
      showWhatsApp: true,
      ctaType: "WHATSAPP_ONLY",
      requiresEnquiry: true,
      isOutOfStock: false,
      isMadeToOrder: variant.isMadeToOrder,
      leadTimeDays,
      reason: "Price is available upon request. Direct online checkout is disabled.",
    };
  }

  const normalizedPricePaise =
    typeof variant.pricePaise === "bigint" ? variant.pricePaise : BigInt(variant.pricePaise!);
  const displayPrice = formatPaiseToInr(normalizedPricePaise);
  const isHighValue = isHighValueItem(normalizedPricePaise, thresholdPaise);

  // Case 2: Store-wide purchase disabled
  if (isGlobalPurchasingDisabled) {
    return {
      canPurchase: false,
      priceVisibility: "PUBLIC",
      displayPrice,
      isHighValue,
      showWhatsApp: true,
      ctaType: "WHATSAPP_ONLY",
      requiresEnquiry: true,
      isOutOfStock: false,
      isMadeToOrder: variant.isMadeToOrder,
      leadTimeDays,
      reason: "Online checkout is temporarily paused for store maintenance.",
    };
  }

  // Case 3: Product marked enquiryOnly OR variant purchase disabled
  if (product.isEnquiryOnly || !variant.isPurchaseEnabled) {
    return {
      canPurchase: false,
      priceVisibility: "PUBLIC",
      displayPrice,
      isHighValue,
      showWhatsApp: true,
      ctaType: "WHATSAPP_ONLY",
      requiresEnquiry: true,
      isOutOfStock: false,
      isMadeToOrder: variant.isMadeToOrder,
      leadTimeDays,
      reason: "Bespoke or exclusive item: consultation via WhatsApp is required.",
    };
  }

  // Case 4: Stock check (out of stock and not made to order)
  const isAvailableStock = variant.stockQuantity > 0 || variant.isMadeToOrder;
  if (!isAvailableStock) {
    return {
      canPurchase: false,
      priceVisibility: "PUBLIC",
      displayPrice,
      isHighValue,
      showWhatsApp: true,
      ctaType: "OUT_OF_STOCK",
      requiresEnquiry: false,
      isOutOfStock: true,
      isMadeToOrder: false,
      leadTimeDays,
      reason: "Currently sold out. You may enquire for custom backorder.",
    };
  }

  // Case 5: In Stock / Made to Order and purchasable
  // Check high value threshold (pricePaise >= highValueThresholdPaise) or forceWhatsApp
  const showWhatsApp = isHighValue || product.forceWhatsApp;
  const ctaType: CtaType = showWhatsApp ? "BUY_AND_WHATSAPP" : "BUY_NOW";

  let reason = "Available for instant online purchase.";
  if (isHighValue) {
    reason = "High-value luxury piece: available for direct purchase or personalized concierge consultation.";
  } else if (product.forceWhatsApp) {
    reason = "Available for direct purchase with optional stylist assistance.";
  }

  return {
    canPurchase: true,
    priceVisibility: "PUBLIC",
    displayPrice,
    isHighValue,
    showWhatsApp,
    ctaType,
    requiresEnquiry: false,
    isOutOfStock: false,
    isMadeToOrder: variant.isMadeToOrder,
    leadTimeDays,
    reason,
  };
}


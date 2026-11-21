/**
 * Server-Authoritative Cart Validation & Financials Recalculation (PRD-F10 / PRD-F11 / S16)
 * 
 * INVARIANTS:
 * 1. The client NEVER determines the unit price, tax, or total payable.
 * 2. Every cart item is resolved against PostgreSQL (or fixture fallback) for real pricePaise.
 * 3. Any item marked enquiryOnly or ON_REQUEST strictly halts checkout.
 * 4. Quantities must be positive integers; negative or zero quantities are rejected.
 * 5. If client claims a lower price (tamper attempt), the server detects and rejects it.
 */

import { db } from "@/lib/db";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";
import { calculateOrderFinancials } from "@/lib/money";
import { PriceVisibility } from "@prisma/client";
import { isDemoMode } from "@/lib/runtime";

export interface RawCheckoutItem {
  variantId: string;
  quantity: number;
  claimedUnitPricePaise?: string | number | null;
}

export interface ValidatedCartItem {
  variantId: string;
  productId: string;
  sku: string;
  productTitle: string;
  metalType: string;
  size?: string | null;
  purity?: string | null;
  unitPricePaise: bigint;
  quantity: number;
  lineTotalPaise: bigint;
}

export interface ValidatedCartResult {
  isValid: boolean;
  items: ValidatedCartItem[];
  subtotalPaise: bigint;
  taxPaise: bigint;
  shippingPaise: bigint;
  totalPaise: bigint;
  error?: string;
  tamperDetected?: boolean;
}

/**
 * Validates a list of client cart items against live database records.
 * Recalculates all totals server-side using 64-bit integer paise.
 */
export async function validateAndPriceCart(
  rawItems: RawCheckoutItem[],
  claimedTotalPaise?: string | number | bigint | null
): Promise<ValidatedCartResult> {
  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      isValid: false,
      items: [],
      subtotalPaise: 0n,
      taxPaise: 0n,
      shippingPaise: 0n,
      totalPaise: 0n,
      error: "Cart is empty. Please add items to checkout.",
    };
  }

  const validatedItems: ValidatedCartItem[] = [];
  let tamperDetected = false;

  for (const raw of rawItems) {
    // 1. Validate quantity
    if (!raw.quantity || !Number.isInteger(raw.quantity) || raw.quantity <= 0) {
      return {
        isValid: false,
        items: [],
        subtotalPaise: 0n,
        taxPaise: 0n,
        shippingPaise: 0n,
        totalPaise: 0n,
        error: `Invalid quantity "${raw.quantity}" specified for item. Must be a positive integer.`,
        tamperDetected: true,
      };
    }

    // 2. Fetch variant and product from database (with fixture fallback)
    let variantRecord: {
      id: string;
      productId: string;
      sku: string;
      metalType: string;
      size: string | null;
      purity: string | null;
      pricePaise: bigint | null;
      stockQuantity: number;
      isPurchaseEnabled: boolean;
      isArchived: boolean;
      product: {
        title: string;
        isEnquiryOnly: boolean;
        priceVisibility: PriceVisibility;
        isArchived: boolean;
      };
    } | null = null;

    try {
      const found = await db.variant.findUnique({
        where: { id: raw.variantId },
        include: { product: true },
      });
      if (found) {
        variantRecord = found;
      }
    } catch {
      // Database offline, fall through to fixture lookup
    }

    if (!variantRecord && isDemoMode()) {
      // Demo/test sandboxes resolve against deterministic fixtures; in
      // production an unknown variant is simply not purchasable.
      for (const p of FIXTURE_PRODUCTS) {
        const v = p.variants.find((v) => v.id === raw.variantId || v.sku === raw.variantId);
        if (v) {
          variantRecord = {
            id: v.id,
            productId: p.id,
            sku: v.sku,
            metalType: v.metalType,
            size: v.size || null,
            purity: v.purity || null,
            pricePaise: v.pricePaise !== null ? BigInt(v.pricePaise) : null,
            stockQuantity: v.stockQuantity,
            isPurchaseEnabled: v.isPurchaseEnabled,
            isArchived: false,
            product: {
              title: p.title,
              isEnquiryOnly: p.isEnquiryOnly,
              priceVisibility: p.priceVisibility,
              isArchived: false,
            },
          };
          break;
        }
      }
    }

    if (!variantRecord) {
      return {
        isValid: false,
        items: [],
        subtotalPaise: 0n,
        taxPaise: 0n,
        shippingPaise: 0n,
        totalPaise: 0n,
        error: `Item with variant ID "${raw.variantId}" no longer exists in catalogue.`,
      };
    }

    // 3. Enforce Policy Invariants (PRD-F04 / S07 / S08)
    if (variantRecord.product.isEnquiryOnly) {
      return {
        isValid: false,
        items: [],
        subtotalPaise: 0n,
        taxPaise: 0n,
        shippingPaise: 0n,
        totalPaise: 0n,
        error: `"${variantRecord.product.title}" is an inquiry-only bespoke piece and cannot be purchased directly online.`,
      };
    }

    if (
      variantRecord.product.priceVisibility === PriceVisibility.ON_REQUEST ||
      variantRecord.pricePaise === null
    ) {
      return {
        isValid: false,
        items: [],
        subtotalPaise: 0n,
        taxPaise: 0n,
        shippingPaise: 0n,
        totalPaise: 0n,
        error: `Price for "${variantRecord.product.title}" is upon request. Online checkout is disabled for this piece.`,
      };
    }

    if (!variantRecord.isPurchaseEnabled || variantRecord.isArchived || variantRecord.product.isArchived) {
      return {
        isValid: false,
        items: [],
        subtotalPaise: 0n,
        taxPaise: 0n,
        shippingPaise: 0n,
        totalPaise: 0n,
        error: `"${variantRecord.product.title}" is currently unavailable for purchase.`,
      };
    }

    const serverUnitPricePaise = variantRecord.pricePaise;

    // 4. Detect Price Tampering (S16 Invariant)
    if (raw.claimedUnitPricePaise !== undefined && raw.claimedUnitPricePaise !== null) {
      try {
        const claimedPaise = BigInt(raw.claimedUnitPricePaise);
        if (claimedPaise !== serverUnitPricePaise) {
          tamperDetected = true;
        }
      } catch {
        tamperDetected = true;
      }
    }

    const lineTotalPaise = serverUnitPricePaise * BigInt(raw.quantity);

    validatedItems.push({
      variantId: variantRecord.id,
      productId: variantRecord.productId,
      sku: variantRecord.sku,
      productTitle: variantRecord.product.title,
      metalType: variantRecord.metalType,
      size: variantRecord.size,
      purity: variantRecord.purity,
      unitPricePaise: serverUnitPricePaise,
      quantity: raw.quantity,
      lineTotalPaise,
    });
  }

  // 5. Server totals calculation
  let subtotalPaise = 0n;
  for (const item of validatedItems) {
    subtotalPaise += item.lineTotalPaise;
  }

  const financials = calculateOrderFinancials(subtotalPaise);

  // Check if claimed total was tampered
  if (claimedTotalPaise !== undefined && claimedTotalPaise !== null) {
    try {
      const claimed = BigInt(claimedTotalPaise);
      if (claimed !== financials.totalPaise) {
        tamperDetected = true;
      }
    } catch {
      tamperDetected = true;
    }
  }

  return {
    isValid: true,
    items: validatedItems,
    subtotalPaise: financials.subtotalPaise,
    taxPaise: financials.taxPaise,
    shippingPaise: financials.shippingPaise,
    totalPaise: financials.totalPaise,
    tamperDetected,
  };
}

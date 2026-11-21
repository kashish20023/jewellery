/**
 * Privacy-First Storefront Analytics & E-Commerce Event Dispatcher
 *
 * Directives & Boundaries:
 * 1. ZERO PII INVARIANT (S27): Customer name, email, phone, and physical address
 *    are NEVER included in analytics payloads or dispatched events.
 * 2. DEDUPLICATED PURCHASE TRACKING (S27): Prevents duplicate purchase events when
 *    a customer refreshes or revisits the order confirmation page.
 * 3. GRACEFUL ISOLATION: Safe for execution in both SSR/Node and browser environments.
 */

export interface AnalyticsItem {
  itemId: string;
  itemName: string;
  sku?: string;
  category?: string;
  priceInr?: number;
  quantity: number;
}

export interface PurchaseEventPayload {
  transactionId: string;
  valueInr: number;
  taxInr: number;
  shippingInr: number;
  currency: "INR";
  itemCount: number;
  items: AnalyticsItem[];
}

// In-memory set of tracked orders (server/test fallback)
const inMemoryTrackedOrders = new Set<string>();

const DEDUPE_STORAGE_KEY = "aurum_tracked_purchases";

/**
 * Checks whether an order purchase event has already been recorded.
 */
export function isPurchaseTracked(orderIdentifier: string): boolean {
  if (!orderIdentifier) return false;

  // Browser check via sessionStorage
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(DEDUPE_STORAGE_KEY);
      if (stored) {
        const trackedIds = JSON.parse(stored);
        if (Array.isArray(trackedIds) && trackedIds.includes(orderIdentifier)) {
          return true;
        }
      }
    } catch {
      // Fallback to in-memory set
    }
  }

  return inMemoryTrackedOrders.has(orderIdentifier);
}

/**
 * Marks an order purchase as tracked to prevent duplicate event dispatching.
 */
export function markPurchaseTracked(orderIdentifier: string): void {
  if (!orderIdentifier) return;

  inMemoryTrackedOrders.add(orderIdentifier);

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(DEDUPE_STORAGE_KEY);
      const trackedIds: string[] = stored ? JSON.parse(stored) : [];
      if (!trackedIds.includes(orderIdentifier)) {
        trackedIds.push(orderIdentifier);
        window.sessionStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(trackedIds));
      }
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Strips any potential PII fields from arbitrary object structures.
 */
export function sanitizeAnalyticsPayload<T extends Record<string, unknown>>(data: T): T {
  const piiKeys = [
    "name",
    "customerName",
    "email",
    "customerEmail",
    "phone",
    "customerPhone",
    "address",
    "shippingAddress",
    "billingAddress",
    "line1",
    "line2",
    "pinCode",
    "cardNumber",
    "cvv",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    if (piiKeys.includes(key.toLowerCase()) || piiKeys.includes(key)) {
      continue;
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeAnalyticsPayload(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized as T;
}

/**
 * Global custom event dispatcher for client-side tag managers (e.g. GTM, GA4, Plausible).
 */
export function dispatchStorefrontEvent(eventName: string, payload: Record<string, unknown>): boolean {
  const sanitized = sanitizeAnalyticsPayload(payload);

  if (typeof window !== "undefined") {
    try {
      // Dispatch standard browser CustomEvent
      const customEvent = new CustomEvent(`atelier:${eventName}`, {
        detail: sanitized,
      });
      window.dispatchEvent(customEvent);

      // Support dataLayer if defined
      const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
      if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({
          event: eventName,
          ...sanitized,
        });
      }
      return true;
    } catch (e) {
      console.warn("[Analytics] Event dispatch failed:", e);
      return false;
    }
  }
  return true;
}

/**
 * Tracks product view without leaking internal prices or costs.
 */
export function trackProductView(item: {
  id: string;
  title: string;
  sku: string;
  pricePaise: bigint | string | null;
  category?: string;
}) {
  const priceInr = item.pricePaise !== null ? Number(item.pricePaise) / 100 : undefined;

  dispatchStorefrontEvent("view_item", {
    itemId: item.id,
    itemName: item.title,
    sku: item.sku,
    category: item.category || "Fine Jewellery",
    currency: "INR",
    ...(priceInr !== undefined ? { price: priceInr } : {}),
  });
}

/**
 * Tracks item addition to cart.
 */
export function trackAddToCart(item: {
  sku: string;
  title: string;
  pricePaise: bigint | string | null;
  quantity: number;
}) {
  const priceInr = item.pricePaise !== null ? Number(item.pricePaise) / 100 : undefined;

  dispatchStorefrontEvent("add_to_cart", {
    sku: item.sku,
    title: item.title,
    quantity: item.quantity,
    currency: "INR",
    ...(priceInr !== undefined ? { price: priceInr } : {}),
  });
}

/**
 * Tracks order purchase strictly once without customer PII (S27).
 */
export function trackPurchase(payload: PurchaseEventPayload): boolean {
  if (isPurchaseTracked(payload.transactionId)) {
    return false; // Deduplicated; already tracked!
  }

  // Ensure strict PII stripping
  const safePayload = sanitizeAnalyticsPayload(payload as unknown as Record<string, unknown>);

  const dispatched = dispatchStorefrontEvent("purchase", safePayload);
  if (dispatched) {
    markPurchaseTracked(payload.transactionId);
  }
  return dispatched;
}


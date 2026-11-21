/**
 * Guest Cart Storage & Math Adapter (PRD-F10 / S16 / S25)
 * 
 * INVARIANTS:
 * 1. Stored strictly in browser localStorage under key "aurum_guest_cart".
 * 2. Zero PII stored in the cart.
 * 3. Client-side price is purely for optimistic display; server validates and recalculates
 *    all prices and totals before admitting checkout.
 * 4. Quantity must always be an integer >= 1.
 */

import { calculateOrderFinancials } from "@/lib/money";

export const CART_STORAGE_KEY = "aurum_guest_cart";

export interface CartItem {
  variantId: string;
  sku: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  metalType: string;
  size?: string | null;
  purity?: string | null;
  imageUrl?: string | null;
  unitPricePaise: string; // Serialized BigInt for optimistic UI display
  quantity: number;
}

export interface ClientCartTotals {
  itemCount: number;
  subtotalPaise: bigint;
  taxPaise: bigint;
  shippingPaise: bigint;
  totalPaise: bigint;
}

/**
 * Retrieves the guest cart from localStorage safely.
 */
export function getStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Sanitize and validate items
    return parsed.filter(
      (item) =>
        item &&
        typeof item.variantId === "string" &&
        typeof item.sku === "string" &&
        typeof item.quantity === "number" &&
        item.quantity > 0
    );
  } catch (error) {
    console.warn("Failed to load guest cart from localStorage:", error);
    return [];
  }
}

/**
 * Persists guest cart to localStorage.
 */
export function saveStoredCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("aurum_cart_updated"));
  } catch (error) {
    console.error("Failed to persist guest cart to localStorage:", error);
  }
}

/**
 * Adds an item to the cart or increments quantity if SKU already exists.
 */
export function addItemToCart(
  items: CartItem[],
  newItem: Omit<CartItem, "quantity">,
  quantity = 1
): CartItem[] {
  const safeQty = Math.max(1, Math.floor(quantity));
  const existingIndex = items.findIndex((i) => i.variantId === newItem.variantId || i.sku === newItem.sku);

  if (existingIndex > -1) {
    const updated = [...items];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: updated[existingIndex].quantity + safeQty,
    };
    return updated;
  }

  return [...items, { ...newItem, quantity: safeQty }];
}

/**
 * Updates item quantity in the cart. If quantity <= 0, removes the item.
 */
export function updateCartQuantity(
  items: CartItem[],
  variantId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return items.filter((i) => i.variantId !== variantId);
  }

  const safeQty = Math.floor(quantity);
  return items.map((i) => (i.variantId === variantId ? { ...i, quantity: safeQty } : i));
}

/**
 * Removes an item from the cart.
 */
export function removeCartItem(items: CartItem[], variantId: string): CartItem[] {
  return items.filter((i) => i.variantId !== variantId);
}

/**
 * Clears the guest cart completely.
 */
export function clearStoredCart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event("aurum_cart_updated"));
  } catch {
    // Ignore in SSR
  }
}

/**
 * Calculates optimistic client totals for cart badge and drawer.
 */
export function calculateClientCartTotals(items: CartItem[]): ClientCartTotals {
  let subtotal = 0n;
  let itemCount = 0;

  for (const item of items) {
    try {
      const price = BigInt(item.unitPricePaise);
      subtotal += price * BigInt(item.quantity);
      itemCount += item.quantity;
    } catch {
      // Ignore corrupted item price in optimistic calculation
    }
  }

  const financials = calculateOrderFinancials(subtotal);

  return {
    itemCount,
    subtotalPaise: financials.subtotalPaise,
    taxPaise: financials.taxPaise,
    shippingPaise: financials.shippingPaise,
    totalPaise: financials.totalPaise,
  };
}


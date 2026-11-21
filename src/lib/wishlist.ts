/**
 * Client-Side Guest Wishlist Storage Adapter
 * Key: aurum_guest_wishlist
 * Stores unique product IDs/slugs. Prevents duplicates and provides clean serialization.
 */

export const WISHLIST_STORAGE_KEY = "aurum_guest_wishlist";

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export function getStoredWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Normalize to strings and deduplicate
      return Array.from(new Set(parsed.filter((item) => typeof item === "string")));
    }
    return [];
  } catch (err) {
    console.error("Failed to read guest wishlist from localStorage:", err);
    return [];
  }
}

export function setStoredWishlist(productIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const unique = Array.from(new Set(productIds));
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(unique));
    // Dispatch custom event for real-time multi-component synchronization
    window.dispatchEvent(new CustomEvent("aurum-wishlist-update", { detail: unique }));
  } catch (err) {
    console.error("Failed to save guest wishlist to localStorage:", err);
  }
}

export function addWishlistItem(productId: string): string[] {
  const current = getStoredWishlist();
  if (!current.includes(productId)) {
    const updated = [...current, productId];
    setStoredWishlist(updated);
    return updated;
  }
  return current;
}

export function removeWishlistItem(productId: string): string[] {
  const current = getStoredWishlist();
  const updated = current.filter((id) => id !== productId);
  setStoredWishlist(updated);
  return updated;
}

export function toggleWishlistItem(productId: string): { items: string[]; isWishlisted: boolean } {
  const current = getStoredWishlist();
  const exists = current.includes(productId);
  const updated = exists ? current.filter((id) => id !== productId) : [...current, productId];
  setStoredWishlist(updated);
  return { items: updated, isWishlisted: !exists };
}


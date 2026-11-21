// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredWishlist,
  setStoredWishlist,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlistItem,
  WISHLIST_STORAGE_KEY,
} from "@/lib/wishlist";

describe("Guest Wishlist LocalStorage Adapter — Smoke Test Matrix S25 Contract", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns empty array when no items are stored", () => {
    expect(getStoredWishlist()).toEqual([]);
  });

  it("stores and retrieves wishlist items from localStorage", () => {
    setStoredWishlist(["prod-1", "prod-2"]);
    expect(getStoredWishlist()).toEqual(["prod-1", "prod-2"]);
  });

  it("deduplicates items to prevent double-counting (S25 No Duplication)", () => {
    addWishlistItem("prod-polki-1");
    addWishlistItem("prod-polki-1");
    addWishlistItem("prod-polki-1");

    const items = getStoredWishlist();
    expect(items).toEqual(["prod-polki-1"]);
    expect(items.length).toBe(1);
  });

  it("removes specified item from wishlist preserving other items (S25 Removal)", () => {
    setStoredWishlist(["prod-1", "prod-2", "prod-3"]);

    const remaining = removeWishlistItem("prod-2");
    expect(remaining).toEqual(["prod-1", "prod-3"]);
    expect(getStoredWishlist()).toEqual(["prod-1", "prod-3"]);
  });

  it("toggles item membership between active and removed", () => {
    // 1st toggle: adds
    const res1 = toggleWishlistItem("prod-solitaire");
    expect(res1.isWishlisted).toBe(true);
    expect(res1.items).toContain("prod-solitaire");

    // 2nd toggle: removes
    const res2 = toggleWishlistItem("prod-solitaire");
    expect(res2.isWishlisted).toBe(false);
    expect(res2.items).not.toContain("prod-solitaire");
  });

  it("handles corrupted JSON in localStorage gracefully without crashing", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "invalid-non-json-data{{{");
    const items = getStoredWishlist();
    expect(items).toEqual([]);
  });

  it("handles non-array json in localStorage gracefully", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ key: "value" }));
    const items = getStoredWishlist();
    expect(items).toEqual([]);
  });
});


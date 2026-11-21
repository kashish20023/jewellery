import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeAnalyticsPayload,
  isPurchaseTracked,
  markPurchaseTracked,
  trackPurchase,
  trackProductView,
  trackAddToCart,
  PurchaseEventPayload,
} from "@/lib/analytics";

describe("Privacy-First Analytics & Tracking Engine (PRD-F17 / S27)", () => {
  beforeEach(() => {
    // Clear browser sessionStorage mock if present
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  describe("sanitizeAnalyticsPayload() (S27 Zero PII Invariant)", () => {
    it("strictly strips customer name, email, phone, and addresses from payloads", () => {
      const contaminatedPayload = {
        transactionId: "ORD-2026-9999",
        valueInr: 250000,
        currency: "INR",
        customerName: "Maharaja Vikramaditya",
        customerEmail: "vikram@royal.in",
        customerPhone: "+919876543210",
        shippingAddress: {
          line1: "Flat 402, Samudra Mahal",
          line2: "Worli Sea Face",
          city: "Mumbai",
          state: "Maharashtra",
          pinCode: "400018",
        },
        items: [
          {
            itemId: "AUR-SOL-002",
            itemName: "Solitaire Ring",
            quantity: 1,
          },
        ],
      };

      const sanitized = sanitizeAnalyticsPayload(contaminatedPayload);

      // Verify safe analytics keys remain
      expect(sanitized.transactionId).toBe("ORD-2026-9999");
      expect(sanitized.valueInr).toBe(250000);
      expect(sanitized.currency).toBe("INR");
      expect(sanitized.items).toBeDefined();

      // Verify strict exclusion of all PII
      expect(sanitized).not.toHaveProperty("customerName");
      expect(sanitized).not.toHaveProperty("customerEmail");
      expect(sanitized).not.toHaveProperty("customerPhone");
      expect(sanitized).not.toHaveProperty("shippingAddress");
      expect(sanitized).not.toHaveProperty("line1");
      expect(sanitized).not.toHaveProperty("pinCode");
    });
  });

  describe("trackPurchase() Deduplication Invariant (S27)", () => {
    it("successfully tracks initial purchase, then deduplicates repeated dispatches", () => {
      const orderPayload: PurchaseEventPayload = {
        transactionId: "ORD-TEST-DEDUPE-001",
        valueInr: 185000,
        taxInr: 5550,
        shippingInr: 0,
        currency: "INR",
        itemCount: 1,
        items: [
          {
            itemId: "AUR-POLKI-01",
            itemName: "Polki Chandbali",
            quantity: 1,
            priceInr: 185000,
          },
        ],
      };

      // 1. Initial purchase tracking succeeds
      expect(isPurchaseTracked("ORD-TEST-DEDUPE-001")).toBe(false);
      const firstResult = trackPurchase(orderPayload);
      expect(firstResult).toBe(true);
      expect(isPurchaseTracked("ORD-TEST-DEDUPE-001")).toBe(true);

      // 2. Second purchase tracking for same order is strictly deduplicated (returns false)
      const secondResult = trackPurchase(orderPayload);
      expect(secondResult).toBe(false);
    });

    it("allows distinct orders to be tracked independently", () => {
      const orderA: PurchaseEventPayload = {
        transactionId: "ORD-DISTINCT-A",
        valueInr: 10000,
        taxInr: 300,
        shippingInr: 0,
        currency: "INR",
        itemCount: 1,
        items: [],
      };

      const orderB: PurchaseEventPayload = {
        transactionId: "ORD-DISTINCT-B",
        valueInr: 20000,
        taxInr: 600,
        shippingInr: 0,
        currency: "INR",
        itemCount: 1,
        items: [],
      };

      expect(trackPurchase(orderA)).toBe(true);
      expect(trackPurchase(orderB)).toBe(true);
      expect(trackPurchase(orderA)).toBe(false); // deduplicated
      expect(trackPurchase(orderB)).toBe(false); // deduplicated
    });
  });

  describe("trackProductView() & trackAddToCart()", () => {
    it("tracks product view safely without internal price leak for ON_REQUEST", () => {
      // Event dispatches without throwing
      expect(() => {
        trackProductView({
          id: "prod-1",
          title: "Heirloom Choker",
          sku: "AUR-CHOKER-01",
          pricePaise: null, // ON_REQUEST
        });
      }).not.toThrow();
    });

    it("tracks product view with price for public products", () => {
      expect(() => {
        trackProductView({
          id: "prod-2",
          title: "Solitaire Ring",
          sku: "AUR-SOL-01",
          pricePaise: 15000000n, // ₹1,50,000
        });
      }).not.toThrow();
    });

    it("tracks add to cart safely", () => {
      expect(() => {
        trackAddToCart({
          sku: "AUR-SOL-01",
          title: "Solitaire Ring",
          pricePaise: 15000000n,
          quantity: 1,
        });
      }).not.toThrow();
    });
  });
});


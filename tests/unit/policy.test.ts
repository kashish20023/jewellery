import { describe, it, expect } from "vitest";
import { evaluateProductPolicy } from "@/lib/policy/evaluateProductPolicy";

describe("evaluateProductPolicy() — Smoke Test Matrix Invariants", () => {
  const defaultStoreSettings = {
    highValueThresholdPaise: 10_000_000n, // ₹1,00,000.00
    enablePurchases: true,
  };

  describe("S06: Boundary Price Threshold Invariants", () => {
    it("at exact threshold (10,000,000 paise / ₹1,00,000), enables Buy Now AND WhatsApp Consultation", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 10_000_000n,
          stockQuantity: 2,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
        storeSettings: defaultStoreSettings,
      });

      expect(result.canPurchase).toBe(true);
      expect(result.isHighValue).toBe(true);
      expect(result.showWhatsApp).toBe(true);
      expect(result.ctaType).toBe("BUY_AND_WHATSAPP");
      expect(result.priceVisibility).toBe("PUBLIC");
    });

    it("below threshold (9,999,900 paise / ₹99,999), enables Buy Now WITHOUT WhatsApp Consultation", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 9_999_900n,
          stockQuantity: 5,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
        storeSettings: defaultStoreSettings,
      });

      expect(result.canPurchase).toBe(true);
      expect(result.isHighValue).toBe(false);
      expect(result.showWhatsApp).toBe(false);
      expect(result.ctaType).toBe("BUY_NOW");
    });

    it("above threshold (10,000,100 paise / ₹1,00,001), enables Buy Now AND WhatsApp Consultation", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 10_000_100n,
          stockQuantity: 1,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
        storeSettings: defaultStoreSettings,
      });

      expect(result.canPurchase).toBe(true);
      expect(result.isHighValue).toBe(true);
      expect(result.showWhatsApp).toBe(true);
      expect(result.ctaType).toBe("BUY_AND_WHATSAPP");
    });
  });

  describe("S07: enquiryOnly Enforcements", () => {
    it("blocks direct purchase on low priced item if isEnquiryOnly is true", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: true, // Marked enquiry-only
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 4_500_000n, // ₹45,000.00
          stockQuantity: 10,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
        storeSettings: defaultStoreSettings,
      });

      expect(result.canPurchase).toBe(false);
      expect(result.showWhatsApp).toBe(true);
      expect(result.ctaType).toBe("WHATSAPP_ONLY");
      expect(result.requiresEnquiry).toBe(true);
    });

    it("blocks direct purchase if variant isPurchaseEnabled is false", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 5_000_000n,
          stockQuantity: 2,
          isMadeToOrder: false,
          isPurchaseEnabled: false, // Variant purchase explicitly disabled
        },
        storeSettings: defaultStoreSettings,
      });

      expect(result.canPurchase).toBe(false);
      expect(result.showWhatsApp).toBe(true);
      expect(result.ctaType).toBe("WHATSAPP_ONLY");
    });
  });

  describe("S08: Price on Request & Zero Price Invariants", () => {
    it("blocks purchase and formats display as 'Price upon request' when priceVisibility is ON_REQUEST", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "ON_REQUEST",
          forceWhatsApp: true,
        },
        variant: {
          pricePaise: null,
          stockQuantity: 1,
          isMadeToOrder: true,
          isPurchaseEnabled: true,
        },
        storeSettings: defaultStoreSettings,
      });

      expect(result.canPurchase).toBe(false);
      expect(result.priceVisibility).toBe("ON_REQUEST");
      expect(result.displayPrice).toBe("Price upon request");
      expect(result.showWhatsApp).toBe(true);
      expect(result.ctaType).toBe("WHATSAPP_ONLY");
      expect(result.requiresEnquiry).toBe(true);
    });

    it("treats null, 0, or negative price as ON_REQUEST preventing free checkout", () => {
      const nullPriceResult = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: null,
          stockQuantity: 5,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
      });

      expect(nullPriceResult.canPurchase).toBe(false);
      expect(nullPriceResult.displayPrice).toBe("Price upon request");
      expect(nullPriceResult.ctaType).toBe("WHATSAPP_ONLY");

      const zeroPriceResult = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 0n,
          stockQuantity: 5,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
      });

      expect(zeroPriceResult.canPurchase).toBe(false);
      expect(zeroPriceResult.displayPrice).toBe("Price upon request");
    });
  });

  describe("Inventory & Made to Order Conditions", () => {
    it("marks out of stock when stockQuantity is 0 and isMadeToOrder is false", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 7_500_000n,
          stockQuantity: 0,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
      });

      expect(result.canPurchase).toBe(false);
      expect(result.isOutOfStock).toBe(true);
      expect(result.ctaType).toBe("OUT_OF_STOCK");
    });

    it("allows purchase for made-to-order item even when stockQuantity is 0", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: false,
        },
        variant: {
          pricePaise: 6_800_000n, // Below threshold
          stockQuantity: 0,
          isMadeToOrder: true,
          leadTimeDays: 21,
          isPurchaseEnabled: true,
        },
      });

      expect(result.canPurchase).toBe(true);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isMadeToOrder).toBe(true);
      expect(result.leadTimeDays).toBe(21);
      expect(result.ctaType).toBe("BUY_NOW");
    });
  });

  describe("Force WhatsApp Option", () => {
    it("displays WhatsApp consultation even below threshold if forceWhatsApp is true", () => {
      const result = evaluateProductPolicy({
        product: {
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          forceWhatsApp: true,
        },
        variant: {
          pricePaise: 5_000_000n, // ₹50,000 (well below 1L threshold)
          stockQuantity: 3,
          isMadeToOrder: false,
          isPurchaseEnabled: true,
        },
      });

      expect(result.canPurchase).toBe(true);
      expect(result.isHighValue).toBe(false);
      expect(result.showWhatsApp).toBe(true);
      expect(result.ctaType).toBe("BUY_AND_WHATSAPP");
    });
  });
});


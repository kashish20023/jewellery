import { describe, it, expect } from "vitest";
import {
  formatPaiseToInr,
  inrToPaise,
  paiseToInr,
  isHighValueItem,
  calculateOrderFinancials,
  DEFAULT_HIGH_VALUE_THRESHOLD_PAISE,
} from "@/lib/money";

describe("Money & Currency Module", () => {
  describe("formatPaiseToInr()", () => {
    it("formats 10,000,000 paise to ₹1,00,000 with Indian numbering format", () => {
      const formatted = formatPaiseToInr(10_000_000n);
      // Clean non-breaking spaces if any from Intl output
      const normalized = formatted.replace(/\u00A0/g, " ");
      expect(normalized).toBe("₹1,00,000");
    });

    it("formats 9,999,900 paise to ₹99,999", () => {
      const formatted = formatPaiseToInr(9_999_900n);
      const normalized = formatted.replace(/\u00A0/g, " ");
      expect(normalized).toBe("₹99,999");
    });

    it("formats 10,000,100 paise to ₹1,00,001", () => {
      const formatted = formatPaiseToInr(10_000_100n);
      const normalized = formatted.replace(/\u00A0/g, " ");
      expect(normalized).toBe("₹1,00,001");
    });

    it("formats paise with sub-rupee fractions when needed", () => {
      const formatted = formatPaiseToInr(10050n, { includeDecimals: true });
      const normalized = formatted.replace(/\u00A0/g, " ");
      expect(normalized).toBe("₹100.50");
    });

    it("returns 'Price upon request' for null or undefined", () => {
      expect(formatPaiseToInr(null)).toBe("Price upon request");
      expect(formatPaiseToInr(undefined)).toBe("Price upon request");
    });

    it("returns 'Price upon request' for negative values", () => {
      expect(formatPaiseToInr(-500n)).toBe("Price upon request");
    });
  });

  describe("inrToPaise() & paiseToInr()", () => {
    it("converts 100000 rupees to 10000000n paise", () => {
      expect(inrToPaise(100000)).toBe(10_000_000n);
      expect(inrToPaise("100000")).toBe(10_000_000n);
    });

    it("converts decimal rupees correctly avoiding floating point drift", () => {
      expect(inrToPaise("99999.50")).toBe(9_999_950n);
    });

    it("throws on invalid rupee inputs", () => {
      expect(() => inrToPaise(-100)).toThrow();
      expect(() => inrToPaise("invalid")).toThrow();
    });

    it("converts paise to Rupee numeric value", () => {
      expect(paiseToInr(10_000_000n)).toBe(100000);
      expect(paiseToInr(9_999_900n)).toBe(99999);
    });
  });

  describe("isHighValueItem() threshold boundary logic", () => {
    it("evaluates strictly pricePaise >= thresholdPaise", () => {
      // Exactly at default threshold (10,000,000 paise / ₹1,00,000) -> TRUE
      expect(isHighValueItem(10_000_000n, DEFAULT_HIGH_VALUE_THRESHOLD_PAISE)).toBe(true);

      // 100 paise below threshold (9,999,900 paise / ₹99,999) -> FALSE
      expect(isHighValueItem(9_999_900n, DEFAULT_HIGH_VALUE_THRESHOLD_PAISE)).toBe(false);

      // 100 paise above threshold (10,000,100 paise / ₹1,00,001) -> TRUE
      expect(isHighValueItem(10_000_100n, DEFAULT_HIGH_VALUE_THRESHOLD_PAISE)).toBe(true);
    });

    it("returns false for null or undefined price", () => {
      expect(isHighValueItem(null)).toBe(false);
      expect(isHighValueItem(undefined)).toBe(false);
    });

    it("accepts custom threshold amounts", () => {
      const customThreshold = 5_000_000n; // ₹50,000
      expect(isHighValueItem(4_999_900n, customThreshold)).toBe(false);
      expect(isHighValueItem(5_000_000n, customThreshold)).toBe(true);
      expect(isHighValueItem(5_000_100n, customThreshold)).toBe(true);
    });
  });

  describe("calculateOrderFinancials()", () => {
    it("computes 3% GST and total using BigInt integer arithmetic", () => {
      // Subtotal: ₹1,00,000 (10,000,000 paise)
      // 3% GST: ₹3,000 (300,000 paise)
      // Shipping: ₹0
      // Total: ₹1,03,000 (10,300,000 paise)
      const res = calculateOrderFinancials(10_000_000n, 3.0, 0n);
      expect(res.subtotalPaise).toBe(10_000_000n);
      expect(res.taxPaise).toBe(300_000n);
      expect(res.shippingPaise).toBe(0n);
      expect(res.totalPaise).toBe(10_300_000n);
    });

    it("handles rounding of odd paise accurately with half-up rounding", () => {
      // Subtotal: 9,999,900 paise (₹99,999)
      // 3% GST: 9,999,900 * 0.03 = 299,997 paise
      const res = calculateOrderFinancials(9_999_900n, 3.0, 50_000n); // 500 INR shipping
      expect(res.subtotalPaise).toBe(9_999_900n);
      expect(res.taxPaise).toBe(299_997n);
      expect(res.shippingPaise).toBe(50_000n);
      expect(res.totalPaise).toBe(9_999_900n + 299_997n + 50_000n);
    });

    it("throws if subtotal is negative", () => {
      expect(() => calculateOrderFinancials(-100n)).toThrow("Subtotal cannot be negative");
    });
  });
});


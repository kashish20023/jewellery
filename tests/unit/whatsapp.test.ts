import { describe, it, expect, vi } from "vitest";
import {
  sanitizeWhatsAppNumber,
  buildProductWhatsAppLink,
  buildConsultationWhatsAppLink,
  handleWhatsAppClick,
  DEFAULT_WHATSAPP_NUMBER,
} from "@/lib/whatsapp";

describe("WhatsApp Deep-Link & Phone Sanitization (S09 / S10)", () => {
  describe("Phone number sanitizer", () => {
    it("strips plus signs, spaces, hyphens, and brackets into digits only", () => {
      expect(sanitizeWhatsAppNumber("+91 98765-43210")).toBe("919876543210");
      expect(sanitizeWhatsAppNumber("+91 (987) 654-3210")).toBe("919876543210");
      expect(sanitizeWhatsAppNumber("91-9876543210")).toBe("919876543210");
      expect(sanitizeWhatsAppNumber("  919876543210  ")).toBe("919876543210");
    });

    it("throws an error when phone number contains no digits", () => {
      expect(() => sanitizeWhatsAppNumber("   ---   ")).toThrow(
        'Invalid WhatsApp phone number: "   ---   " contains no digits.'
      );
    });
  });

  describe("Product WhatsApp Deep Link Builder (S09)", () => {
    it("constructs a valid wa.me link with encoded text containing product details", () => {
      const link = buildProductWhatsAppLink({
        whatsappNumber: "919876543210",
        productTitle: "The Royal Nizam Polki Choker",
        variantSku: "AUR-CHOK-001-YG",
        metalType: "18K Yellow Gold",
        size: "Adjustable 16-18 inch",
        formattedPrice: "₹1,25,000",
        productUrl: "https://chudiwalas.com/products/royal-nizam-polki-choker",
      });

      expect(link.startsWith("https://wa.me/919876543210?text=")).toBe(true);

      // Verify that the payload is safely URL encoded
      const url = new URL(link);
      const textParam = url.searchParams.get("text") || "";

      expect(textParam).toContain("Hello Chudiwalas,");
      expect(textParam).toContain("The Royal Nizam Polki Choker");
      expect(textParam).toContain("AUR-CHOK-001-YG");
      expect(textParam).toContain("₹1,25,000");
      expect(textParam).toContain("https://chudiwalas.com/products/royal-nizam-polki-choker");
    });

    it("correctly encodes special characters, newlines, hashes, ampersands, and Hindi/Unicode", () => {
      const link = buildProductWhatsAppLink({
        productTitle: "Kundan & Meenakari Ring #05 (कुंदन & जड़ाऊ)",
        variantSku: "AUR-RNG-005 & SPECIAL",
        metalType: "22K Gold & Uncut Diamonds",
        formattedPrice: "₹4,50,000.00 (Incl. 3% GST)",
      });

      // Special characters must not break URL parsing
      const url = new URL(link);
      const text = url.searchParams.get("text") || "";

      expect(text).toContain("Kundan & Meenakari Ring #05 (कुंदन & जड़ाऊ)");
      expect(text).toContain("AUR-RNG-005 & SPECIAL");
      expect(text).toContain("₹4,50,000.00 (Incl. 3% GST)");
    });

    it("falls back to default atelier phone number when none provided", () => {
      const link = buildProductWhatsAppLink({
        productTitle: "Solitaire Ring",
        variantSku: "AUR-SOL-001",
        metalType: "Platinum 950",
        formattedPrice: "₹85,000",
      });

      expect(link.startsWith(`https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=`)).toBe(true);
    });
  });

  describe("Consultation WhatsApp Deep Link Builder", () => {
    it("builds a concierge consultation inquiry link", () => {
      const link = buildConsultationWhatsAppLink({
        customerName: "Maharani Gayatri Devi",
        type: "BESPOKE",
        message: "I am interested in custom bridal necklace designs.",
      });

      const url = new URL(link);
      const text = url.searchParams.get("text") || "";

      expect(text).toContain("Hello Chudiwalas Concierge,");
      expect(text).toContain("My name is Maharani Gayatri Devi.");
      expect(text).toContain("I am interested in custom bridal necklace designs.");
    });
  });

  describe("WhatsApp Intent Tracking Resilience (S10)", () => {
    it("does not throw or block when intent tracking fails or network throws", async () => {
      // Mock global fetch to throw network error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const targetUrl = "https://wa.me/919876543210?text=Hello";

      // Should complete without throwing
      await expect(
        handleWhatsAppClick(targetUrl, { sku: "AUR-TEST-001" })
      ).resolves.toBeUndefined();

      global.fetch = originalFetch;
    });
  });
});

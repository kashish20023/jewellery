/**
 * WhatsApp Deep-Link Construction & Encoding Utility (PRD-F06 / S09 / S10)
 * 
 * INVARIANTS:
 * 1. Base URL must strictly follow https://wa.me/{digitsOnlyNumber}?text={encodedText}
 * 2. Numbers must be sanitized to digits only (e.g. +91 98765-43210 -> 919876543210).
 * 3. Text payload MUST be safely encoded using encodeURIComponent to preserve
 *    newlines, ampersands, hashes, punctuation, and Unicode characters.
 * 4. Must NEVER leak internal cost, wholesale pricing, or private customer PII.
 */

export const DEFAULT_WHATSAPP_NUMBER = "919876543210";

/**
 * Sanitizes phone numbers to international digits-only format.
 * Example: "+91 (987) 654-3210" -> "919876543210"
 */
export function sanitizeWhatsAppNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  if (!digits) {
    throw new Error(`Invalid WhatsApp phone number: "${phoneNumber}" contains no digits.`);
  }
  return digits;
}

export interface ProductWhatsAppContext {
  whatsappNumber?: string;
  productTitle: string;
  variantSku: string;
  metalType: string;
  metalColour?: string | null;
  purity?: string | null;
  size?: string | null;
  /** Formatted public price. Omit (or pass null) for ON_REQUEST pieces so no amount leaks. */
  formattedPrice?: string | null;
  productUrl?: string;
}

/**
 * Constructs a context-specific WhatsApp deep-link for a product inquiry.
 * Message shape: "Hello Chudiwalas, I'm interested in [piece], [colour], [purity],
 * [size], SKU [sku]. [price if public] [variant URL]".
 */
export function buildProductWhatsAppLink(context: ProductWhatsAppContext): string {
  const phone = sanitizeWhatsAppNumber(context.whatsappNumber || DEFAULT_WHATSAPP_NUMBER);

  const descriptor = [
    context.productTitle,
    context.metalColour || null,
    context.purity || null,
    context.size ? (/size/i.test(context.size) ? context.size : `size ${context.size}`) : null,
  ]
    .filter(Boolean)
    .join(", ");

  const lines = [
    `Hello Chudiwalas, I'm interested in ${descriptor}, SKU ${context.variantSku}.`,
    `Metal: ${context.metalType}`,
  ];

  const hidden = !context.formattedPrice || /request/i.test(context.formattedPrice);
  if (!hidden) {
    lines.push(`Price: ${context.formattedPrice}`);
  }

  if (context.productUrl) {
    lines.push(context.productUrl);
  }

  lines.push("Please share availability and craftsmanship details.");

  const message = lines.join("\n");
  const encodedText = encodeURIComponent(message);

  return `https://wa.me/${phone}?text=${encodedText}`;
}

export interface ConsultationWhatsAppContext {
  whatsappNumber?: string;
  customerName?: string;
  type?: "CALLBACK" | "APPOINTMENT" | "BESPOKE";
  message?: string;
}

/**
 * Constructs a general bespoke or consultation WhatsApp deep-link.
 */
export function buildConsultationWhatsAppLink(context: ConsultationWhatsAppContext = {}): string {
  const phone = sanitizeWhatsAppNumber(context.whatsappNumber || DEFAULT_WHATSAPP_NUMBER);

  const lines = [
    "Hello Chudiwalas Concierge,",
    context.customerName ? `My name is ${context.customerName}.` : "I am interested in a private jewellery consultation.",
    context.message || "I would like to discuss bespoke design, bridal suites, and viewing availability.",
    "Looking forward to hearing from you.",
  ];

  const message = lines.join("\n");
  const encodedText = encodeURIComponent(message);

  return `https://wa.me/${phone}?text=${encodedText}`;
}

/**
 * Optional client-side intent tracking wrapper (S10 Contract).
 * Attempts to record user click without ever blocking the navigation.
 * Even if the network fails or tracking throws, the link remains 100% operational.
 */
export async function handleWhatsAppClick(
  url: string,
  trackingPayload?: { sku?: string; sourceUrl?: string }
): Promise<void> {
  try {
    if (typeof window !== "undefined" && trackingPayload) {
      // Fire-and-forget beacon or async fetch
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/enquiries/whatsapp-intent", JSON.stringify(trackingPayload));
      } else {
        fetch("/api/enquiries/whatsapp-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trackingPayload),
          keepalive: true,
        }).catch(() => {
          // Intentionally silent: Tracking failure must never break customer experience
        });
      }
    }
  } catch (err) {
    // S10: Link functions honestly even if tracking is blocked
    console.warn("WhatsApp intent tracking failed silently:", err);
  } finally {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
}


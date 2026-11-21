"use client";

import React from "react";
import { buildProductWhatsAppLink, handleWhatsAppClick } from "@/lib/whatsapp";
import type { PublicProductDto, PublicVariantDto } from "@/lib/types";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

/** Official-style WhatsApp glyph (speech bubble with handset). */
export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.6.8 5.1 2.2 7.2L3.5 29l6.2-1.6a13.3 13.3 0 0 0 6.3 1.6c7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2 0-4-.5-5.7-1.6l-.4-.2-3.7 1 1-3.6-.3-.4a10.3 10.3 0 0 1-1.7-5.8C5.2 10 10 5.3 16 5.3s10.8 4.7 10.8 10.5S22 26.4 16 26.4zm5.9-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
    </svg>
  );
}

export function productWhatsAppUrl(product: PublicProductDto, variant?: PublicVariantDto) {
  const v = variant || product.defaultVariant;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return buildProductWhatsAppLink({
    whatsappNumber: WHATSAPP_NUMBER,
    productTitle: product.title,
    variantSku: v.sku,
    metalType: v.metalType,
    metalColour: v.metalColour,
    purity: v.purityLabel,
    size: v.size,
    formattedPrice: v.policy.priceVisibility === "PUBLIC" ? v.formattedPrice : null,
    productUrl: origin ? `${origin}/products/${product.slug}?variant=${encodeURIComponent(v.sku)}` : undefined,
  });
}

function useTap(product: PublicProductDto, variant?: PublicVariantDto) {
  const url = productWhatsAppUrl(product, variant);
  const v = variant || product.defaultVariant;
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleWhatsAppClick(url, { sku: v.sku, sourceUrl: typeof window !== "undefined" ? window.location.href : undefined });
  };
  return { url, onClick };
}

/**
 * Pill button with label. Used on the product page and anywhere there is room.
 */
export function WhatsAppConnectButton({
  product,
  variant,
  label = "Connect on WhatsApp",
  shortLabel = "Connect",
  size = "sm",
  className = "",
}: {
  product: PublicProductDto;
  variant?: PublicVariantDto;
  label?: string;
  shortLabel?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { url, onClick } = useTap(product, variant);
  const sizing = size === "md" ? "px-5 py-3 text-xs tracking-[0.12em] uppercase" : "px-3.5 py-2 text-xs";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={`Connect on WhatsApp about ${product.title}`}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-olive-600 bg-olive-50 text-charcoal-950 font-medium hover:bg-olive-600 hover:text-ivory-50 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 ${sizing} ${className}`}
    >
      <WhatsAppIcon className="w-4 h-4 shrink-0" />
      <span className="whitespace-nowrap sm:hidden">{shortLabel}</span>
      <span className="whitespace-nowrap hidden sm:inline">{label}</span>
    </a>
  );
}

/**
 * Icon-only circle used on product cards: one tap opens WhatsApp with the
 * piece and selection already written in.
 */
export function WhatsAppIconButton({
  product,
  variant,
  className = "",
}: {
  product: PublicProductDto;
  variant?: PublicVariantDto;
  className?: string;
}) {
  const { url, onClick } = useTap(product, variant);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={`Connect on WhatsApp about ${product.title}`}
      title="Chat on WhatsApp"
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-olive-600 text-ivory-50 hover:bg-olive-700 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2 ${className}`}
    >
      <WhatsAppIcon className="w-5 h-5" />
    </a>
  );
}

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

/**
 * Floating WhatsApp concierge pill.
 * Hidden on product detail pages, where the sticky buy bar already carries a
 * WhatsApp action and the pill would overlap the gallery thumbnails and swatches.
 */
export function ConciergePill() {
  const pathname = usePathname();
  if (pathname?.startsWith("/products/")) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello Chudiwalas, I would like to speak with a concierge.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with the concierge on WhatsApp"
      className="fixed bottom-5 md:bottom-6 right-4 md:right-6 z-30 inline-flex items-center justify-center md:gap-2 w-12 h-12 md:w-auto md:h-auto rounded-full md:pl-2 md:pr-4 md:py-2 bg-olive-600 md:bg-white text-ivory-50 md:text-charcoal-950 shadow-[0_4px_20px_rgba(26,26,26,0.18)] md:border md:border-charcoal-100 hover:shadow-xl transition-all"
    >
      {/* Compact circle on phones so the pill never sits over page copy */}
      <span className="md:w-8 md:h-8 md:rounded-full md:bg-olive-600 md:text-ivory-50 flex items-center justify-center">
        <MessageCircle className="w-5 h-5 md:w-4 md:h-4" />
      </span>
      <span className="hidden md:inline text-xs font-medium">Concierge</span>
    </a>
  );
}

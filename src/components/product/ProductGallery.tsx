"use client";

import React, { useEffect, useRef, useState } from "react";
import { PublicMediaDto } from "@/lib/types";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { ZoomModal } from "./ZoomModal";
import { Maximize2, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

export interface ProductGalleryProps {
  media: PublicMediaDto[];
  productTitle: string;
  /** Changes when the selected variant changes; used to crossfade to its photo set. */
  variantKey?: string;
}

/**
 * Desktop: photographs stack in one tall column so the piece is shown large
 * and the column runs the full height of the sticky detail panel beside it.
 * Mobile: one large photo with swipe, arrows and a thumbnail reel.
 */
export function ProductGallery({ media, productTitle, variantKey }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomStart, setZoomStart] = useState(0);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastKey = useRef(variantKey);

  const activeMedia = media[activeIndex] || media[0];

  useEffect(() => {
    if (variantKey !== lastKey.current) {
      lastKey.current = variantKey;
      setActiveIndex(0);
    }
  }, [variantKey]);

  useEffect(() => {
    if (activeIndex > media.length - 1) setActiveIndex(0);
  }, [media.length, activeIndex]);

  const go = (delta: number) => {
    if (media.length < 2) return;
    setActiveIndex((i) => (i + delta + media.length) % media.length);
  };

  const openZoom = (index: number) => {
    setZoomStart(index);
    setIsZoomOpen(true);
  };

  if (!activeMedia) {
    return (
      <div className="aspect-[4/5] tile-product flex items-center justify-center p-8 text-center text-charcoal-600">
        <div className="space-y-2">
          <ImageIcon className="w-8 h-8 text-olive-600 mx-auto stroke-[1.25]" />
          <span className="text-sm block">Photograph coming from the atelier</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: 2-column grid */}
      <div className="hidden lg:flex lg:flex-col gap-3">
        {media.map((item, idx) => (
          <button
            key={item.id}
            ref={idx === 0 ? zoomTriggerRef : undefined}
            type="button"
            onClick={() => openZoom(idx)}
            aria-label={`Zoom ${item.altText || `photograph ${idx + 1}`}`}
            className="relative overflow-hidden tile-product cursor-zoom-in group aspect-[4/5] focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600"
          >
            <ImageWithFallback
              src={item.url}
              alt={item.altText || productTitle}
              fallbackTitle={productTitle}
              fill
              priority={idx === 0}
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover object-center img-zoom"
            />
            {idx === 0 && (
              <>
                <span className="absolute top-3 left-3 text-[11px] font-medium bg-white/95 px-2.5 py-1 text-charcoal-800">BIS hallmarked</span>
                <span className="absolute bottom-3 right-3 w-9 h-9 bg-white/90 border border-charcoal-100 flex items-center justify-center text-charcoal-900">
                  <Maximize2 className="w-4 h-4" />
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Mobile: one photo + swipe + thumbnails */}
      <div className="lg:hidden flex flex-col gap-3">
        <div
          className="relative aspect-square w-full tile-product overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label={`${productTitle} photographs`}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <ImageWithFallback
            key={activeMedia.id}
            src={activeMedia.url}
            alt={activeMedia.altText || productTitle}
            fallbackTitle={productTitle}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center cursor-zoom-in"
            onClick={() => openZoom(activeIndex)}
          />
          {media.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous photograph" className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-charcoal-100 flex items-center justify-center text-charcoal-900">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next photograph" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-charcoal-100 flex items-center justify-center text-charcoal-900">
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="absolute bottom-3 right-3 text-[10px] bg-white/90 px-2 py-1 border border-charcoal-100 text-charcoal-700 tabular-nums" aria-live="polite">
                {activeIndex + 1} / {media.length}
              </span>
            </>
          )}
          <span className="absolute top-3 left-3 text-[11px] font-medium bg-white/95 px-2.5 py-1 text-charcoal-800">BIS hallmarked</span>
        </div>
        {media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Product thumbnails">
            {media.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={idx === activeIndex}
                aria-label={item.altText || `View photograph ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`relative w-16 h-16 shrink-0 rounded-md overflow-hidden transition-all ${idx === activeIndex ? "ring-2 ring-olive-600" : "ring-1 ring-charcoal-100 opacity-70"}`}
              >
                <ImageWithFallback src={item.url} alt="" fallbackTitle={`Photograph ${idx + 1}`} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <ZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        media={media}
        initialIndex={zoomStart}
        productTitle={productTitle}
        triggerElementRef={zoomTriggerRef}
      />
    </div>
  );
}

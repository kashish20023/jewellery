"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { PublicMediaDto } from "@/lib/types";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export interface ZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: PublicMediaDto[];
  initialIndex?: number;
  productTitle: string;
  triggerElementRef?: React.RefObject<HTMLElement | null>;
}

export function ZoomModal({
  isOpen,
  onClose,
  media,
  initialIndex = 0,
  productTitle,
  triggerElementRef,
}: ZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
    }
  }, [isOpen, initialIndex]);

  // Focus management & keyboard navigation (S05 Contract)
  const handleNext = useCallback(() => {
    setScale(1);
    setCurrentIndex((prev) => (prev + 1) % media.length);
  }, [media.length]);

  const handlePrev = useCallback(() => {
    setScale(1);
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length]);

  useEffect(() => {
    if (!isOpen) return;

    // Capture trigger element at open time for reliable focus restoration (S05 requirement)
    const triggerEl = triggerElementRef?.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";

      // RESTORE FOCUS TO TRIGGER ELEMENT (S05 requirement)
      if (triggerEl && typeof triggerEl.focus === "function") {
        triggerEl.focus();
      } else if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose, handleNext, handlePrev, triggerElementRef]);

  // Touch Swipe Handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (scale > 1) return; // Allow panning when zoomed
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
  };

  if (!isOpen || media.length === 0) return null;

  const activeMedia = media[currentIndex] || media[0];

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={`High-resolution craftsmanship zoom view for ${productTitle}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/95 backdrop-blur-md select-none transition-opacity duration-300 ease-out"
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 h-16 px-6 flex items-center justify-between text-ivory-100 z-20 bg-gradient-to-b from-charcoal-950/80 to-transparent">
        <div>
          <h4 className="font-serif text-sm tracking-wide text-ivory-50 line-clamp-1">
            {productTitle}
          </h4>
          <span className="text-[11px] font-mono text-gold-400">
            Image {currentIndex + 1} of {media.length} &bull; Master Karigar Detail
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Zoom In/Out Controls */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s + 0.5, 3))}
            aria-label="Zoom in"
            className="p-2 text-ivory-200 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 active:scale-95"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s - 0.5, 1))}
            aria-label="Zoom out"
            className="p-2 text-ivory-200 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 active:scale-95"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          {/* Close Modal Button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close zoom gallery"
            className="p-2 text-ivory-200 hover:text-gold-400 transition-colors rounded-full hover:bg-charcoal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative w-full h-[80vh] flex items-center justify-center p-4 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative w-full h-full max-w-4xl max-h-[75vh] flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-zoom-in [will-change:transform]"
          style={{ transform: `scale(${scale}) translateZ(0)` }}
          onClick={() => setScale((s) => (s > 1 ? 1 : 2))}
        >
          <ImageWithFallback
            src={activeMedia.url}
            alt={activeMedia.altText || productTitle}
            fallbackTitle={productTitle}
            fill
            sizes="100vw"
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Left/Right Navigation Controls */}
      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image (Arrow Left)"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-charcoal-900/60 hover:bg-charcoal-900 text-ivory-100 hover:text-gold-400 transition-all z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image (Arrow Right)"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-charcoal-900/60 hover:bg-charcoal-900 text-ivory-100 hover:text-gold-400 transition-all z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <ChevronRight className="w-6 h-6 stroke-[1.5]" />
          </button>
        </>
      )}

      {/* Bottom Thumbnail Strip */}
      {media.length > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-2 z-20 px-4 overflow-x-auto py-2">
          {media.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setScale(1);
                setCurrentIndex(idx);
              }}
              aria-label={`View image ${idx + 1}`}
              className={`relative w-12 h-12 rounded-none border transition-all overflow-hidden shrink-0 ${
                idx === currentIndex
                  ? "border-gold-400 scale-105 shadow-subtle ring-1 ring-gold-400"
                  : "border-charcoal-700 opacity-60 hover:opacity-100"
              }`}
            >
              <ImageWithFallback
                src={item.url}
                alt={item.altText || `Thumbnail ${idx + 1}`}
                fill
                sizes="48px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

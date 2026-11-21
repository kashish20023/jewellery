"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LotusMotif } from "./LotusMotif";

export interface JewelleryBoxItem {
  src: string;
  alt: string;
  href?: string;
}

export interface JewelleryBoxProps {
  title?: string;
  number?: string;
  monogram?: string;
  subtitle?: string;
  tagline?: string;
  image: JewelleryBoxItem;
  className?: string;
}

/**
 * Reusable 3D Hover-to-Open Jewellery Gift Box, styled in the Chudiwalas palette:
 * olive green case, ivory velvet interior, burnt orange accents.
 * Single Hero Product Showcase with 64cqw tray geometry, [perspective:1500px]
 * 3D flip lid, 1:1 square white mat card, and 650ms entrance animation.
 */
export const JewelleryBox: React.FC<JewelleryBoxProps> = ({
  title = "Jewellery",
  number = "NO. 01",
  monogram = "C",
  subtitle = "Chudiwalas, Jaipur",
  tagline = "Heritage in every piece",
  image,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStateChange = useCallback((open: boolean) => {
    setIsOpen(open);
    setIsTransitioning(true);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    // Add will-change: transform only during the active 1100ms lid transition
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 1150);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleStateChange(!isOpen);
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      handleStateChange(false);
    }
  };

  const cardNode = (
    <div
      className={cn(
        "w-full h-full p-[1.1cqw] bg-white rounded-[1.2cqw] border border-[#CC5500]/70",
        "shadow-[0_8px_22px_rgba(26,26,26,0.22)]",
        "transition-transform duration-300 hover:scale-[1.02]"
      )}
    >
      <div className="relative w-full h-full rounded-[0.7cqw] overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="30vw"
          className="object-cover"
        />
      </div>
    </div>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-label="Jewellery box. Hover, tap or press Enter to open."
      data-open={isOpen}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") handleStateChange(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") handleStateChange(false);
      }}
      onClick={() => {
        handleStateChange(!isOpen);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        // Sizing & Container Query Anchor
        "group/box relative w-full [container-type:inline-size] select-none cursor-pointer outline-none",
        // Proportional aspect-ratio based on enlarged 64cqw tray geometry
        "aspect-[1/1.25]",
        // Accessibility focus ring in brand olive
        "focus-visible:ring-2 focus-visible:ring-[#556B2F] focus-visible:ring-offset-4 ring-offset-[#F6F0E2] rounded-2xl",
        className
      )}
    >
      {/* 3D Scene Viewport Centered within reserved container */}
      <div className="relative w-full h-full flex items-center justify-center [perspective:1500px]">
        {/*
          SLIDING BOX ASSEMBLY:
          When closed, sits centered. When open, slides down by 34cqw so the open lid
          (which flips up and back by ~58cqw) and the base tray together stay perfectly centered.
        */}
        <div
          className={cn(
            "relative w-full max-w-[100cqw] transition-transform duration-[1100ms] ease-[cubic-bezier(.65,0,.25,1)]",
            "motion-reduce:transition-none motion-reduce:transform-none",
            isOpen ? "translate-y-[34cqw]" : "translate-y-[0cqw]"
          )}
        >
          {/* ============================================================== */}
          {/* 1. LOWER TRAY / BASE BOX (Ivory velvet interior + single hero) */}
          {/* ============================================================== */}
          <div
            className={cn(
              "relative w-full h-[64cqw] rounded-[1.6cqw] overflow-hidden shadow-[0_24px_60px_rgba(26,26,26,0.30)]",
              // Exterior olive case bevel
              "bg-gradient-to-b from-[#556B2F] via-[#45561F] to-[#2E3A14]",
              "border border-[#364318]"
            )}
          >
            {/* Front Wall Lip Depth with ivory accent stripe */}
            <div className="absolute bottom-0 inset-x-0 h-[4.5cqw] bg-gradient-to-t from-[#1F2A0E] to-[#3B4A1B] border-t border-[#6E8740]/60 flex items-center px-[3cqw] z-20">
              <div className="w-full h-[0.35cqw] bg-[#F6F0E2]/80 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </div>

            {/* Recessed Ivory Velvet Tray Interior */}
            <div className="absolute inset-[1.6cqw] bottom-[4.6cqw] rounded-[1.2cqw] bg-gradient-to-b from-[#EFE7D3] via-[#F6F0E2] to-[#E9E2CC] border border-[#DCD3B8] shadow-[inset_0_4px_16px_rgba(26,26,26,0.18)] p-[2.2cqw] overflow-hidden flex items-center justify-center">
              {/* Velvet noise subtle overlay */}
              <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage:
                    "radial-gradient(#556B2F 0.75px, transparent 0.75px), radial-gradient(#556B2F 0.75px, transparent 0.75px)",
                  backgroundSize: "8px 8px",
                  backgroundPosition: "0 0, 4px 4px",
                }}
              />

              {/* TRAY CONTENT: Single Large Hero Product Slot */}
              <div
                className={cn(
                  "relative z-10 h-[98%] aspect-square self-center flex items-center justify-center transition-all ease-[cubic-bezier(0.16,1,0.3,1)]",
                  isOpen
                    ? "opacity-100 translate-y-0 duration-700 delay-[650ms] pointer-events-auto"
                    : "opacity-0 translate-y-[2.5cqw] duration-150 delay-0 pointer-events-none",
                  "motion-reduce:transition-opacity motion-reduce:delay-0 motion-reduce:duration-150 motion-reduce:transform-none"
                )}
              >
                {image.href ? (
                  <Link
                    href={image.href}
                    className="block w-full h-full outline-none focus-visible:ring-2 focus-visible:ring-[#556B2F] rounded-[1.2cqw]"
                    onClick={(e) => {
                      if (!isOpen) e.preventDefault();
                      e.stopPropagation();
                    }}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {cardNode}
                  </Link>
                ) : (
                  cardNode
                )}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 2. THE 3D ROTATING LID (Hinged at top edge, flips up & back)  */}
          {/* ============================================================== */}
          <div
            className={cn(
              "absolute top-0 left-0 w-full h-[64cqw] origin-top [transform-style:preserve-3d]",
              "transition-transform duration-[1100ms] ease-[cubic-bezier(.65,0,.25,1)]",
              isTransitioning && "will-change-transform",
              // Reduced motion override: No 3D flip, lid cross-fades out in 150ms
              "motion-reduce:transition-opacity motion-reduce:duration-150 motion-reduce:transform-none",
              isOpen
                ? "[transform:rotateX(-176deg)] motion-reduce:opacity-0 motion-reduce:pointer-events-none"
                : "[transform:rotateX(0deg)] motion-reduce:opacity-100"
            )}
          >
            {/* ------------------------------------------------------------ */}
            {/* FACE A: CLOSED LID EXTERIOR (Shown when box is closed)      */}
            {/* ------------------------------------------------------------ */}
            <div
              className={cn(
                "absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[1.6cqw] overflow-hidden",
                // Olive green lid gradient
                "bg-gradient-to-br from-[#6E8740] via-[#556B2F] to-[#364318]",
                "border border-[#7E9A4C] shadow-[0_16px_40px_rgba(26,26,26,0.35)]"
              )}
            >
              {/* Front Lip Bottom Thickness Accent */}
              <div className="absolute bottom-0 inset-x-0 h-[4.2cqw] bg-gradient-to-t from-[#243010] to-[#45561F] border-t border-[#7E9A4C]/70 flex items-center px-[3cqw] z-10">
                <div className="w-full h-[0.35cqw] bg-[#F6F0E2]/80 rounded-full" />
              </div>

              {/* Concave (Notched) Corners Inner Ivory Frame */}
              <svg
                className="absolute inset-[2.4cqw] bottom-[5.8cqw] w-[calc(100%-4.8cqw)] h-[calc(100%-8.2cqw)] pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 6 0 L 94 0 A 6 6 0 0 0 100 6 L 100 94 A 6 6 0 0 0 94 100 L 6 100 A 6 6 0 0 0 0 94 L 0 6 A 6 6 0 0 0 6 0 Z"
                  fill="none"
                  stroke="#F6F0E2"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Top Meta Line: Number (Left) & Circled Monogram (Right) */}
              <div className="absolute top-[4.6cqw] inset-x-[5.2cqw] flex items-center justify-between">
                <span className="font-sans text-[max(9px,2.3cqw)] tracking-[0.25em] text-[#F6F0E2] uppercase font-medium">
                  {number}
                </span>

                <div className="w-[6.2cqw] h-[6.2cqw] min-w-[24px] min-h-[24px] rounded-full border border-[#F6F0E2] text-[#F6F0E2] flex items-center justify-center font-serif text-[max(11px,2.9cqw)] font-semibold">
                  {monogram}
                </div>
              </div>

              {/* Center / Left Brand Hierarchy */}
              <div className="absolute top-[19cqw] left-[5.2cqw] pr-[18cqw]">
                {/* Large Title */}
                <h2 className="font-serif text-[clamp(17px,7.8cqw,36px)] font-semibold text-[#F6F0E2] tracking-tight leading-none drop-shadow-sm">
                  {title}
                </h2>

                {/* Short burnt orange underline */}
                <div className="w-[12cqw] h-[0.38cqw] min-h-[2px] bg-[#CC5500] rounded-full mt-[1.8cqw]" />

                {/* Subtitle */}
                <p className="text-[max(9px,2.4cqw)] text-[#F6F0E2]/90 tracking-wide font-light mt-[1.6cqw]">
                  {subtitle}
                </p>
              </div>

              {/* Bottom-Right Lotus Motif */}
              <div className="absolute bottom-[7cqw] right-[4.8cqw] w-[18cqw] h-[15cqw] pointer-events-none">
                <LotusMotif className="w-full h-full text-[#F6F0E2] opacity-80 drop-shadow-sm" />
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* FACE B: INSIDE LID PANEL (Visible when lid flips up & back) */}
            {/* ------------------------------------------------------------ */}
            <div
              className={cn(
                "absolute inset-0 w-full h-full rounded-[1.6cqw] overflow-hidden",
                // Pre-rotated by 180deg so text reads upright when lid is flipped backward
                "[backface-visibility:hidden] [transform:rotateX(180deg)]",
                // Olive outer rim
                "bg-[#45561F] border border-[#364318] shadow-[0_-12px_36px_rgba(26,26,26,0.30)]",
                "p-[1.8cqw]"
              )}
            >
              {/* Ivory Velvet Inner Liner */}
              <div className="relative w-full h-full rounded-[1.2cqw] bg-gradient-to-b from-[#F6F0E2] via-[#FCFAF4] to-[#EFE7D3] border border-[#DCD3B8] shadow-[inset_0_4px_16px_rgba(26,26,26,0.12)] flex flex-col items-center justify-center text-center p-[4cqw]">
                {/* Velvet fine texture overlay */}
                <div
                  className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "radial-gradient(#556B2F 0.75px, transparent 0.75px), radial-gradient(#556B2F 0.75px, transparent 0.75px)",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 4px 4px",
                  }}
                />

                {/* Tagline Between Two Thin Decorative Lines */}
                <div className="relative z-10 flex items-center justify-center gap-[2.5cqw] w-full max-w-[80%]">
                  <div className="flex-1 h-[1px] bg-[#556B2F]/35" />
                  <span className="font-serif text-[clamp(10px,2.8cqw,13px)] tracking-[0.2em] font-semibold uppercase text-[#556B2F] whitespace-nowrap">
                    {tagline}
                  </span>
                  <div className="flex-1 h-[1px] bg-[#556B2F]/35" />
                </div>

                {/* Small 4-Point Star Sparkle Below */}
                <div className="relative z-10 mt-[2cqw] text-[#CC5500] text-[max(10px,2.6cqw)] select-none">
                  ✦
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JewelleryBox;

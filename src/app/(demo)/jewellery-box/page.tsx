import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { JewelleryBox } from "@/components/jewellery-box/JewelleryBox";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Interactive Jewellery Gift Box Experience",
  description:
    "Experience our artisanal hover-to-open 3D jewellery gift boxes showcasing single hero masterpieces with large physical presentation trays.",
  path: "/jewellery-box",
});

export default function JewelleryBoxDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDFD] via-[#FAF3F2] to-[#FFFDFD] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      {/* Editorial Header */}
      <div className="max-w-4xl mx-auto text-center mb-16 sm:mb-20 space-y-4">
        <div className="inline-block">
          <span className="text-[11px] uppercase font-mono tracking-[0.25em] text-[#556B2F] bg-[#E9E2CC] border border-[#556B2F]/30 px-4 py-1.5 rounded-full font-semibold shadow-sm inline-block">
            Atelier Unboxing Experience
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-[#1A1A1A] font-semibold tracking-tight">
          The Art of the Presentation
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed font-light">
          Hover with your mouse, tap on touch devices, or press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-100 border border-stone-300 rounded text-stone-800">Enter</kbd> to unlock the bespoke velvet jewellery tray and reveal the hero piece within.
        </p>

        <div className="flex items-center justify-center gap-6 text-[11px] font-mono text-stone-500 uppercase tracking-widest pt-2">
          <span>&bull; Smooth 3D Flip</span>
          <span>&bull; Enlarged 64cqw Tray</span>
          <span>&bull; 1:1 Square White Mat</span>
        </div>
      </div>

      {/* Responsive Grid of 3 Gift Boxes (min-w 300px, gap-9) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-9 items-start">
        {/* BOX 1: Polki Pair */}
        <div className="flex flex-col items-center w-full min-w-[300px]">
          <div className="w-full">
            <JewelleryBox
              number="NO. 01"
              title="Polki Pair"
              monogram="P"
              tagline="Timeless Elegance"
              image={{
                src: "/products/polki-jhumka.webp",
                alt: "Polki jhumka earrings",
                href: "/collections/polki",
              }}
            />
          </div>
          <div className="text-center mt-3 space-y-1">
            <h3 className="font-serif text-sm font-medium text-[#1A1A1A]">
              Polki Pair
            </h3>
            <p className="text-[11px] text-stone-500">
              Handcrafted 22K Jadau Jhumkas
            </p>
          </div>
        </div>

        {/* BOX 2: Solitaire */}
        <div className="flex flex-col items-center w-full min-w-[300px]">
          <div className="w-full">
            <JewelleryBox
              number="NO. 02"
              title="Solitaire"
              monogram="S"
              tagline="Quiet Brilliance"
              image={{
                src: "/products/polki-drop.webp",
                alt: "Polki drop earring",
                href: "/collections/solitaire",
              }}
            />
          </div>
          <div className="text-center mt-3 space-y-1">
            <h3 className="font-serif text-sm font-medium text-[#1A1A1A]">
              Solitaire
            </h3>
            <p className="text-[11px] text-stone-500">
              Certified Natural Solitaire Drop
            </p>
          </div>
        </div>

        {/* BOX 3: Brooch */}
        <div className="flex flex-col items-center w-full min-w-[300px]">
          <div className="w-full">
            <JewelleryBox
              number="NO. 03"
              title="Brooch"
              monogram="B"
              tagline="Garden of Gems"
              image={{
                src: "/products/emerald-brooch.webp",
                alt: "Emerald aur ruby flower brooch",
                href: "/collections/brooches",
              }}
            />
          </div>
          <div className="text-center mt-3 space-y-1">
            <h3 className="font-serif text-sm font-medium text-[#1A1A1A]">
              Brooch
            </h3>
            <p className="text-[11px] text-stone-500">
              Emerald & Ruby Floral Statement
            </p>
          </div>
        </div>
      </div>

      {/* Return to Storefront CTA */}
      <div className="max-w-md mx-auto text-center mt-20 pt-8 border-t border-stone-200">
        <Link
          href="/"
          className="btn-gold inline-flex items-center justify-center gap-2 text-xs py-3.5 px-6 rounded shadow-sm"
        >
          <span>&larr; Return to Storefront Catalogue</span>
        </Link>
      </div>
    </div>
  );
}

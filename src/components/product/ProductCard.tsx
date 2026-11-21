"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { PublicProductDto, PublicVariantDto } from "@/lib/types";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { useCart } from "@/components/cart/CartContext";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { MetalSwatch } from "../common/MetalSwatch";
import { cardPrice, variantHref } from "@/lib/variants";
import { Heart, Check } from "lucide-react";

export interface ProductCardProps {
  product: PublicProductDto;
  /** Base path for the product link, defaults to /products. */
  basePath?: string;
  /** Variant to price and link from (e.g. the cheapest match after filtering). */
  variant?: PublicVariantDto;
  /** Explicit link target; overrides basePath + slug. */
  href?: string;
}

/** One badge at most: the single most useful fact about availability. */
export function productBadge(product: PublicProductDto, variant?: PublicVariantDto): { label: string; tone: "olive" | "orange" | "charcoal" } | null {
  const v = variant || product.defaultVariant;
  const p = v.policy;
  if (p.isOutOfStock) return { label: "Sold out", tone: "charcoal" };
  if (product.isBestSeller) return { label: "Bestseller", tone: "orange" };
  if (p.requiresEnquiry) return { label: "Enquire", tone: "olive" };
  if (v.isReadyToShip) return { label: "Ready to ship", tone: "olive" };
  return null;
}

function ProductCardComponent({ product, basePath = "/products", variant, href }: ProductCardProps) {
  const { isInWishlist, toggle } = useWishlist();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const isWishlisted = isInWishlist(product.id);

  const primaryImage = product.media.find((m) => m.isPrimary) || product.media[0];
  const hoverImage = product.media.find((m) => m.isHoverImage) || product.media[1];

  const price = cardPrice(product, variant ? [variant] : undefined);
  const shown = variant || price.variant;
  const link = href || `${basePath}/${product.slug}`;
  const badge = productBadge(product, shown);
  const colours = product.options.colours;
  const canQuickAdd = shown.policy.canPurchase && Boolean(shown.pricePaise) && !price.isFrom;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canQuickAdd || !shown.pricePaise) return;
    addItem({
      variantId: shown.id,
      sku: shown.sku,
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      metalType: shown.metalType,
      size: shown.size,
      purity: shown.purity,
      imageUrl: primaryImage?.url,
      unitPricePaise: shown.pricePaise,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Link
          href={link}
          className="relative block aspect-square w-full overflow-hidden tile-product focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600"
          tabIndex={-1}
          aria-hidden="true"
        >
          {primaryImage ? (
            <>
              <ImageWithFallback
                src={primaryImage.url}
                alt=""
                fallbackTitle={product.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover object-center ${hoverImage ? "transition-opacity duration-500 ease-out group-hover:opacity-0" : "img-zoom"}`}
              />
              {hoverImage && (
                <ImageWithFallback
                  src={hoverImage.url}
                  alt=""
                  fallbackTitle={product.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover object-center transition-opacity duration-500 ease-out opacity-0 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-charcoal-500">Photo coming soon</div>
          )}
        </Link>

        {badge && (
          <span
            className={`absolute top-3 left-3 z-10 px-2 py-[3px] text-[10px] font-medium ${
              badge.tone === "orange"
                ? "bg-orange-500 text-white"
                : badge.tone === "charcoal"
                  ? "bg-charcoal-950 text-white"
                  : "bg-white/95 text-olive-800"
            }`}
          >
            {badge.label}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(product.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWishlisted}
          className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center text-charcoal-700 hover:text-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 active:scale-95 transition-colors"
        >
          <Heart className={`w-[18px] h-[18px] ${isWishlisted ? "fill-orange-500 text-orange-500" : "stroke-[1.5]"}`} />
        </button>

        {/* Quick add rides on the photo so the caption below stays clean.
            Pointer devices only: on touch the whole card opens the piece. */}
        {canQuickAdd && (
          <div className="hidden lg:block absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 transition-all duration-300 ease-out">
            <button
              type="button"
              onClick={quickAdd}
              aria-label={added ? "Added to bag" : `Add ${product.title} to bag`}
              className={`w-full py-3 text-xs tracking-[0.14em] uppercase font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ivory-100 ${
                added ? "bg-olive-600 text-ivory-50" : "bg-charcoal-950/90 text-ivory-50 hover:bg-olive-700"
              }`}
            >
              {added ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Added
                </span>
              ) : (
                "Add to bag"
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3.5">
        {/* Reserve two lines so prices sit on a common baseline across the row */}
        <h3 className="text-sm text-charcoal-900 leading-snug line-clamp-2 sm:min-h-[2.6em]">
          <Link href={link} className="hover:text-olive-700 transition-colors focus:outline-none focus-visible:underline">
            {product.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-[15px] font-medium text-charcoal-950 tabular-nums leading-tight">
          {price.label}
          {shown.formattedCompareAtPrice && (
            <span className="ml-2 text-xs font-normal text-charcoal-400 line-through">{shown.formattedCompareAtPrice}</span>
          )}
        </p>
        {shown.offerLabel && <p className="mt-0.5 text-[11px] text-orange-600">{shown.offerLabel}</p>}
        {colours.length > 1 && (
          <div className="mt-2 flex items-center gap-1.5" aria-label="Available metal colours">
            {colours.map((c) => {
              const v = product.variants.find((x) => x.metalColour === c) || shown;
              return (
                <Link
                  key={c}
                  href={variantHref(product, v, basePath)}
                  aria-label={`${product.title} in ${c}`}
                  className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600"
                >
                  <MetalSwatch colour={c} size={12} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardComponent);

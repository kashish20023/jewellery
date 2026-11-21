"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicProductDto, PublicOfferDto, PublicVariantDto } from "@/lib/types";
import { initialVariant, mediaForVariant } from "@/lib/variants";
import { ProductGallery } from "./ProductGallery";
import { ProductDetails } from "./ProductDetails";

export interface ProductStageProps {
  product: PublicProductDto;
  offers: PublicOfferDto[];
  /** `?variant=SKU` from the URL; stale or archived references fall back to the default. */
  initialVariantRef?: string | null;
}

/**
 * Owns the single source of truth for the selected variant on a product page.
 * Gallery and purchase controls read the same state; the URL mirrors it so a
 * link to a configured piece can be shared.
 */
export function ProductStage({ product, offers, initialVariantRef }: ProductStageProps) {
  const [variant, setVariant] = useState<PublicVariantDto>(() => initialVariant(product, initialVariantRef));

  // Keep ?variant= in sync without a navigation or reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("variant") === variant.sku) return;
    url.searchParams.set("variant", variant.sku);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [variant.sku]);

  const media = useMemo(() => mediaForVariant(product, variant.id), [product, variant.id]);
  const onVariantChange = useCallback((v: PublicVariantDto) => setVariant(v), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
      <div className="lg:col-span-7">
        <ProductGallery media={media} productTitle={product.title} variantKey={media[0]?.id || variant.id} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-24">
        <ProductDetails product={product} offers={offers} variant={variant} onVariantChange={onVariantChange} />
      </div>
    </div>
  );
}

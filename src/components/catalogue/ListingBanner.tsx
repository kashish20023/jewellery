import React from "react";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";

export interface ListingBannerProps {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  /** Rendered above the title, e.g. a breadcrumb trail. */
  eyebrow?: React.ReactNode;
  /** Shown under the description, e.g. "12 pieces". */
  meta?: string;
  /** Priority-load the photograph (use on the page's first banner). */
  priority?: boolean;
}

/**
 * Banner for a collection or category listing.
 *
 * Deliberately the same asymmetric ivory/photograph split as the homepage
 * hero, just shorter — a listing page should read as part of the same system
 * rather than introduce a second header pattern. Text sits on the ivory panel
 * instead of over the photograph, so no dark scrim is needed and the piece
 * stays fully visible.
 */
export function ListingBanner({ title, description, imageUrl, eyebrow, meta, priority }: ListingBannerProps) {
  return (
    <section className="bg-ivory-100">
      <div className="grid lg:grid-cols-12 lg:min-h-[21rem]">
        {imageUrl && (
          <div className="relative order-1 lg:order-2 lg:col-span-7 aspect-[16/10] sm:aspect-[21/9] lg:aspect-auto overflow-hidden">
            <ImageWithFallback
              src={imageUrl}
              alt={title}
              fallbackTitle={title}
              fill
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover object-center"
            />
          </div>
        )}

        <div
          className={`order-2 lg:order-1 flex items-center ${imageUrl ? "lg:col-span-5" : "lg:col-span-12"}`}
        >
          <div className="w-full px-5 sm:px-10 lg:pl-[max(2rem,calc((100vw-88rem)/2+2rem))] lg:pr-16 py-10 sm:py-14">
            {eyebrow && <div className="mb-4">{eyebrow}</div>}
            <h1 className="display-lg text-charcoal-950">{title}</h1>
            {description && <p className="lede mt-4 text-charcoal-700">{description}</p>}
            {meta && <p className="meta mt-5 text-charcoal-500">{meta}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

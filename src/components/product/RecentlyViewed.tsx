"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import type { PublicProductDto } from "@/lib/types";

const KEY = "chudiwalas:recently-viewed";
const MAX = 8;

interface Entry {
  slug: string;
  title: string;
  image?: string | null;
  price: string;
  metal: string;
}

function read(): Entry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Entry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Records the current product and renders the previously viewed ones.
 * Guest-only, localStorage, never sent to the server.
 */
export function RecentlyViewed({ current }: { current: PublicProductDto }) {
  const [items, setItems] = useState<Entry[]>([]);

  useEffect(() => {
    const existing = read().filter((e) => e.slug !== current.slug);
    setItems(existing.slice(0, MAX));
    const next: Entry[] = [
      {
        slug: current.slug,
        title: current.title,
        image: current.media[0]?.url ?? null,
        price: current.defaultVariant.formattedPrice,
        metal: current.defaultVariant.metalType,
      },
      ...existing,
    ].slice(0, MAX);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: the feature simply does not persist.
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="mt-20 pt-12 border-t border-ivory-400" aria-labelledby="recently-viewed-heading">
      <div className="flex items-end justify-between mb-6">
        <h2 id="recently-viewed-heading" className="text-2xl font-semibold text-charcoal-950">
          Recently viewed
        </h2>
        <Link href="/shop" className="text-[11px] uppercase tracking-[0.2em] text-olive-700 hover:text-orange-500 font-medium">
          Shop all
        </Link>
      </div>
      <div className="rail lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible">
        {items.map((e) => (
          <Link
            key={e.slug}
            href={`/products/${e.slug}`}
            className="group block w-[42vw] sm:w-[28vw] lg:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200 border border-ivory-300 group-hover:border-olive-400 transition-colors">
              {e.image && (
                <ImageWithFallback
                  src={e.image}
                  alt={e.title}
                  fallbackTitle={e.title}
                  fill
                  sizes="(max-width: 1024px) 42vw, 16vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-charcoal-950 line-clamp-1">{e.title}</p>
            <p className="text-[11px] text-charcoal-600">{e.price}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

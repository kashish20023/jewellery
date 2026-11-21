"use client";

import React from "react";
import Link from "next/link";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import type { PublicProductDto } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Heart, ArrowRight, Trash2 } from "lucide-react";

export default function WishlistPage() {
  const { wishlist, clear, isHydrated } = useWishlist();
  const [savedProducts, setSavedProducts] = React.useState<PublicProductDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Saved ids resolve through the public lookup API, so wishlist shows
  // database products too and no raw catalogue data ships in the bundle.
  React.useEffect(() => {
    if (!isHydrated) return;
    if (wishlist.length === 0) {
      setSavedProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/products/lookup?ids=${encodeURIComponent(wishlist.join(","))}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => {
        if (!cancelled) setSavedProducts(d.products || []);
      })
      .catch(() => {
        if (!cancelled) setSavedProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, wishlist]);

  if (!isHydrated || loading) {
    return (
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="w-12 h-12 bg-ivory-tile rounded-full mx-auto" />
          <div className="h-4 bg-ivory-tile max-w-xs mx-auto rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 bg-white">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-charcoal-950 tracking-tight">Wishlist</h1>
          <p className="mt-2 text-sm text-charcoal-600">
            Saved on this device. {savedProducts.length} {savedProducts.length === 1 ? "piece" : "pieces"}.
          </p>
        </div>
        {savedProducts.length > 0 && (
          <button type="button" onClick={clear} className="text-sm text-charcoal-600 hover:text-red-700 transition-colors flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {savedProducts.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
          {savedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-ivory-tile rounded-xl p-14 text-center max-w-xl mx-auto my-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-white flex items-center justify-center text-olive-600 mb-4">
            <Heart className="w-7 h-7 stroke-[1.25]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-charcoal-950">Your wishlist is empty</h2>
          <p className="text-sm text-charcoal-600 mt-2 max-w-sm mx-auto leading-relaxed">
            Tap the heart on any piece to save it here for easy comparison later.
          </p>
          <Link href="/shop" className="btn-gold inline-flex items-center gap-2 mt-7 px-6 py-3.5">
            Shop jewellery <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </main>
  );
}

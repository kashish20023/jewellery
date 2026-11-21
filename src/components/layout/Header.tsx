"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { useCart } from "@/components/cart/CartContext";
import { Menu, X, Heart, ShoppingBag, Search } from "lucide-react";

const CATEGORY_LINKS = [
  { label: "Chokers", href: "/shop?category=chokers" },
  { label: "Necklaces", href: "/shop?category=necklaces" },
  { label: "Earrings", href: "/shop?category=earrings" },
  { label: "Rings", href: "/shop?category=rings" },
  { label: "Bracelets", href: "/shop?category=bracelets" },
  { label: "Bridal", href: "/collections/bridal-connoisseur" },
  { label: "Ready to ship", href: "/shop?availability=ready" },
  { label: "New in", href: "/shop?sort=newest" },
];

const MORE_LINKS = [
  { label: "All jewellery", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Our story", href: "/about" },
  { label: "Book a consultation", href: "/consultation" },
  { label: "FAQs", href: "/faqs" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const { itemCount: cartCount, openCart } = useCart();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setOpen(false);
  };

  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return true;
    return typeof window !== "undefined" && window.location.search.includes(query);
  };

  const searchForm = (extra = "") => (
    <form role="search" onSubmit={submitSearch} className={`flex items-center gap-2 border border-charcoal-200 rounded-full bg-white px-4 h-11 ${extra}`}>
      <Search className="w-4 h-4 text-charcoal-400 shrink-0" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search jewellery, e.g. polki choker"
        aria-label="Search jewellery"
        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-charcoal-400 min-w-0"
      />
    </form>
  );

  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to primary content
      </a>

      {/* Thin announcement bar: the only olive block above the fold */}
      <div className="bg-olive-600 text-ivory-50 text-[11px] tracking-[0.12em] uppercase py-2 px-4 text-center">
        BIS hallmarked · Certified stones · Insured delivery across India
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-charcoal-100">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1: menu / logo / search / icons */}
          <div className="h-16 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-label="Open menu"
              className="lg:hidden w-11 h-11 -ml-2 flex items-center justify-center text-charcoal-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600"
            >
              <Menu className="w-6 h-6 stroke-[1.5]" />
            </button>

            <Link href="/" aria-label="Chudiwalas, home" className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
              <Image src="/brand/wordmark-black.png" alt="Chudiwalas" width={2097} height={225} priority className="h-[20px] sm:h-[24px] w-auto" />
            </Link>

            <div className="hidden lg:block flex-1 max-w-xl mx-auto">{searchForm()}</div>

            <div className="ml-auto flex items-center gap-1">
              <Link href="/wishlist" aria-label={`Wishlist, ${wishlistCount} items`} className="relative w-11 h-11 flex items-center justify-center text-charcoal-900 hover:text-olive-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
                <Heart className="w-5 h-5 stroke-[1.5]" />
                {wishlistCount > 0 && <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center tabular-nums">{wishlistCount}</span>}
              </Link>
              <button type="button" onClick={openCart} aria-label={`Bag, ${cartCount} items`} className="relative w-11 h-11 flex items-center justify-center text-charcoal-900 hover:text-olive-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                {cartCount > 0 && <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center tabular-nums">{cartCount}</span>}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="lg:hidden pb-3">{searchForm()}</div>

          {/* Row 2: category row (desktop) */}
          <nav aria-label="Categories" className="hidden lg:flex items-center justify-center gap-7 h-11 border-t border-charcoal-100">
            {CATEGORY_LINKS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={`text-[13px] font-medium transition-colors ${isActive(c.href) ? "text-olive-700" : "text-charcoal-800 hover:text-olive-700"}`}
              >
                {c.label}
              </Link>
            ))}
            <Link href="/consultation" className="text-[13px] font-medium text-charcoal-800 hover:text-olive-700">
              Consultation
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-charcoal-950/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-xs bg-white h-full p-5 flex flex-col overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-4 border-b border-charcoal-100">
              <Image src="/brand/wordmark-black.png" alt="Chudiwalas" width={2097} height={225} className="h-[18px] w-auto" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="w-11 h-11 flex items-center justify-center text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-5 text-[11px] text-charcoal-500 font-medium">Shop</p>
            <nav className="mt-2 flex flex-col" aria-label="Categories">
              {CATEGORY_LINKS.map((c) => (
                <Link key={c.href} href={c.href} className="py-3 text-base text-charcoal-900 border-b border-charcoal-100">
                  {c.label}
                </Link>
              ))}
            </nav>
            <p className="mt-5 text-[11px] text-charcoal-500 font-medium">More</p>
            <nav className="mt-2 flex flex-col" aria-label="More">
              {MORE_LINKS.map((c) => (
                <Link key={c.href} href={c.href} className="py-3 text-base text-charcoal-900 border-b border-charcoal-100">
                  {c.label}
                </Link>
              ))}
              <Link href="/wishlist" className="py-3 text-base text-charcoal-900 border-b border-charcoal-100 flex items-center justify-between">
                Wishlist {wishlistCount > 0 && <span className="text-xs text-orange-600 tabular-nums">{wishlistCount}</span>}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { useCart } from "@/components/cart/CartContext";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import type { NavCollection } from "@/lib/navigation";
import type { CategoryDefinition } from "@/lib/categories";
import { Menu, X, Heart, ShoppingBag, Search, ChevronDown, ChevronRight } from "lucide-react";

const WORDMARK_BLACK =
  "https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/site/brand/wordmark-black.png";

/**
 * Promotional links that sit beside the two data-driven menus. Kept short on
 * purpose: Indian fine-jewellery storefronts put one or two merchandising
 * entry points next to the category and collection menus, not a dozen.
 */
const PROMO_LINKS = [
  { label: "New in", href: "/shop?sort=newest" },
  { label: "Ready to ship", href: "/shop?availability=ready" },
  { label: "Consultation", href: "/consultation" },
];

const MORE_LINKS = [
  { label: "Our story", href: "/about" },
  { label: "Book a consultation", href: "/consultation" },
  { label: "FAQs", href: "/faqs" },
];

type MenuKey = "category" | "collections";

export interface HeaderProps {
  categories: CategoryDefinition[];
  collections: NavCollection[];
}

export function Header({ categories, collections }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [drawerSection, setDrawerSection] = useState<MenuKey | null>("category");
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const { itemCount: cartCount, openCart } = useCart();

  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  /** Hover intent: a short grace period so the pointer can cross the gap. */
  const hoverOpen = useCallback((key: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu(key);
  }, []);

  const hoverClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenu(null), 140);
  }, []);

  /** Tabbing out of the nav region closes whatever panel was open. */
  const onNavBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!navRef.current) return;
    if (e.relatedTarget instanceof Node && navRef.current.contains(e.relatedTarget)) return;
    setMenu(null);
  };

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

  /** Desktop trigger for one of the two mega menus. */
  const menuTrigger = (key: MenuKey, label: string) => {
    const expanded = menu === key;
    return (
      <button
        type="button"
        aria-expanded={expanded}
        aria-haspopup="true"
        aria-controls={`nav-panel-${key}`}
        onClick={() => setMenu(expanded ? null : key)}
        onMouseEnter={() => hoverOpen(key)}
        onFocus={() => hoverOpen(key)}
        className={`inline-flex items-center gap-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 ${
          expanded ? "text-olive-700" : "text-charcoal-800 hover:text-olive-700"
        }`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 stroke-[2] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    );
  };

  /** A mega-menu tile: photograph over label, as on the homepage grid. */
  const tile = (href: string, title: string, image: string | null, caption?: string) => (
    <Link key={href} href={href} onClick={() => setMenu(null)} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
      {/* Decorative: the caption below is the link's accessible name */}
      <div className="relative aspect-[4/5] w-full overflow-hidden tile-product" aria-hidden="true">
        <ImageWithFallback
          src={image || ""}
          alt=""
          fallbackTitle={title}
          fill
          sizes="180px"
          className="object-cover object-center img-zoom"
        />
      </div>
      <p className="mt-2 text-[13px] font-medium text-charcoal-900 group-hover:text-olive-700 transition-colors">{title}</p>
      {caption && <p className="mt-0.5 text-[11px] text-charcoal-500 line-clamp-2">{caption}</p>}
    </Link>
  );

  const categoryPanel = (
    <div id="nav-panel-category" className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal-500 font-medium">Shop by category</p>
        <Link href="/shop" onClick={() => setMenu(null)} className="text-[12px] font-medium text-olive-700 hover:underline">
          All jewellery →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-4 xl:grid-cols-7 gap-4">
        {categories.map((c) => tile(`/shop?category=${c.slug}`, c.label, c.bannerImageUrl))}
      </div>
    </div>
  );

  const collectionsPanel = (
    <div id="nav-panel-collections" className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal-500 font-medium">Shop by collection</p>
        <Link href="/collections" onClick={() => setMenu(null)} className="text-[12px] font-medium text-olive-700 hover:underline">
          All collections →
        </Link>
      </div>
      {collections.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal-600">
          No collections are published yet.{" "}
          <Link href="/shop" onClick={() => setMenu(null)} className="text-olive-700 hover:underline">
            Browse all jewellery
          </Link>
          .
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-4 xl:grid-cols-5 gap-4">
          {collections.slice(0, 10).map((c) => tile(`/collections/${c.slug}`, c.title, c.bannerImageUrl))}
        </div>
      )}
    </div>
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
              <Image src={WORDMARK_BLACK} alt="Chudiwalas" width={2097} height={225} priority className="h-[20px] sm:h-[24px] w-auto" />
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
        </div>

        {/* Row 2: primary nav with the Category and Collections mega menus (desktop) */}
        <div ref={navRef} onBlur={onNavBlur} onMouseLeave={hoverClose} className="hidden lg:block border-t border-charcoal-100">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Primary" className="flex items-center justify-center gap-8 h-11">
              <Link
                href="/shop"
                onMouseEnter={hoverClose}
                className={`text-[13px] font-medium transition-colors ${isActive("/shop") ? "text-olive-700" : "text-charcoal-800 hover:text-olive-700"}`}
              >
                All jewellery
              </Link>
              {menuTrigger("category", "Category")}
              {menuTrigger("collections", "Collections")}
              {PROMO_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onMouseEnter={hoverClose}
                  className={`text-[13px] font-medium transition-colors ${isActive(l.href) ? "text-olive-700" : "text-charcoal-800 hover:text-olive-700"}`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/about"
                onMouseEnter={hoverClose}
                className={`text-[13px] font-medium transition-colors ${isActive("/about") ? "text-olive-700" : "text-charcoal-800 hover:text-olive-700"}`}
              >
                Our story
              </Link>
            </nav>
          </div>

          {/* Full-width dropdown panel, the house style on Indian jewellery storefronts */}
          {menu && (
            <div
              className="absolute left-0 right-0 bg-white border-t border-charcoal-100 border-b shadow-[0_18px_28px_-20px_rgba(20,20,20,0.35)]"
              onMouseEnter={() => hoverOpen(menu)}
            >
              {menu === "category" ? categoryPanel : collectionsPanel}
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-charcoal-950/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-xs bg-white h-full p-5 flex flex-col overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-4 border-b border-charcoal-100">
              <Image src={WORDMARK_BLACK} alt="Chudiwalas" width={2097} height={225} className="h-[18px] w-auto" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="w-11 h-11 flex items-center justify-center text-charcoal-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <Link href="/shop" className="mt-4 py-3 text-base font-medium text-charcoal-950 border-b border-charcoal-100">
              All jewellery
            </Link>

            {/* Accordion: Category */}
            <button
              type="button"
              aria-expanded={drawerSection === "category"}
              onClick={() => setDrawerSection(drawerSection === "category" ? null : "category")}
              className="py-3 flex items-center justify-between text-base font-medium text-charcoal-950 border-b border-charcoal-100"
            >
              Category
              <ChevronRight className={`w-4 h-4 transition-transform ${drawerSection === "category" ? "rotate-90" : ""}`} />
            </button>
            {drawerSection === "category" && (
              <nav className="flex flex-col bg-ivory-100/60" aria-label="Categories">
                {categories.map((c) => (
                  <Link key={c.slug} href={`/shop?category=${c.slug}`} className="py-2.5 pl-4 text-sm text-charcoal-800 border-b border-charcoal-100">
                    {c.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Accordion: Collections */}
            <button
              type="button"
              aria-expanded={drawerSection === "collections"}
              onClick={() => setDrawerSection(drawerSection === "collections" ? null : "collections")}
              className="py-3 flex items-center justify-between text-base font-medium text-charcoal-950 border-b border-charcoal-100"
            >
              Collections
              <ChevronRight className={`w-4 h-4 transition-transform ${drawerSection === "collections" ? "rotate-90" : ""}`} />
            </button>
            {drawerSection === "collections" && (
              <nav className="flex flex-col bg-ivory-100/60" aria-label="Collections">
                {collections.map((c) => (
                  <Link key={c.slug} href={`/collections/${c.slug}`} className="py-2.5 pl-4 text-sm text-charcoal-800 border-b border-charcoal-100">
                    {c.title}
                  </Link>
                ))}
                <Link href="/collections" className="py-2.5 pl-4 text-sm font-medium text-olive-700 border-b border-charcoal-100">
                  All collections
                </Link>
                {collections.length === 0 && <p className="py-2.5 pl-4 text-xs text-charcoal-500">No collections published yet.</p>}
              </nav>
            )}

            {PROMO_LINKS.filter((l) => l.href.startsWith("/shop")).map((l) => (
              <Link key={l.href} href={l.href} className="py-3 text-base text-charcoal-900 border-b border-charcoal-100">
                {l.label}
              </Link>
            ))}

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

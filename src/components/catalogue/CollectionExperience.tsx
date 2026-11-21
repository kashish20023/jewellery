"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PublicProductDto, PublicCollectionDto, PublicVariantDto } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { cardPrice, variantHref, isPublicEligible } from "@/lib/variants";
import {
  SlidersHorizontal,
  ChevronDown,
  Search,
  X,
  Check,
} from "lucide-react";

export interface CollectionExperienceProps {
  collection: PublicCollectionDto;
  initialProducts: PublicProductDto[];
  /** Where product links go. Defaults to the collection-scoped product route. */
  productBasePath?: string;
}

export function CollectionExperience({
  collection,
  initialProducts,
  productBasePath,
}: CollectionExperienceProps) {
  const basePath = productBasePath ?? `/collections/${collection.slug}/products`;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();


  // 1. UI State
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [gridCols, setGridCols] = useState<3 | 4 | 6>(4);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // 2. Filter & Sort State from URL or local
  const [inStockOnly, setInStockOnly] = useState(searchParams.get("inStock") === "true");
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>(searchParams.get("price") || "all");
  const [selectedColor, setSelectedColor] = useState<string>(searchParams.get("metal") || "all");
  const [selectedPurity, setSelectedPurity] = useState<string>(searchParams.get("purity") || "all");
  const [selectedAvailability, setSelectedAvailability] = useState<string>(searchParams.get("availability") || "all");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") || "featured");
  const [query, setQuery] = useState<string>(searchParams.get("q") || "");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sync URL params when filters change
  const updateUrlParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || value === "false" || value === "featured") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".filter-dropdown-container")) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Filter & Sort Logic
  /**
   * Per-variant matching: every variant-level filter (availability, stock,
   * colour, purity, price band) must be satisfied by the SAME eligible variant.
   * The card then prices from those matching variants, so counts, "From ₹…"
   * and sorting all agree with the filters.
   */
  const COLOUR_PARAM: Record<string, string> = {
    "yellow-gold": "Yellow Gold",
    "rose-gold": "Rose Gold",
    "white-gold": "White Gold",
    platinum: "Platinum",
  };

  const matchingVariants = (p: PublicProductDto): PublicVariantDto[] =>
    p.variants.filter((v) => {
      if (inStockOnly && !(v.stockQuantity > 0 || v.isMadeToOrder)) return false;
      if (selectedAvailability === "ready" && !v.isReadyToShip) return false;
      if (selectedAvailability === "made-to-order" && !v.isMadeToOrder) return false;
      if (selectedColor !== "all" && v.metalColour !== (COLOUR_PARAM[selectedColor] || "")) return false;
      if (selectedPurity !== "all" && v.purityLabel !== selectedPurity.toUpperCase()) return false;
      if (selectedPriceRange !== "all") {
        // A price band can only be matched by a public price; ON_REQUEST pieces never leak into a band.
        if (!isPublicEligible(v)) return false;
        const inr = Number(BigInt(v.pricePaise!)) / 100;
        if (selectedPriceRange === "under-50k" && !(inr > 0 && inr < 50000)) return false;
        if (selectedPriceRange === "50k-1l" && !(inr >= 50000 && inr <= 100000)) return false;
        if (selectedPriceRange === "above-1l" && !(inr > 100000)) return false;
      }
      return true;
    });

  const matchesCategory = (p: PublicProductDto) => {
    if (selectedCategory === "all") return true;
    if (p.category) return p.category === selectedCategory;
    const t = p.title.toLowerCase();
    if (selectedCategory === "rings") return t.includes("ring") || t.includes("band");
    if (selectedCategory === "chokers") return t.includes("choker");
    if (selectedCategory === "necklaces") return t.includes("necklace") || t.includes("pendant");
    if (selectedCategory === "earrings") return t.includes("earring") || t.includes("jhumka") || t.includes("drop");
    if (selectedCategory === "bracelets") return t.includes("bracelet") || t.includes("kada");
    return true;
  };

  const matchesQuery = (p: PublicProductDto) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.skuGroup.toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(q))
    );
  };

  const anyVariantFilter =
    inStockOnly || selectedAvailability !== "all" || selectedColor !== "all" || selectedPurity !== "all" || selectedPriceRange !== "all";

  const filteredEntries = useMemo(() => {
    const entries = initialProducts
      .filter((p) => matchesCategory(p) && matchesQuery(p))
      .map((p) => ({ product: p, matches: matchingVariants(p) }))
      .filter((e) => e.matches.length > 0)
      .map((e) => ({ ...e, price: cardPrice(e.product, e.matches) }));

    const paise = (e: (typeof entries)[number]) => (e.price.variant.pricePaise ? BigInt(e.price.variant.pricePaise) : null);
    if (sortBy === "price_asc" || sortBy === "price_desc") {
      entries.sort((a, b) => {
        const pa = paise(a);
        const pb = paise(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1; // price on request always last
        if (pb === null) return -1;
        const cmp = pa < pb ? -1 : pa > pb ? 1 : 0;
        return sortBy === "price_asc" ? cmp : -cmp;
      });
    } else if (sortBy === "newest") {
      entries.sort((a, b) => Number(b.product.isNewArrival) - Number(a.product.isNewArrival));
    }
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts, inStockOnly, selectedCategory, selectedPriceRange, selectedColor, selectedPurity, selectedAvailability, sortBy, query]);

  const filteredProducts = useMemo(() => filteredEntries.map((e) => e.product), [filteredEntries]);

  const hasActiveFilters =
    inStockOnly ||
    selectedCategory !== "all" ||
    selectedPriceRange !== "all" ||
    selectedColor !== "all" ||
    selectedPurity !== "all" ||
    selectedAvailability !== "all" ||
    query.trim() !== "";

  const clearAllFilters = () => {
    setInStockOnly(false);
    setSelectedCategory("all");
    setSelectedPriceRange("all");
    setSelectedColor("all");
    setSelectedPurity("all");
    setSelectedAvailability("all");
    setQuery("");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const getSortLabel = () => {
    if (sortBy === "price_asc") return "Price, low to high";
    if (sortBy === "price_desc") return "Price, high to low";
    if (sortBy === "newest") return "Newest";
    return "Featured";
  };

  const FILTER_LABELS = {
    availability: { ready: "Ready to ship", "made-to-order": "Made to order" } as Record<string, string>,
    category: {
      chokers: "Chokers",
      necklaces: "Necklaces & Pendants",
      rings: "Rings & Bands",
      earrings: "Earrings & Jhumkas",
      bracelets: "Bracelets & Kadas",
    } as Record<string, string>,
    price: { "under-50k": "Under ₹50,000", "50k-1l": "₹50,000 – ₹1,00,000", "above-1l": "Above ₹1,00,000" } as Record<string, string>,
    color: { "yellow-gold": "Yellow Gold", "rose-gold": "Rose Gold", "white-gold": "White Gold", platinum: "950 Platinum" } as Record<string, string>,
    purity: { "22k": "22K", "18k": "18K", "14k": "14K", "9k": "9K" } as Record<string, string>,
  };

  const activeChips: { key: string; label: string; clear: () => void }[] = [
    inStockOnly && {
      key: "inStock",
      label: "In stock only",
      clear: () => {
        setInStockOnly(false);
        updateUrlParam("inStock", null);
      },
    },
    selectedAvailability !== "all" && {
      key: "availability",
      label: FILTER_LABELS.availability[selectedAvailability] || selectedAvailability,
      clear: () => {
        setSelectedAvailability("all");
        updateUrlParam("availability", null);
      },
    },
    selectedCategory !== "all" && {
      key: "category",
      label: FILTER_LABELS.category[selectedCategory] || selectedCategory,
      clear: () => {
        setSelectedCategory("all");
        updateUrlParam("category", null);
      },
    },
    selectedPriceRange !== "all" && {
      key: "price",
      label: FILTER_LABELS.price[selectedPriceRange] || selectedPriceRange,
      clear: () => {
        setSelectedPriceRange("all");
        updateUrlParam("price", null);
      },
    },
    selectedColor !== "all" && {
      key: "color",
      label: FILTER_LABELS.color[selectedColor] || selectedColor,
      clear: () => {
        setSelectedColor("all");
        updateUrlParam("metal", null);
      },
    },
    selectedPurity !== "all" && {
      key: "purity",
      label: FILTER_LABELS.purity[selectedPurity] || selectedPurity.toUpperCase(),
      clear: () => {
        setSelectedPurity("all");
        updateUrlParam("purity", null);
      },
    },
    query.trim() !== "" && {
      key: "q",
      label: `“${query.trim()}”`,
      clear: () => {
        setQuery("");
        updateUrlParam("q", null);
      },
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="w-full space-y-6">
      {/* ============================================================== */}
      {/* 1. TOP HEADER BAR (Title count + Hide Filter + Grid + Sort)    */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-ivory-400">
        {/* The banner above already names the listing; this reports the live
            filtered count, which is the one thing the banner cannot show. */}
        <p className="text-sm text-charcoal-700" aria-live="polite">
          {filteredProducts.length === initialProducts.length
            ? `${filteredProducts.length} ${filteredProducts.length === 1 ? "piece" : "pieces"}`
            : `Showing ${filteredProducts.length} of ${initialProducts.length} pieces`}
        </p>

        {/* Right Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
          {/* Hide/Show Filter Button */}
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-800 hover:text-[#556B2F] font-normal transition-colors cursor-pointer select-none"
          >
            <span>{isFilterVisible ? "Hide Filter" : "Show Filter"}</span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#CC5500]" />
          </button>

          {/* Grid View Switchers (3, 4, 6 columns) */}
          <div className="hidden md:flex items-center gap-1.5 border-l border-ivory-400 pl-4">
            {/* 3-Column Switcher */}
            <button
              onClick={() => setGridCols(3)}
              title="3 Columns View"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                gridCols === 3 ? "text-charcoal-950 bg-ivory-200" : "text-charcoal-400 hover:text-charcoal-800"
              }`}
            >
              <svg width="15" height="14" viewBox="0 0 15 14" fill="currentColor">
                <rect x="1" y="1" width="3" height="12" rx="0.5" />
                <rect x="6" y="1" width="3" height="12" rx="0.5" />
                <rect x="11" y="1" width="3" height="12" rx="0.5" />
              </svg>
            </button>

            {/* 4-Column Switcher (Active Default in Screenshot) */}
            <button
              onClick={() => setGridCols(4)}
              title="4 Columns View"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                gridCols === 4 ? "text-charcoal-950 bg-ivory-200" : "text-charcoal-400 hover:text-charcoal-800"
              }`}
            >
              <svg width="17" height="14" viewBox="0 0 17 14" fill="currentColor">
                <rect x="1" y="1" width="2.6" height="12" rx="0.5" />
                <rect x="5.2" y="1" width="2.6" height="12" rx="0.5" />
                <rect x="9.4" y="1" width="2.6" height="12" rx="0.5" />
                <rect x="13.6" y="1" width="2.6" height="12" rx="0.5" />
              </svg>
            </button>

            {/* 6-Column Switcher */}
            <button
              onClick={() => setGridCols(6)}
              title="6 Columns View"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                gridCols === 6 ? "text-charcoal-950 bg-ivory-200" : "text-charcoal-400 hover:text-charcoal-800"
              }`}
            >
              <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor">
                <rect x="1" y="1" width="1.8" height="12" rx="0.4" />
                <rect x="4.4" y="1" width="1.8" height="12" rx="0.4" />
                <rect x="7.8" y="1" width="1.8" height="12" rx="0.4" />
                <rect x="11.2" y="1" width="1.8" height="12" rx="0.4" />
                <rect x="14.6" y="1" width="1.8" height="12" rx="0.4" />
                <rect x="18" y="1" width="1.8" height="12" rx="0.4" />
              </svg>
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="relative filter-dropdown-container border-l border-ivory-400 pl-4">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
              className="inline-flex items-center gap-1.5 text-xs text-charcoal-800 hover:text-charcoal-950 font-normal cursor-pointer"
            >
              <span className="text-charcoal-500">Sort by:</span>
              <span className="font-medium text-charcoal-950">{getSortLabel()}</span>
              <ChevronDown className="w-3 h-3 text-charcoal-500" />
            </button>

            {activeDropdown === "sort" && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-ivory-tile border border-ivory-400 rounded-md shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {[
                  { value: "featured", label: "Featured" },
                  { value: "price_asc", label: "Price, low to high" },
                  { value: "price_desc", label: "Price, high to low" },
                  { value: "newest", label: "Newest Arrivals" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      updateUrlParam("sort", opt.value);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-white ${
                      sortBy === opt.value ? "text-[#556B2F] font-semibold bg-white" : "text-charcoal-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.value && <Check className="w-3.5 h-3.5 text-[#556B2F]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scoped search (title, SKU, category) + mobile filter sheet trigger */}
      <div className="flex items-center gap-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            updateUrlParam("q", query.trim() || null);
          }}
          className="flex-1 flex items-center gap-2 border border-ivory-400 bg-ivory-tile rounded-md px-3 min-h-[44px]"
        >
          <Search className="w-4 h-4 text-charcoal-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, SKU or category"
            aria-label="Search this listing by name, SKU or category"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-charcoal-400 min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                updateUrlParam("q", null);
              }}
              aria-label="Clear search"
              className="p-1 text-charcoal-500 hover:text-charcoal-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="sm:hidden adm-btn-ghost min-h-[44px] whitespace-nowrap"
          aria-haspopup="dialog"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters{activeChips.length ? ` (${activeChips.length})` : ""}
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. HORIZONTAL FILTER BAR (Expandable / Collapsible)             */}
      {/* ============================================================== */}
      {isFilterVisible && (
        <div className="hidden sm:block border border-ivory-400 bg-ivory-tile rounded-lg px-4 py-3 shadow-xs transition-all duration-300">
          <div className="flex flex-wrap items-center gap-5 sm:gap-7">
            {/* In Stock Only Switch */}
            <label className="flex items-center gap-2.5 text-xs text-charcoal-900 cursor-pointer select-none">
              <span className="text-charcoal-800 font-normal">In stock only</span>
              <button
                type="button"
                role="switch"
                aria-checked={inStockOnly}
                onClick={() => {
                  const nextVal = !inStockOnly;
                  setInStockOnly(nextVal);
                  updateUrlParam("inStock", nextVal ? "true" : null);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  inStockOnly ? "bg-[#556B2F]" : "bg-ivory-tile0"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-ivory-tile shadow-sm ring-0 transition duration-200 ease-in-out ${
                    inStockOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </label>

            {/* Availability Dropdown */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "availability" ? null : "availability")}
                className={`inline-flex items-center gap-1.5 text-xs font-normal transition-colors ${
                  selectedAvailability !== "all" ? "text-[#556B2F] font-semibold" : "text-charcoal-800 hover:text-charcoal-950"
                }`}
              >
                <span>{selectedAvailability !== "all" ? `Availability: ${FILTER_LABELS.availability[selectedAvailability]}` : "Availability"}</span>
                <ChevronDown className="w-3 h-3 text-charcoal-400" />
              </button>
              {activeDropdown === "availability" && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-ivory-tile border border-ivory-400 rounded-md shadow-lg py-1 z-30">
                  {[
                    { value: "all", label: "All pieces" },
                    { value: "ready", label: "Ready to ship" },
                    { value: "made-to-order", label: "Made to order" },
                  ].map((a) => (
                    <button
                      key={a.value}
                      onClick={() => {
                        setSelectedAvailability(a.value);
                        updateUrlParam("availability", a.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-white ${
                        selectedAvailability === a.value ? "text-[#556B2F] font-semibold bg-white" : "text-charcoal-800"
                      }`}
                    >
                      <span>{a.label}</span>
                      {selectedAvailability === a.value && <Check className="w-3 h-3 text-[#556B2F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "category" ? null : "category")}
                className={`inline-flex items-center gap-1.5 text-xs font-normal transition-colors ${
                  selectedCategory !== "all" ? "text-[#556B2F] font-semibold" : "text-charcoal-800 hover:text-charcoal-950"
                }`}
              >
                <span>{selectedCategory !== "all" ? `Category: ${FILTER_LABELS.category[selectedCategory] || selectedCategory}` : "Category"}</span>
                <ChevronDown className="w-3 h-3 text-charcoal-400" />
              </button>

              {activeDropdown === "category" && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-ivory-tile border border-ivory-400 rounded-md shadow-lg py-1 z-30">
                  {[
                    { value: "all", label: "All Categories" },
                    { value: "chokers", label: "Chokers" },
                    { value: "necklaces", label: "Necklaces & Pendants" },
                    { value: "rings", label: "Rings & Bands" },
                    { value: "earrings", label: "Earrings & Jhumkas" },
                    { value: "bracelets", label: "Bracelets & Kadas" },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setSelectedCategory(cat.value);
                        updateUrlParam("category", cat.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-white ${
                        selectedCategory === cat.value ? "text-[#556B2F] font-semibold bg-white" : "text-charcoal-800"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {selectedCategory === cat.value && <Check className="w-3 h-3 text-[#556B2F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Dropdown */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "price" ? null : "price")}
                className={`inline-flex items-center gap-1.5 text-xs font-normal transition-colors ${
                  selectedPriceRange !== "all" ? "text-[#556B2F] font-semibold" : "text-charcoal-800 hover:text-charcoal-950"
                }`}
              >
                <span>{selectedPriceRange !== "all" ? `Price: ${FILTER_LABELS.price[selectedPriceRange]}` : "Price"}</span>
                <ChevronDown className="w-3 h-3 text-charcoal-400" />
              </button>

              {activeDropdown === "price" && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-ivory-tile border border-ivory-400 rounded-md shadow-lg py-1 z-30">
                  {[
                    { value: "all", label: "All Prices" },
                    { value: "under-50k", label: "Under ₹50,000" },
                    { value: "50k-1l", label: "₹50,000 – ₹1,00,000" },
                    { value: "above-1l", label: "Above ₹1,00,000" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setSelectedPriceRange(p.value);
                        updateUrlParam("price", p.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-white ${
                        selectedPriceRange === p.value ? "text-[#556B2F] font-semibold bg-white" : "text-charcoal-800"
                      }`}
                    >
                      <span>{p.label}</span>
                      {selectedPriceRange === p.value && <Check className="w-3 h-3 text-[#556B2F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color / Metal Dropdown */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "color" ? null : "color")}
                className={`inline-flex items-center gap-1.5 text-xs font-normal transition-colors ${
                  selectedColor !== "all" ? "text-[#556B2F] font-semibold" : "text-charcoal-800 hover:text-charcoal-950"
                }`}
              >
                <span>{selectedColor !== "all" ? `Colour: ${FILTER_LABELS.color[selectedColor]}` : "Colour"}</span>
                <ChevronDown className="w-3 h-3 text-charcoal-400" />
              </button>

              {activeDropdown === "color" && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-ivory-tile border border-ivory-400 rounded-md shadow-lg py-1 z-30">
                  {[
                    { value: "all", label: "All Precious Metals" },
                    { value: "yellow-gold", label: "Yellow Gold" },
                    { value: "rose-gold", label: "Rose Gold" },
                    { value: "white-gold", label: "White Gold" },
                    { value: "platinum", label: "950 Platinum" },
                  ].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setSelectedColor(c.value);
                        updateUrlParam("metal", c.value === "all" ? null : c.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-white ${
                        selectedColor === c.value ? "text-[#556B2F] font-semibold bg-white" : "text-charcoal-800"
                      }`}
                    >
                      <span>{c.label}</span>
                      {selectedColor === c.value && <Check className="w-3 h-3 text-[#556B2F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gold Purity Dropdown */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "purity" ? null : "purity")}
                className={`inline-flex items-center gap-1.5 text-xs font-normal transition-colors ${
                  selectedPurity !== "all" ? "text-[#556B2F] font-semibold" : "text-charcoal-800 hover:text-charcoal-950"
                }`}
              >
                <span>{selectedPurity !== "all" ? `Purity: ${FILTER_LABELS.purity[selectedPurity] || selectedPurity.toUpperCase()}` : "Gold purity"}</span>
                <ChevronDown className="w-3 h-3 text-charcoal-400" />
              </button>

              {activeDropdown === "purity" && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-ivory-tile border border-ivory-400 rounded-md shadow-lg py-1 z-30">
                  {[
                    { value: "all", label: "All Purities" },
                    { value: "22k", label: "22K (916 Hallmarked)" },
                    { value: "18k", label: "18K (750 Hallmarked)" },
                    { value: "14k", label: "14K (585 Hallmarked)" },
                  ].map((pur) => (
                    <button
                      key={pur.value}
                      onClick={() => {
                        setSelectedPurity(pur.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-white ${
                        selectedPurity === pur.value ? "text-[#556B2F] font-semibold bg-white" : "text-charcoal-800"
                      }`}
                    >
                      <span>{pur.label}</span>
                      {selectedPurity === pur.value && <Check className="w-3 h-3 text-[#556B2F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Filters Link */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#556B2F] hover:underline font-medium ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active filters as removable chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite" aria-label="Active filters">
          <span className="text-[11px] uppercase tracking-[0.14em] text-charcoal-500 font-medium mr-1">
            Filtering by
          </span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-olive-600 text-ivory-50 text-xs font-medium hover:bg-olive-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 focus-visible:ring-offset-2"
              aria-label={`Remove filter ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-charcoal-600 hover:text-orange-500 underline underline-offset-4 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. PRODUCT CARDS GRID (Matches Reference Screenshot Exactly)   */}
      {/* ============================================================== */}
      {filteredProducts.length > 0 ? (
        <div
          className={`grid transition-all duration-500 ease-out ${
            gridCols === 6
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5"
              : gridCols === 4
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8"
          }`}
        >
          {filteredEntries.map(({ product, matches, price }) => {
            const shownVariant = price.variant;
            const configured = anyVariantFilter && matches.length < product.variants.length;
            return (
              <ProductCard
                key={product.id}
                product={product}
                basePath={basePath}
                variant={shownVariant}
                href={configured ? variantHref(product, shownVariant, basePath) : undefined}
              />
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center bg-ivory-tile border border-dashed border-ivory-400 rounded-lg max-w-xl mx-auto p-8">
          <p className="text-sm text-charcoal-600 ">
            No jewellery pieces match the selected criteria.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 px-4 py-2 text-xs uppercase tracking-wider bg-[#556B2F] text-white rounded hover:bg-[#45561F] transition-all"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-charcoal-950/50 animate-[galleryFadeIn_200ms_ease-out]" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl border-t border-ivory-400 max-h-[85vh] flex flex-col animate-[sheetUp_200ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-400">
              <h2 className="text-base font-semibold text-charcoal-950">Filters</h2>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters" className="w-11 h-11 flex items-center justify-center text-charcoal-700" autoFocus>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {(
                [
                  ["Availability", selectedAvailability, (v: string) => { setSelectedAvailability(v); updateUrlParam("availability", v); }, [["all", "All pieces"], ["ready", "Ready to ship"], ["made-to-order", "Made to order"]]],
                  ["Category", selectedCategory, (v: string) => { setSelectedCategory(v); updateUrlParam("category", v); }, [["all", "All categories"], ["chokers", "Chokers"], ["necklaces", "Necklaces & Pendants"], ["rings", "Rings & Bands"], ["earrings", "Earrings & Jhumkas"], ["bracelets", "Bracelets & Kadas"]]],
                  ["Price", selectedPriceRange, (v: string) => { setSelectedPriceRange(v); updateUrlParam("price", v); }, [["all", "All prices"], ["under-50k", "Under ₹50,000"], ["50k-1l", "₹50,000 – ₹1,00,000"], ["above-1l", "Above ₹1,00,000"]]],
                  ["Colour", selectedColor, (v: string) => { setSelectedColor(v); updateUrlParam("metal", v === "all" ? null : v); }, [["all", "All metals"], ["yellow-gold", "Yellow Gold"], ["rose-gold", "Rose Gold"], ["white-gold", "White Gold"], ["platinum", "950 Platinum"]]],
                  ["Gold purity", selectedPurity, (v: string) => { setSelectedPurity(v); updateUrlParam("purity", v); }, [["all", "All purities"], ["22k", "22K"], ["18k", "18K"], ["14k", "14K"]]],
                  ["Sort", sortBy, (v: string) => { setSortBy(v); updateUrlParam("sort", v); }, [["featured", "Featured"], ["price_asc", "Price, low to high"], ["price_desc", "Price, high to low"], ["newest", "Newest"]]],
                ] as [string, string, (v: string) => void, [string, string][]][]
              ).map(([label, value, set, options]) => (
                <label key={label} className="block">
                  <span className="adm-label">{label}</span>
                  <select value={value} onChange={(e) => set(e.target.value)} className="adm-input min-h-[44px]">
                    {options.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex items-center gap-3 text-sm text-charcoal-900 min-h-[44px]">
                <input
                  type="checkbox"
                  className="accent-[#556B2F] w-4 h-4"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    updateUrlParam("inStock", e.target.checked ? "true" : null);
                  }}
                />
                In stock only
              </label>
            </div>
            <div className="px-5 py-4 border-t border-ivory-400 flex items-center gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {hasActiveFilters && (
                <button type="button" onClick={() => { clearAllFilters(); }} className="adm-btn-ghost min-h-[44px]">
                  Clear all
                </button>
              )}
              <button type="button" onClick={() => setSheetOpen(false)} className="adm-btn flex-1 min-h-[48px]">
                Show {filteredEntries.length} {filteredEntries.length === 1 ? "piece" : "pieces"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

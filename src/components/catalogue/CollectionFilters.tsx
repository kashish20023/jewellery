"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, X, ArrowUpDown, Search, Check } from "lucide-react";

export interface FilterProps {
  totalCount: number;
}

export function CollectionFilters({ totalCount }: FilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen]);

  // Read active filters from current URL search params (S02 Contract)
  const activeMetal = searchParams.get("metal") || "";
  const activeSort = searchParams.get("sort") || "featured";
  const activeInStock = searchParams.get("inStock") === "true";
  const activeSearch = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(activeSearch);

  // Update URL parameters while preserving others
  const updateQuery = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "false") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery("q", searchInput.trim() || null);
  };

  const clearAllFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const metals = [
    { label: "All Precious Metals", value: "" },
    { label: "22K Gold (916)", value: "22K" },
    { label: "18K Gold (750)", value: "18K" },
    { label: "Platinum (950)", value: "Platinum" },
  ];

  const sortOptions = [
    { label: "Featured Atelier Curation", value: "featured" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
  ];

  const hasActiveFilters = Boolean(activeMetal || activeInStock || activeSearch || activeSort !== "featured");

  return (
    <div className="space-y-4 mb-8">
      {/* Desktop Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-ivory-50 p-4 border border-border">
        {/* Left: Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by gemstone, metal, or SKU..."
            className="w-full bg-ivory-100 border border-border px-4 py-2.5 pl-10 text-xs text-charcoal-900 placeholder:text-charcoal-700/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 font-sans"
          />
          <Search className="w-4 h-4 text-charcoal-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateQuery("q", null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-700 hover:text-charcoal-950 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Desktop Filter Controls */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Metal Select */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-charcoal-700">Metal:</span>
            <select
              value={activeMetal}
              onChange={(e) => updateQuery("metal", e.target.value || null)}
              className="bg-ivory-100 border border-border px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 font-sans cursor-pointer"
            >
              {metals.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ready In Stock Toggle */}
          <label className="flex items-center gap-2 text-xs text-charcoal-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeInStock}
              onChange={(e) => updateQuery("inStock", e.target.checked ? "true" : null)}
              className="rounded-none text-gold-500 border-border focus:ring-gold-400"
            />
            <span className="text-[11px] font-mono uppercase">Ready in Atelier</span>
          </label>

          {/* Sort Select */}
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <ArrowUpDown className="w-3.5 h-3.5 text-charcoal-700" />
            <select
              value={activeSort}
              onChange={(e) => updateQuery("sort", e.target.value === "featured" ? null : e.target.value)}
              className="bg-ivory-100 border border-border px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 font-sans cursor-pointer"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Filter Trigger */}
        <div className="flex lg:hidden items-center justify-between gap-3 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex-1 btn-outline-gold py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters & Sort</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-gold-500" />
            )}
          </button>
          <span className="text-xs font-mono text-charcoal-700">
            {totalCount} {totalCount === 1 ? "piece" : "pieces"}
          </span>
        </div>
      </div>

      {/* Active Filter Chips Strip */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-mono text-charcoal-700 uppercase">Active:</span>

          {activeMetal && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ivory-200 border border-border text-charcoal-800 text-xs">
              <span>Metal: {activeMetal}</span>
              <button
                type="button"
                onClick={() => updateQuery("metal", null)}
                className="hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeInStock && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ivory-200 border border-border text-charcoal-800 text-xs">
              <span>Ready in Atelier Only</span>
              <button
                type="button"
                onClick={() => updateQuery("inStock", null)}
                className="hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeSearch && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ivory-200 border border-border text-charcoal-800 text-xs">
              <span>Query: &ldquo;{activeSearch}&rdquo;</span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateQuery("q", null);
                }}
                className="hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeSort !== "featured" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ivory-200 border border-border text-charcoal-800 text-xs">
              <span>
                Sort: {sortOptions.find((s) => s.value === activeSort)?.label}
              </span>
              <button
                type="button"
                onClick={() => updateQuery("sort", null)}
                className="hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] font-mono text-gold-700 hover:text-gold-900 underline underline-offset-2 uppercase ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Mobile Filters Drawer Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter and Sort Creations"
        className={`fixed inset-0 z-50 flex lg:hidden transition-all duration-300 ${
          isMobileDrawerOpen
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible"
        }`}
      >
        <div
          className={`fixed inset-0 bg-charcoal-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            isMobileDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />

        <div
          className={`relative w-full max-w-xs bg-ivory-50 h-full p-6 flex flex-col justify-between overflow-y-auto z-10 border-r border-border transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [will-change:transform] ${
            isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <span className="font-serif text-lg font-medium text-charcoal-950">
                  Filters & Sorting
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 text-charcoal-700 hover:text-charcoal-950"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Precious Metal Selector */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-mono tracking-widest text-charcoal-700 block">
                  Precious Metal
                </label>
                <div className="flex flex-col space-y-1.5">
                  {metals.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => updateQuery("metal", m.value || null)}
                      className={`text-left text-xs p-2.5 border transition-colors flex items-center justify-between ${
                        activeMetal === m.value
                          ? "border-gold-500 bg-gold-50/50 font-semibold"
                          : "border-border hover:border-charcoal-400"
                      }`}
                    >
                      <span>{m.label}</span>
                      {activeMetal === m.value && (
                        <Check className="w-4 h-4 text-gold-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock Only */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-center gap-3 text-xs text-charcoal-800 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={activeInStock}
                    onChange={(e) => updateQuery("inStock", e.target.checked ? "true" : null)}
                    className="rounded-none text-gold-500 border-border focus:ring-gold-400"
                  />
                  <span className="font-mono uppercase text-xs">Ready in Atelier Only</span>
                </label>
              </div>

              {/* Sort By */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs uppercase font-mono tracking-widest text-charcoal-700 block">
                  Sort Order
                </label>
                <div className="flex flex-col space-y-1.5">
                  {sortOptions.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateQuery("sort", s.value === "featured" ? null : s.value)}
                      className={`text-left text-xs p-2.5 border transition-colors flex items-center justify-between ${
                        activeSort === s.value
                          ? "border-gold-500 bg-gold-50/50 font-semibold"
                          : "border-border hover:border-charcoal-400"
                      }`}
                    >
                      <span>{s.label}</span>
                      {activeSort === s.value && (
                        <Check className="w-4 h-4 text-gold-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border space-y-3">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full btn-charcoal py-3 text-xs"
              >
                Apply & View ({totalCount} Pieces)
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="w-full text-center text-xs font-mono uppercase text-charcoal-700 hover:text-charcoal-950 py-1"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

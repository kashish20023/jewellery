"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { FAQ_CATEGORIES, FAQ_ITEMS, FaqItem } from "@/lib/fixtures/faqs";
import {
  Search,
  ChevronDown,
  MessageCircle,
  Calendar,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";

export function FaqExperience() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openItemIds, setOpenItemIds] = useState<Record<string, boolean>>({
    "bis-hallmark-authenticity": true,
    "domestic-insured-shipping": true,
  });

  const toggleItem = (id: string) => {
    setOpenItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="w-full space-y-12">
      {/* 1. SEARCH & CATEGORY FILTER BAR */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Search Input Container */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
            <Search className="w-5 h-5 text-stone-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by topic, e.g. BIS Hallmark, Shipping, PAN, Care..."
            className="w-full pl-12 pr-10 py-3.5 bg-white/90 backdrop-blur-xs border border-stone-200/90 rounded-full text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#556B2F] focus:ring-1 focus:ring-[#556B2F] shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 text-xs rounded-full whitespace-nowrap font-medium transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-[#556B2F] text-white shadow-xs border border-[#556B2F]"
                    : "bg-white/80 text-stone-600 border border-stone-200 hover:border-stone-300 hover:text-stone-900"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ACCORDION FAQ LIST */}
      <div className="max-w-3xl mx-auto space-y-4">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq: FaqItem) => {
            const isOpen = !!openItemIds[faq.id];
            return (
              <div
                key={faq.id}
                className="bg-white/90 backdrop-blur-xs border border-stone-200/80 rounded-xl overflow-hidden shadow-xs hover:border-[#556B2F]/30 transition-all duration-300"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full py-5 px-6 flex items-start justify-between text-left gap-4 cursor-pointer select-none group"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] tracking-widest uppercase text-[#556B2F] font-semibold block">
                      {faq.categoryLabel}
                    </span>
                    <h3 className="text-base sm:text-lg text-stone-900 font-medium group-hover:text-[#556B2F] transition-colors leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 mt-0.5 ${
                      isOpen
                        ? "bg-[#556B2F] text-white border-[#556B2F] rotate-180"
                        : "bg-stone-50 text-stone-500 border-stone-200 group-hover:border-[#556B2F]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-stone-600  leading-relaxed border-t border-stone-100/80 animate-in fade-in duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Empty Search State */
          <div className="text-center py-16 px-6 bg-white/80 rounded-xl border border-dashed border-stone-200 max-w-md mx-auto space-y-3">
            <HelpCircle className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="text-lg text-stone-800 font-normal">
              No matching questions found
            </h4>
            <p className="text-xs text-stone-500 ">
              We couldn’t find an answer matching &ldquo;{searchQuery}&rdquo;. Try another keyword or connect with our atelier concierge directly.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-2 text-xs uppercase tracking-wider text-[#556B2F] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* 3. ASSURANCE STRIP */}
      <div className="max-w-3xl mx-auto pt-6 border-t border-stone-200/80">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white/70 rounded-lg border border-stone-100 flex flex-col items-center space-y-1">
            <ShieldCheck className="w-5 h-5 text-[#556B2F]" />
            <span className="text-xs font-medium text-stone-900">
              100% BIS Hallmarked
            </span>
            <span className="text-[11px] text-stone-500 ">
              916 (22K) & 750 (18K) HUID Compliant
            </span>
          </div>

          <div className="p-4 bg-white/70 rounded-lg border border-stone-100 flex flex-col items-center space-y-1">
            <Sparkles className="w-5 h-5 text-[#556B2F]" />
            <span className="text-xs font-medium text-stone-900">
              Natural Certified Diamonds
            </span>
            <span className="text-[11px] text-stone-500 ">
              IGI & SGL Graded (E-F / VVS)
            </span>
          </div>

          <div className="p-4 bg-white/70 rounded-lg border border-stone-100 flex flex-col items-center space-y-1">
            <HelpCircle className="w-5 h-5 text-[#556B2F]" />
            <span className="text-xs font-medium text-stone-900">
              Insured Doorstep Delivery
            </span>
            <span className="text-[11px] text-stone-500 ">
              Armored transit across India
            </span>
          </div>
        </div>
      </div>

      {/* 4. ATELIER CONCIERGE ASSISTANCE CARD */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1A1A1A] text-white rounded-2xl p-8 sm:p-10 shadow-xl relative overflow-hidden text-center space-y-4">
          {/* Subtle Damask Glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-15 bg-repeat bg-[url('https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255328/chudiwalas/site/damask_pattern_hd.webp')] [background-size:240px_auto] mix-blend-overlay"
          />

          <span className="text-[10px] tracking-widest uppercase text-[#E9E2CC] font-semibold block relative z-10">
            Dedicated Customer Assistance
          </span>

          <h3 className="text-2xl sm:text-3xl text-white font-semibold relative z-10">
            Still Have Questions?
          </h3>

          <p className="text-xs sm:text-sm text-stone-300  max-w-lg mx-auto leading-relaxed relative z-10">
            Our master gemologists and personal jewellery stylists are available to guide you through diamond selections, custom sizes, and high-value orders.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 relative z-10">
            <a
              href="https://wa.me/919876543210?text=Hello%2C%20I%20have%20a%20question%20regarding%20Chudiwalas%20jewellery"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto btn-gold text-xs px-6 py-3.5 inline-flex items-center justify-center gap-2 rounded shadow-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Stylist</span>
            </a>

            <Link
              href="/consultation"
              className="w-full sm:w-auto btn-outline-gold text-xs px-6 py-3.5 inline-flex items-center justify-center gap-2 rounded font-medium"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Atelier Consultation</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

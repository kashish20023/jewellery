"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { formatPaiseToInr } from "@/lib/money";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, totals } = useCart();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md bg-[#F6F0E2] shadow-2xl flex flex-col border-l border-[#E5E7EB] pointer-events-auto transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [will-change:transform] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F6F0E2]">
            <div>
              <h2 className="font-serif text-xl text-[#556B2F]">Curated Selection</h2>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                {totals.itemCount} {totals.itemCount === 1 ? "Piece" : "Pieces"} in Cart
              </p>
            </div>
            <button
              onClick={closeCart}
              className="p-2 text-stone-400 hover:text-stone-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 active:scale-95"
              aria-label="Close cart drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
                  <ShoppingBag className="w-7 h-7 stroke-[1.25]" />
                </div>
                <h3 className="font-serif text-lg text-stone-800">Your Cart is Empty</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs">
                  Discover our timeless suites of hallmarked gold, uncut polki, and certified solitaires.
                </p>
                <Link
                  href="/collections"
                  onClick={closeCart}
                  className="mt-6 inline-block px-5 py-2.5 bg-[#556B2F] text-[#F6F0E2] hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-xs uppercase tracking-widest font-semibold rounded shadow-sm transition-all active:scale-98"
                >
                  Explore Suites
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const pricePaise = BigInt(item.unitPricePaise);
                  const lineTotalPaise = pricePaise * BigInt(item.quantity);

                  return (
                    <div
                      key={item.variantId}
                      className="p-4 bg-white border border-stone-200 rounded-sm flex gap-4 transition-all hover:border-gold-300"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-20 bg-stone-100 relative rounded overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <ImageWithFallback
                            src={item.imageUrl}
                            alt={item.productTitle}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                            Piece
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-serif text-sm font-medium text-stone-900 line-clamp-1">
                              {item.productTitle}
                            </h4>
                            <button
                              onClick={() => removeItem(item.variantId)}
                              className="text-stone-400 hover:text-rose-600 text-xs transition-colors"
                              aria-label={`Remove ${item.productTitle} from cart`}
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                            {item.metalType} {item.size ? `• Size ${item.size}` : ""}
                          </p>
                          <p className="text-xs font-semibold text-stone-900 mt-1">
                            {formatPaiseToInr(pricePaise)}
                          </p>
                        </div>

                        {/* Quantity Controls & Line Total */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
                          <div className="flex items-center border border-stone-200 rounded">
                            <button
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              className="px-2.5 py-0.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors active:scale-95"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-mono text-stone-900 border-x border-stone-200">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              className="px-2.5 py-0.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors active:scale-95"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-stone-900">
                            {formatPaiseToInr(lineTotalPaise)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer & Checkout CTA */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#E5E7EB] bg-[#F6F0E2] space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatPaiseToInr(totals.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>GST (3%)</span>
                  <span>{formatPaiseToInr(totals.taxPaise)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Insured Delivery</span>
                  <span className="text-emerald-700 font-medium">Complimentary</span>
                </div>
                <div className="pt-2 border-t border-[#E5E7EB] flex justify-between text-sm font-semibold text-[#556B2F]">
                  <span>Total</span>
                  <span>{formatPaiseToInr(totals.totalPaise)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full block py-3 bg-[#556B2F] text-[#F6F0E2] hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-center text-xs uppercase tracking-widest font-semibold rounded transition-all shadow-sm active:scale-98"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="w-full block py-2.5 bg-[#E9E2CC] hover:bg-[#556B2F] text-[#556B2F] hover:text-[#F6F0E2] border-2 border-[#556B2F] text-center text-xs uppercase tracking-widest font-semibold rounded transition-all shadow-sm active:scale-98"
                >
                  View Full Bag Details
                </Link>
              </div>

              <p className="text-[10px] text-center text-stone-500 font-mono">
                Complimentary 100% Insured Delivery • Hallmark Certified
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

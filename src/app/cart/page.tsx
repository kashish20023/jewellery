"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { formatPaiseToInr } from "@/lib/money";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totals } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[#FAF3F9] flex items-center justify-center text-[#556B2F] mx-auto mb-6">
          <ShoppingBag className="w-8 h-8 stroke-[1.25]" />
        </div>
        <h1 className="text-3xl font-semibold text-charcoal-950 ">Your Shopping Bag is Empty</h1>
        <p className="text-xs text-stone-600 mt-2 max-w-sm mx-auto leading-relaxed">
          Your curated collection bag holds no jewellery pieces at this time. Explore our fine jewellery suites to add heirloom treasures.
        </p>
        <div className="mt-8 flex justify-center space-x-4">
          <Link
            href="/collections"
            className="px-6 py-3 bg-[#556B2F] text-white hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-xs uppercase tracking-widest font-semibold rounded shadow-sm transition-all"
          >
            Explore Collections
          </Link>
          <Link
            href="/wishlist"
            className="px-6 py-3 bg-[#E9E2CC] hover:bg-[#556B2F] text-[#556B2F] hover:text-white border-2 border-[#556B2F] text-xs uppercase tracking-widest font-semibold rounded shadow-sm transition-all"
          >
            View Saved Wishlist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-charcoal-100 pb-4 flex justify-between items-end">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#556B2F] font-medium">
            Atelier Bag
          </span>
          <h1 className="text-3xl text-charcoal-950 mt-1 ">
            Shopping Cart ({totals.itemCount})
          </h1>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-stone-400 hover:text-red-700 transition-colors underline pb-1"
        >
          Clear Bag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const pricePaise = BigInt(item.unitPricePaise);
            const lineTotalPaise = pricePaise * BigInt(item.quantity);

            return (
              <div
                key={item.variantId}
                className="bg-ivory-tile p-6 rounded-lg border border-charcoal-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-center space-x-5">
                  <div className="w-24 h-24 relative bg-[#F3F4F6] rounded overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={item.imageUrl || ""}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="text-base text-[#556B2F] hover:text-[#521C4A] transition-colors font-medium"
                    >
                      {item.productTitle}
                    </Link>
                    <p className="text-xs text-stone-500 mt-0.5">
                      SKU: {item.sku}
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      {item.metalType} {item.size ? `• Size ${item.size}` : ""}
                    </p>
                    <p className="text-xs text-stone-700 mt-1">
                      {formatPaiseToInr(pricePaise)} each
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-6">
                  {/* Quantity */}
                  <div className="flex items-center border border-stone-300 rounded">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100"
                    >
                      −
                    </button>
                    <span className="px-3 text-xs font-medium text-stone-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100"
                    >
                      +
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[100px]">
                    <span className="text-base font-medium text-[#556B2F]">
                      {formatPaiseToInr(lineTotalPaise)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="text-stone-400 hover:text-red-700 transition-colors p-1"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <Link
              href="/collections"
              className="text-xs text-[#556B2F] hover:underline font-medium inline-flex items-center"
            >
              &larr; Continue Exploring Suites
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-ivory-tile p-6 rounded-lg border border-charcoal-100 shadow-sm space-y-5 sticky top-24">
            <h2 className="text-lg text-[#556B2F]">Order Summary</h2>

            <div className="space-y-3 text-xs text-stone-600 border-b border-charcoal-100 pb-4">
              <div className="flex justify-between">
                <span>Bag Subtotal</span>
                <span className="font-medium text-stone-900">
                  {formatPaiseToInr(totals.subtotalPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Precious Jewellery GST (3%)</span>
                <span className="font-medium text-stone-900">
                  {formatPaiseToInr(totals.taxPaise)}
                </span>
              </div>
              <div className="flex justify-between text-[#556B2F]">
                <span>Insured Domestic Transit</span>
                <span className="font-medium uppercase text-[11px]">Free</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-medium text-[#556B2F]">Total Payable</span>
              <span className="text-xl font-medium text-[#556B2F]">
                {formatPaiseToInr(totals.totalPaise)}
              </span>
            </div>

            <div className="pt-2 space-y-3">
              <Link
                href="/checkout"
                className="w-full block py-3.5 px-4 bg-[#556B2F] text-white hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-center text-xs uppercase tracking-widest font-semibold rounded transition-all shadow-sm"
              >
                Proceed to Checkout
              </Link>
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-2 text-[11px] text-stone-500">
              <div className="flex items-center space-x-2">
                <span>🛡</span>
                <span>100% Transit Insurance by Sequel Logistics</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>💎</span>
                <span>BIS Hallmarked & Certified Authentic</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🔒</span>
                <span>Bank-Grade 256-Bit Encrypted Payments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


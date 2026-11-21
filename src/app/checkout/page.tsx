"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { formatPaiseToInr } from "@/lib/money";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { generateTestPaymentSignature } from "@/lib/payment/razorpay";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totals, clearCart } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pinCode, setPinCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-charcoal-950">Your Bag is Empty</h1>
        <p className="text-xs text-stone-600 mt-2">
          Please add fine jewellery pieces to your shopping cart before proceeding to checkout.
        </p>
        <Link
          href="/collections"
          className="mt-6 inline-block px-5 py-2.5 bg-[#556B2F] text-white hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-xs uppercase tracking-widest font-semibold rounded shadow-sm transition-all"
        >
          Explore Collections
        </Link>
      </div>
    );
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Initialize checkout & reserve stock
      const initRes = await fetch("/api/checkout/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name, email, phone },
          shippingAddress: { line1, line2, city, state, pinCode, country: "India" },
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            claimedUnitPricePaise: i.unitPricePaise,
          })),
          claimedTotalPaise: totals.totalPaise.toString(),
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || "Failed to initialize checkout session.");
      }

      const { orderId, capabilityToken, gatewayOrderId } = initData;

      // 2. Process Hosted Payment Simulation (In sandbox mode, simulate Razorpay capture)
      const simulatedPaymentId = `pay_test_${Date.now()}`;
      const simulatedSignature = generateTestPaymentSignature(gatewayOrderId, simulatedPaymentId);

      // Verify payment with server
      const verifyRes = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          gatewayPaymentId: simulatedPaymentId,
          gatewayOrderId,
          gatewaySignature: simulatedSignature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Payment verification failed.");
      }

      // 3. Clear guest cart and redirect to order confirmation
      clearCart();
      router.push(`/order/${capabilityToken}`);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-charcoal-950">Checkout</h1>
        {/* Step indicator: Bag done, Details active, Payment next */}
        <ol className="mt-4 flex items-center gap-2 text-xs" aria-label="Checkout steps">
          {[
            { n: 1, label: "Bag", state: "done" },
            { n: 2, label: "Details", state: "active" },
            { n: 3, label: "Payment", state: "next" },
          ].map((s, i) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${s.state === "active" ? "bg-olive-600 text-white" : s.state === "done" ? "bg-olive-100 text-olive-800" : "bg-ivory-tile text-charcoal-400 border border-charcoal-100"}`}>{s.n}</span>
              <span className={s.state === "active" ? "font-medium text-charcoal-950" : "text-charcoal-500"}>{s.label}</span>
              {i < 2 && <span className="w-6 sm:w-10 h-px bg-charcoal-100 mx-1" aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <p className="text-xs text-charcoal-600 mt-3">Fully insured domestic transit across India with tamper-evident delivery.</p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded flex items-center space-x-2">
          <span>⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Shipping and Contact Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <div className="bg-ivory-tile p-6 rounded-lg border border-charcoal-100 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-charcoal-950 border-b border-charcoal-100 pb-2">
              1. Contact & Recipient Details
            </h2>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Radhika Apte"
                className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For tracking & GST tax invoice"
                  className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  Mobile Number (India) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile for courier OTP"
                  className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-ivory-tile p-6 rounded-lg border border-charcoal-100 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-charcoal-950 border-b border-charcoal-100 pb-2">
              2. Insured Shipping Address
            </h2>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Street Address / Landmark *
              </label>
              <input
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Apartment, house number, street name"
                className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                Apartment / Suite (Optional)
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  State *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-charcoal-100 rounded text-xs bg-white"
                >
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Kerala">Kerala</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-600 mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  pattern="[1-9][0-9]{5}"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 digits (e.g. 400001)"
                  className="w-full px-3 py-2 border border-charcoal-100 bg-white rounded text-xs focus:ring-1 focus:ring-[#556B2F]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-ivory-tile p-6 rounded-lg border border-charcoal-100 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-charcoal-950 border-b border-charcoal-100 pb-2">
              3. Payment Gateway
            </h2>

            <div className="flex items-center space-x-3 p-3 bg-ivory-tile border border-charcoal-100 rounded-lg">
              <span className="text-xl">💳</span>
              <div>
                <span className="text-xs font-medium text-[#556B2F] block">
                  Hosted Sandbox Gateway (Razorpay)
                </span>
                <span className="text-[11px] text-stone-600">
                  Accepts UPI, Net Banking, Credit/Debit Cards with simulated sandbox capture.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Order Breakdown & Submit */}
        <div className="lg:col-span-1">
          <div className="bg-ivory-tile p-6 rounded-lg border border-charcoal-100 shadow-sm space-y-5 sticky top-24">
            <h2 className="text-base font-semibold text-charcoal-950">Curated Pieces ({items.length})</h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center space-x-3 text-xs">
                  <div className="w-12 h-12 relative bg-[#F3F4F6] rounded overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={item.imageUrl || ""}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#556B2F] truncate">{item.productTitle}</p>
                    <p className="text-[10px] text-stone-500">
                      Qty: {item.quantity} • {item.metalType}
                    </p>
                  </div>
                  <div className="text-[#556B2F] text-right">
                    {formatPaiseToInr(BigInt(item.unitPricePaise) * BigInt(item.quantity))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-charcoal-100 pt-4 space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-stone-900">
                  {formatPaiseToInr(totals.subtotalPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Precious Jewellery GST (3%)</span>
                <span className="text-stone-900">
                  {formatPaiseToInr(totals.taxPaise)}
                </span>
              </div>
              <div className="flex justify-between text-[#556B2F]">
                <span>Insured Courier Delivery</span>
                <span className="font-medium uppercase text-[11px]">Free</span>
              </div>
              <div className="pt-2 border-t border-charcoal-100 flex justify-between text-sm font-medium text-[#556B2F]">
                <span>Total Amount</span>
                <span className="text-base text-[#556B2F]">
                  {formatPaiseToInr(totals.totalPaise)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#556B2F] text-white hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-center text-xs uppercase tracking-widest font-semibold rounded transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? "Authorizing Payment..." : `Pay ${formatPaiseToInr(totals.totalPaise)}`}
            </button>

            <p className="text-[10px] text-center text-stone-500">
              Stock reserved for 15 minutes upon authorization • 100% Insured
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}


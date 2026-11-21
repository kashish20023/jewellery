import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPaiseToInr } from "@/lib/money";
import { db } from "@/lib/db";
import { memoryOrders } from "@/lib/checkout/memoryOrders";
import { constructMetadata } from "@/lib/seo";
import { OrderAnalyticsTracker } from "@/components/analytics/OrderAnalyticsTracker";
import type { PurchaseEventPayload } from "@/lib/analytics";

interface OrderPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata() {
  return constructMetadata({
    title: "Order Confirmation & Status",
    noIndex: true,
  });
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface OrderItemView {
  id?: string;
  sku: string;
  productTitle: string;
  variantAttributes?: { metalType?: string; size?: string | null; purity?: string | null } | null;
  unitPricePaise: bigint | string;
  quantity: number;
  lineTotalPaise: bigint | string;
}

interface OrderDataView {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
  };
  orderStatus: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  trackingNumber?: string | null;
  carrierName?: string | null;
  subtotalPaise: bigint | string;
  taxPaise: bigint | string;
  shippingPaise: bigint | string;
  totalPaise: bigint | string;
  createdAt: Date;
  items: OrderItemView[];
}

export default async function OrderConfirmationPage({ params }: OrderPageProps) {
  const { token } = await params;

  // S24 Invariant: Only valid UUIDv4 tokens allowed
  if (!token || !UUID_V4_REGEX.test(token)) {
    notFound();
  }

  let orderData: OrderDataView | null = null;

  try {
    const order = await db.order.findUnique({
      where: { capabilityToken: token },
      include: { items: true },
    });

    if (order) {
      orderData = {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress as OrderDataView["shippingAddress"],
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfilmentStatus: order.fulfilmentStatus,
        trackingNumber: order.trackingNumber,
        carrierName: order.carrierName,
        subtotalPaise: order.subtotalPaise,
        taxPaise: order.taxPaise,
        shippingPaise: order.shippingPaise,
        totalPaise: order.totalPaise,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
          id: i.id,
          sku: i.sku,
          productTitle: i.productTitle,
          variantAttributes: i.variantAttributes as OrderItemView["variantAttributes"],
          unitPricePaise: i.unitPricePaise,
          quantity: i.quantity,
          lineTotalPaise: i.lineTotalPaise,
        })),
      };
    }
  } catch {
    // Check memory fallback
    for (const mem of memoryOrders.values()) {
      if (mem.capabilityToken === token) {
        orderData = {
          orderNumber: mem.orderNumber,
          customerName: mem.customerName,
          customerEmail: mem.customerEmail,
          customerPhone: mem.customerPhone,
          shippingAddress: mem.shippingAddress,
          orderStatus: mem.orderStatus,
          paymentStatus: mem.paymentStatus,
          fulfilmentStatus: "UNFULFILLED",
          subtotalPaise: mem.subtotalPaise,
          taxPaise: mem.taxPaise,
          shippingPaise: mem.shippingPaise,
          totalPaise: mem.totalPaise,
          createdAt: mem.createdAt,
          items: mem.items.map((item) => ({
            id: item.variantId,
            sku: item.sku,
            productTitle: item.productTitle,
            variantAttributes: { metalType: item.metalType, size: item.size, purity: item.purity },
            unitPricePaise: item.unitPricePaise,
            quantity: item.quantity,
            lineTotalPaise: item.lineTotalPaise,
          })),
        };
        break;
      }
    }
  }

  if (!orderData) {
    notFound();
  }

  const address = orderData.shippingAddress || {};
  const totalItemCount = orderData.items.reduce((acc, i) => acc + i.quantity, 0);

  // S27 Contract: Privacy-First Purchase Tracking Payload (Strictly ZERO Customer PII)
  const analyticsPayload: PurchaseEventPayload = {
    transactionId: orderData.orderNumber,
    valueInr: Number(orderData.totalPaise) / 100,
    taxInr: Number(orderData.taxPaise) / 100,
    shippingInr: Number(orderData.shippingPaise) / 100,
    currency: "INR",
    itemCount: totalItemCount,
    items: orderData.items.map((i) => ({
      itemId: i.sku,
      itemName: i.productTitle,
      quantity: i.quantity,
      priceInr: Number(i.unitPricePaise) / 100,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      {/* S27 Analytics Dispatcher */}
      <OrderAnalyticsTracker order={analyticsPayload} />

      {/* Top Confirmation Banner */}
      <div className="bg-[#F6F0E2] p-8 rounded-lg border border-[#E5E7EB] text-center space-y-3 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#FAF3F9] text-[#556B2F] flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <span className="text-xs uppercase tracking-widest text-[#556B2F] font-medium block">
          Order Confirmed & Paid
        </span>
        <h1 className="text-3xl text-[#556B2F]">
          Thank you, {orderData.customerName}
        </h1>
        <p className="text-xs text-stone-500">
          Order Reference: <strong className="text-stone-900">{orderData.orderNumber}</strong>
        </p>
        <p className="text-xs text-stone-600 max-w-md mx-auto pt-2 leading-relaxed">
          A confirmation with your GST tax invoice has been sent to{" "}
          <strong className="text-stone-900">{orderData.customerEmail}</strong>.
          Our master craftsmen are preparing your piece for insured dispatch.
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#F6F0E2] p-4 rounded-lg border border-[#E5E7EB] text-xs">
          <span className="text-stone-500 uppercase tracking-wider block text-[10px]">
            Order Status
          </span>
          <span className="font-semibold text-[#556B2F] text-sm mt-1 inline-block">
            {orderData.orderStatus}
          </span>
        </div>

        <div className="bg-[#F6F0E2] p-4 rounded-lg border border-[#E5E7EB] text-xs">
          <span className="text-stone-500 uppercase tracking-wider block text-[10px]">
            Payment Status
          </span>
          <span className="font-semibold text-[#556B2F] text-sm mt-1 inline-block">
            {orderData.paymentStatus} (RAZORPAY)
          </span>
        </div>

        <div className="bg-[#F6F0E2] p-4 rounded-lg border border-[#E5E7EB] text-xs">
          <span className="text-stone-500 uppercase tracking-wider block text-[10px]">
            Fulfilment Transit
          </span>
          <span className="font-semibold text-stone-800 text-sm mt-1 inline-block">
            {orderData.fulfilmentStatus}
          </span>
        </div>
      </div>

      {/* Order Items & Breakdown */}
      <div className="bg-[#F6F0E2] p-6 rounded-lg border border-[#E5E7EB] shadow-sm space-y-6">
        <h2 className="text-xl text-[#556B2F] border-b border-[#E5E7EB] pb-3">
          Order Summary
        </h2>

        <div className="divide-y divide-[#E5E7EB]">
          {orderData.items.map((item) => (
            <div key={item.id || item.sku} className="py-4 flex justify-between items-center text-xs">
              <div>
                <p className="font-medium text-stone-900 text-sm">{item.productTitle}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  SKU: {item.sku} • Qty: {item.quantity}
                </p>
                {item.variantAttributes && (
                  <p className="text-[11px] text-stone-600">
                    {item.variantAttributes.metalType} {item.variantAttributes.size ? `• Size ${item.variantAttributes.size}` : ""}
                  </p>
                )}
              </div>
              <div className="text-sm font-medium text-stone-900">
                {formatPaiseToInr(BigInt(item.lineTotalPaise))}
              </div>
            </div>
          ))}
        </div>

        {/* Financials */}
        <div className="border-t border-[#E5E7EB] pt-4 space-y-2 text-xs text-stone-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-stone-900">
              {formatPaiseToInr(BigInt(orderData.subtotalPaise))}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Precious Jewellery GST (3%)</span>
            <span className="text-stone-900">
              {formatPaiseToInr(BigInt(orderData.taxPaise))}
            </span>
          </div>
          <div className="flex justify-between text-[#556B2F]">
            <span>Insured Domestic Transit (Sequel Logistics)</span>
            <span className="font-medium uppercase text-[11px]">Free</span>
          </div>
          <div className="pt-2 border-t border-[#E5E7EB] flex justify-between text-base font-medium text-[#556B2F]">
            <span>Total Paid</span>
            <span>{formatPaiseToInr(BigInt(orderData.totalPaise))}</span>
          </div>
        </div>
      </div>

      {/* Recipient & Shipping Address Snapshot */}
      <div className="bg-[#F6F0E2] p-6 rounded-lg border border-[#E5E7EB] shadow-sm space-y-4">
        <h2 className="text-lg text-[#556B2F] border-b border-[#E5E7EB] pb-2">
          Insured Delivery Details
        </h2>
        <div className="text-xs text-stone-700 space-y-1">
          <p className="font-medium text-stone-900">{orderData.customerName}</p>
          <p>{address.line1} {address.line2 ? `, ${address.line2}` : ""}</p>
          <p>{address.city}, {address.state} — {address.pinCode}</p>
          <p>{address.country || "India"}</p>
          <p className="pt-1 text-stone-600">Phone for Delivery OTP: +91 {orderData.customerPhone}</p>
        </div>
      </div>

      {/* Capability Token & Bookmark Note */}
      <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB] text-xs text-stone-600 space-y-1">
        <p className="font-medium text-[#556B2F]">Guest Order Tracking</p>
        <p>
          This private page is accessible via your secure capability link. Please bookmark this URL to check your courier tracking status anytime without creating an account.
        </p>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#556B2F] text-[#F6F0E2] hover:bg-[#E9E2CC] hover:text-[#556B2F] border border-[#556B2F] text-xs uppercase tracking-widest font-semibold rounded shadow-sm transition-all"
        >
          Return to Storefront
        </Link>
      </div>
    </div>
  );
}

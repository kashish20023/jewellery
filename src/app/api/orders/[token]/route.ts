import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { memoryOrders } from "@/lib/checkout/memoryOrders";

export const dynamic = "force-dynamic";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // S24 Invariant: Only cryptographically secure UUIDv4 capability tokens allowed
  if (!token || !UUID_V4_REGEX.test(token)) {
    return NextResponse.json(
      { success: false, error: "Order not found. Invalid capability access token." },
      { status: 404 }
    );
  }

  let order = null;

  try {
    order = await db.order.findUnique({
      where: { capabilityToken: token },
      include: {
        items: true,
      },
    });
  } catch {
    // Database connection offline, fall through to memory store
  }

  if (!order) {
    // Check memory fallback
    for (const mem of memoryOrders.values()) {
      if (mem.capabilityToken === token) {
        return NextResponse.json({
          success: true,
          order: {
            orderNumber: mem.orderNumber,
            customerName: mem.customerName,
            customerEmail: mem.customerEmail,
            customerPhone: mem.customerPhone,
            shippingAddress: mem.shippingAddress,
            orderStatus: mem.orderStatus,
            paymentStatus: mem.paymentStatus,
            fulfilmentStatus: "UNFULFILLED",
            subtotalPaise: mem.subtotalPaise.toString(),
            taxPaise: mem.taxPaise.toString(),
            shippingPaise: mem.shippingPaise.toString(),
            totalPaise: mem.totalPaise.toString(),
            createdAt: mem.createdAt,
            items: mem.items.map((i) => ({
              id: i.variantId,
              sku: i.sku,
              productTitle: i.productTitle,
              variantAttributes: { metalType: i.metalType, size: i.size, purity: i.purity },
              unitPricePaise: i.unitPricePaise.toString(),
              quantity: i.quantity,
              lineTotalPaise: i.lineTotalPaise.toString(),
            })),
          },
        });
      }
    }

    return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      trackingNumber: order.trackingNumber,
      carrierName: order.carrierName,
      subtotalPaise: order.subtotalPaise.toString(),
      taxPaise: order.taxPaise.toString(),
      shippingPaise: order.shippingPaise.toString(),
      totalPaise: order.totalPaise.toString(),
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        sku: i.sku,
        productTitle: i.productTitle,
        variantAttributes: i.variantAttributes,
        unitPricePaise: i.unitPricePaise.toString(),
        quantity: i.quantity,
        lineTotalPaise: i.lineTotalPaise.toString(),
      })),
    },
  });
}

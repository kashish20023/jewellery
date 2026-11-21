import { NextRequest, NextResponse } from "next/server";
import { validateAndPriceCart } from "@/lib/checkout/cartValidation";
import { memoryOrders } from "@/lib/checkout/memoryOrders";
import { createInventoryReservations, linkReservationsToOrder } from "@/lib/checkout/reservation";
import { createGatewayOrder, RAZORPAY_KEY_ID } from "@/lib/payment/razorpay";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { isDemoMode } from "@/lib/runtime";
import { z } from "zod";

export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Valid email address is required"),
    phone: z.string().trim().regex(/^(\+91[\-\s]?)?[6789]\d{9}$/, "Valid 10-digit Indian phone number required"),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(5, "Address line 1 is required"),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(2, "City is required"),
    state: z.string().trim().min(2, "State is required"),
    pinCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Valid 6-digit Indian PIN code required"),
    country: z.string().default("India"),
  }),
  items: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.number().int().positive(),
      claimedUnitPricePaise: z.union([z.string(), z.number()]).optional(),
    })
  ).min(1, "At least one item is required in cart"),
  claimedTotalPaise: z.union([z.string(), z.number()]).optional(),
});



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid checkout data" },
        { status: 400 }
      );
    }

    const { customer, shippingAddress, items, claimedTotalPaise } = parsed.data;

    // 0. Store-wide purchase switch (centralized policy, S07): when the owner
    // pauses purchases, checkout is refused regardless of frontend state.
    try {
      const settings = await db.storeSettings.findUnique({ where: { id: "default" } });
      if (settings && settings.enablePurchases === false) {
        return NextResponse.json(
          { success: false, error: "Online purchases are temporarily paused. Please connect with our WhatsApp concierge." },
          { status: 403 }
        );
      }
    } catch {
      // Settings unavailable: default remains purchases-enabled.
    }

    // 1. Server-Authoritative Price & Policy Recalculation (S16 Invariant)
    const cartValidation = await validateAndPriceCart(items, claimedTotalPaise);
    if (!cartValidation.isValid) {
      return NextResponse.json(
        { success: false, error: cartValidation.error || "Cart validation failed" },
        { status: 400 }
      );
    }

    // 1b. A detected price-tamper attempt is rejected outright (S16 Invariant 5).
    if (cartValidation.tamperDetected) {
      console.warn("Checkout price tampering detected", { items: items.map((i) => i.variantId) });
      return NextResponse.json(
        { success: false, error: "Cart prices are out of date. Please refresh your bag and try again." },
        { status: 409 }
      );
    }

    // 2. Atomic Inventory Reservation with 15-min TTL (S17 Invariant)
    const reservationItems = cartValidation.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    const reservation = await createInventoryReservations(reservationItems);
    if (!reservation.success) {
      return NextResponse.json(
        {
          success: false,
          error: reservation.error || "One or more items are out of stock.",
          insufficientVariantId: reservation.insufficientVariantId,
        },
        { status: 409 } // Conflict / Out of Stock
      );
    }

    // 3. Generate Human Order Number and Secure Capability Token (S24 Invariant)
    const makeOrderNumber = () =>
      `ORD-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
    let orderNumber = makeOrderNumber();
    const capabilityToken = crypto.randomUUID();

    // 4. Create Gateway Order
    const gatewayOrder = await createGatewayOrder({
      amountPaise: cartValidation.totalPaise,
      receipt: orderNumber,
    });

    let orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 5. Persist Order in Database (memory fallback exists for demo/test sandboxes only)
    try {
      let created = null;
      for (let attempt = 0; attempt < 3 && !created; attempt++) {
        try {
          created = await db.order.create({
            data: {
              orderNumber,
              capabilityToken,
              customerName: customer.name,
              customerEmail: customer.email,
              customerPhone: customer.phone.replace(/\D/g, "").slice(-10),
              shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
              subtotalPaise: cartValidation.subtotalPaise,
              taxPaise: cartValidation.taxPaise,
              shippingPaise: cartValidation.shippingPaise,
              totalPaise: cartValidation.totalPaise,
              orderStatus: "PENDING",
              paymentStatus: "PENDING",
              fulfilmentStatus: "UNFULFILLED",
              paymentGateway: "RAZORPAY",
              gatewayOrderId: gatewayOrder.id,
              items: {
                create: cartValidation.items.map((item) => ({
                  variantId: item.variantId,
                  sku: item.sku,
                  productTitle: item.productTitle,
                  variantAttributes: { metalType: item.metalType, size: item.size, purity: item.purity },
                  unitPricePaise: item.unitPricePaise,
                  quantity: item.quantity,
                  lineTotalPaise: item.lineTotalPaise,
                })),
              },
            },
          });
        } catch (err) {
          // Retry only a human orderNumber collision; rethrow everything else.
          const isUniqueCollision =
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002" &&
            (err.meta?.target as string[] | undefined)?.includes("orderNumber");
          if (!isUniqueCollision || attempt === 2) throw err;
          orderNumber = makeOrderNumber();
        }
      }
      if (created) {
        orderId = created.id;
        // Tie the active reservations to this order so payment commit/release
        // and late-payment reconciliation actually find them (S17/S22).
        await linkReservationsToOrder(reservation.reservationIds, created.id);
      }
    } catch (dbErr) {
      // Production: a lost order record after gateway-order creation is not
      // acceptable — fail the checkout so nothing is charged.
      if (!isDemoMode()) throw dbErr;
      memoryOrders.set(orderId, {
        id: orderId,
        orderNumber,
        capabilityToken,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingAddress,
        subtotalPaise: cartValidation.subtotalPaise,
        taxPaise: cartValidation.taxPaise,
        shippingPaise: cartValidation.shippingPaise,
        totalPaise: cartValidation.totalPaise,
        orderStatus: "PENDING",
        paymentStatus: "PENDING",
        gatewayOrderId: gatewayOrder.id,
        items: cartValidation.items,
        reservationIds: reservation.reservationIds,
        createdAt: new Date(),
      });
      await linkReservationsToOrder(reservation.reservationIds, orderId);
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        orderNumber,
        capabilityToken,
        gatewayOrderId: gatewayOrder.id,
        keyId: RAZORPAY_KEY_ID,
        amountPaise: cartValidation.totalPaise.toString(),
        currency: "INR",
        expiresAt: reservation.expiresAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Checkout initialize error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during checkout initialization." },
      { status: 500 }
    );
  }
}

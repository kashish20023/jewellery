import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/payment/razorpay";
import { commitReservations } from "@/lib/checkout/reservation";
import { db } from "@/lib/db";
import { memoryOrders } from "@/lib/checkout/memoryOrders";
import { isDemoMode } from "@/lib/runtime";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  orderId: z.string().min(1),
  gatewayPaymentId: z.string().min(1),
  gatewayOrderId: z.string().min(1),
  gatewaySignature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Missing required payment verification parameters." },
        { status: 400 }
      );
    }

    const { orderId, gatewayPaymentId, gatewayOrderId, gatewaySignature } = parsed.data;

    // 1. Verify Payment Signature using HMAC-SHA256 (S18 Invariant)
    const isValid = verifyPaymentSignature({
      orderId: gatewayOrderId,
      paymentId: gatewayPaymentId,
      signature: gatewaySignature,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid payment gateway signature. Verification failed." },
        { status: 400 }
      );
    }

    let capabilityToken = "";
    let orderNumber = "";

    // 2. Transition Order to PAID & CONFIRMED.
    // The order is looked up strictly by the gateway order id that the verified
    // signature covers, and must match the client-claimed order — a valid
    // signature for a cheap order can never confirm a different order.
    try {
      const order = await db.order.findFirst({
        where: { gatewayOrderId },
      });

      if (order && order.id !== orderId) {
        return NextResponse.json(
          { success: false, error: "Payment does not belong to this order." },
          { status: 400 }
        );
      }

      if (order) {
        capabilityToken = order.capabilityToken;
        orderNumber = order.orderNumber;

        await db.order.update({
          where: { id: order.id },
          data: {
            orderStatus: "CONFIRMED",
            paymentStatus: "PAID",
            gatewayPaymentId,
          },
        });

        // Record payment event
        await db.paymentEvent.upsert({
          where: { eventId: `client_verify_${gatewayPaymentId}` },
          update: {},
          create: {
            orderId: order.id,
            eventId: `client_verify_${gatewayPaymentId}`,
            eventType: "payment.client_verified",
            payload: { gatewayPaymentId, gatewayOrderId },
            signatureVerified: true,
          },
        });

        // 3. Commit atomic reservations permanently (S18)
        await commitReservations(order.id);
      }
    } catch (err) {
      // Memory fallback is for demo/test sandboxes only.
      if (!isDemoMode()) throw err;
      const memOrder = memoryOrders.get(orderId);
      if (memOrder && memOrder.gatewayOrderId === gatewayOrderId) {
        memOrder.orderStatus = "CONFIRMED";
        memOrder.paymentStatus = "PAID";
        memOrder.gatewayPaymentId = gatewayPaymentId;
        capabilityToken = memOrder.capabilityToken;
        orderNumber = memOrder.orderNumber;
        await commitReservations(orderId);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order confirmed.",
      orderNumber,
      capabilityToken,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during payment verification." },
      { status: 500 }
    );
  }
}


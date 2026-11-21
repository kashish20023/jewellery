import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payment/razorpay";
import { commitReservations, releaseReservations, handleLatePaymentInventory } from "@/lib/checkout/reservation";
import { db } from "@/lib/db";
import { memoryOrders } from "@/lib/checkout/memoryOrders";
import { Prisma } from "@prisma/client";
import { isDemoMode } from "@/lib/runtime";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface WebhookPayload {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // 1. Mandatory Raw Body HMAC Signature Verification (S20 Invariant)
    const isValidSignature = verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
    }

    // Deterministic event id: replays of the same raw body always collide (idempotency).
    const eventId = payload.id || `evt_sha_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 40)}`;
    const eventType = payload.event || "unknown";

    // 2. Idempotency Check (S20 Invariant)
    try {
      const existingEvent = await db.paymentEvent.findUnique({
        where: { eventId },
      });

      if (existingEvent) {
        // Already processed, return 200 idempotent response immediately
        return NextResponse.json({ status: "ok", duplicate: true });
      }
    } catch {
      // In-memory or offline fallback
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const gatewayOrderId = paymentEntity?.order_id;
    const gatewayPaymentId = paymentEntity?.id;

    // Without an order_id a findFirst({ gatewayOrderId: undefined }) would match an
    // arbitrary order — acknowledge and ignore payloads that carry none.
    if ((eventType === "payment.captured" || eventType === "payment.failed") && !gatewayOrderId) {
      console.warn(`Webhook ${eventType} without payment.entity.order_id ignored (event ${eventId}).`);
      return NextResponse.json({ status: "ok", ignored: true });
    }

    if (eventType === "payment.captured") {
      // 3. Payment Success Flow (S18 & S22)
      try {
        const order = await db.order.findFirst({
          where: { gatewayOrderId },
          include: { items: true, reservations: true },
        });

        if (order) {
          // Defense in depth: a captured amount that differs from the order total
          // is never silently marked PAID (partial captures, tampered notifications).
          const capturedAmount = typeof paymentEntity?.amount === "number" ? BigInt(paymentEntity.amount) : null;
          if (capturedAmount !== null && capturedAmount !== order.totalPaise) {
            await db.order.update({
              where: { id: order.id },
              data: {
                orderStatus: "RECONCILIATION_REQUIRED",
                gatewayPaymentId,
                adminNotes: `AMOUNT MISMATCH: webhook captured ${capturedAmount} paise, order total ${order.totalPaise} paise. Manual reconciliation required.`,
              },
            });
            await db.paymentEvent.create({
              data: { orderId: order.id, eventId, eventType, payload: payload as unknown as Prisma.InputJsonValue, signatureVerified: true },
            }).catch(() => undefined);
            return NextResponse.json({ status: "ok", reconciliation: true });
          }

          const now = new Date();
          // Check if any reservation expired prior to payment arrival (S22 Invariant)
          const hasExpiredReservation = order.reservations.some(
            (r) => r.status === "ACTIVE" && r.expiresAt < now
          );

          if (hasExpiredReservation) {
            // Attempt safe late reallocation
            let allAllocated = true;
            for (const item of order.items) {
              const resStatus = await handleLatePaymentInventory(item.variantId, item.quantity, order.id);
              if (resStatus === "RECONCILIATION_REQUIRED") {
                allAllocated = false;
                break;
              }
            }

            if (allAllocated) {
              await db.order.update({
                where: { id: order.id },
                data: {
                  orderStatus: "CONFIRMED",
                  paymentStatus: "PAID",
                  gatewayPaymentId,
                  adminNotes: "Paid after reservation expiration; stock safely reallocated.",
                },
              });
            } else {
              // Stock was depleted! Flag for staff reconciliation (S22)
              await db.order.update({
                where: { id: order.id },
                data: {
                  orderStatus: "RECONCILIATION_REQUIRED",
                  paymentStatus: "PAID",
                  gatewayPaymentId,
                  adminNotes: "LATE PAYMENT: Stock depleted during checkout. Requires concierge reconciliation / custom procurement.",
                },
              });
            }
          } else {
            // Normal timely payment
            await db.order.update({
              where: { id: order.id },
              data: {
                orderStatus: "CONFIRMED",
                paymentStatus: "PAID",
                gatewayPaymentId,
              },
            });
            await commitReservations(order.id);
          }

          // Record durable payment event
          await db.paymentEvent.create({
            data: {
              orderId: order.id,
              eventId,
              eventType,
              payload: payload as unknown as Prisma.InputJsonValue,
              signatureVerified: true,
            },
          });
        }
      } catch (err) {
        // Memory fallback exists for demo/test sandboxes only. In production a DB
        // failure must surface as 5xx so Razorpay retries the delivery.
        if (!isDemoMode()) throw err;
        for (const order of memoryOrders.values()) {
          if (order.gatewayOrderId === gatewayOrderId) {
            order.orderStatus = "CONFIRMED";
            order.paymentStatus = "PAID";
            order.gatewayPaymentId = gatewayPaymentId;
            await commitReservations(order.id);
          }
        }
      }
    } else if (eventType === "payment.failed") {
      // 4. Payment Failure Flow (S19 Invariant)
      try {
        const order = await db.order.findFirst({
          where: { gatewayOrderId },
        });

        // Out-of-order delivery guard: a failed event for an earlier attempt must
        // never downgrade an order that a captured event already marked PAID.
        if (order && order.paymentStatus !== "PAID") {
          await db.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "FAILED",
              gatewayPaymentId,
            },
          });

          // Release temporary reservations back to stock
          await releaseReservations(order.id);

          await db.paymentEvent.create({
            data: {
              orderId: order.id,
              eventId,
              eventType,
              payload: payload as unknown as Prisma.InputJsonValue,
              signatureVerified: true,
            },
          });
        }
      } catch (err) {
        if (!isDemoMode()) throw err;
        for (const order of memoryOrders.values()) {
          if (order.gatewayOrderId === gatewayOrderId) {
            order.paymentStatus = "FAILED";
            await releaseReservations(order.id);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return NextResponse.json({ error: "Internal webhook processing error" }, { status: 500 });
  }
}

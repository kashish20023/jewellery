import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { memoryOrders } from "@/lib/checkout/memoryOrders";
import { FulfilmentStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateOrderSchema = z.object({
  fulfilmentStatus: z.nativeEnum(FulfilmentStatus).optional(),
  trackingNumber: z.string().trim().optional(),
  carrierName: z.string().trim().optional(),
  adminNotes: z.string().max(2000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true, paymentEvents: true, reservations: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        subtotalPaise: order.subtotalPaise.toString(),
        taxPaise: order.taxPaise.toString(),
        shippingPaise: order.shippingPaise.toString(),
        totalPaise: order.totalPaise.toString(),
        items: order.items.map((i) => ({
          ...i,
          unitPricePaise: i.unitPricePaise.toString(),
          lineTotalPaise: i.lineTotalPaise.toString(),
        })),
      },
    });
  } catch {
    const mem = memoryOrders.get(id);
    if (mem) {
      return NextResponse.json({ success: true, order: mem });
    }
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid order update data" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const updated = await db.order.update({
      where: { id },
      data: {
        ...(data.fulfilmentStatus ? { fulfilmentStatus: data.fulfilmentStatus } : {}),
        ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber } : {}),
        ...(data.carrierName !== undefined ? { carrierName: data.carrierName } : {}),
        ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
      },
    });

    await writeAudit({
      data: {
        userId: session.id,
        action: "FULFILMENT_UPDATE",
        entityType: "Order",
        entityId: id,
        details: data,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order fulfilment updated successfully.",
      order: {
        ...updated,
        subtotalPaise: updated.subtotalPaise.toString(),
        taxPaise: updated.taxPaise.toString(),
        shippingPaise: updated.shippingPaise.toString(),
        totalPaise: updated.totalPaise.toString(),
      },
    });
  } catch {
    const mem = memoryOrders.get(id);
    if (mem) {
      if (data.fulfilmentStatus) mem.fulfilmentStatus = data.fulfilmentStatus;
      if (data.trackingNumber) mem.trackingNumber = data.trackingNumber;
      if (data.carrierName) mem.carrierName = data.carrierName;
      return NextResponse.json({ success: true, order: mem });
    }
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { EnquiryStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateLeadSchema = z.object({
  id: z.string().min(1),
  targetType: z.enum(["LEAD", "APPOINTMENT"]),
  status: z.nativeEnum(EnquiryStatus),
  staffNotes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") as EnquiryStatus | null;

  try {
    const leadWhere = statusFilter ? { status: statusFilter } : {};
    const apptWhere = statusFilter ? { status: statusFilter } : {};

    const [leads, appointments] = await Promise.all([
      db.enquiryLead.findMany({
        where: leadWhere,
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.appointmentRequest.findMany({
        where: apptWhere,
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      success: true,
      leads,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({
      success: true,
      leads: [],
      appointments: [],
      warning: "Database not connected; returned empty leads list.",
    });
  }
}

export async function PATCH(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid lead update payload." },
        { status: 400 }
      );
    }

    const { id, targetType, status, staffNotes } = parsed.data;

    if (targetType === "LEAD") {
      const updated = await db.enquiryLead.update({
        where: { id },
        data: {
          status,
          ...(staffNotes !== undefined ? { staffNotes } : {}),
        },
      });

      await writeAudit({
        data: {
          userId: session.id,
          action: "LEAD_STATUS_UPDATE",
          entityType: "EnquiryLead",
          entityId: id,
          details: { status, staffNotes },
        },
      });

      return NextResponse.json({
        success: true,
        lead: updated,
      });
    } else {
      const updated = await db.appointmentRequest.update({
        where: { id },
        data: {
          status,
          ...(staffNotes !== undefined ? { staffNotes } : {}),
        },
      });

      await writeAudit({
        data: {
          userId: session.id,
          action: "APPOINTMENT_STATUS_UPDATE",
          entityType: "AppointmentRequest",
          entityId: id,
          details: { status, staffNotes },
        },
      });

      return NextResponse.json({
        success: true,
        appointment: updated,
      });
    }
  } catch (error) {
    console.error("Error updating lead status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update lead status." },
      { status: 500 }
    );
  }
}


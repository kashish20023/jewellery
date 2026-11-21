import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/runtime";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";

export const dynamic = "force-dynamic";

const settingsUpdateSchema = z.object({
  storeName: z.string().trim().min(1).optional(),
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/, "WhatsApp number must be 10-15 digits").optional(),
  highValueThresholdInr: z.number().positive().optional(),
  gstPercentage: z.number().min(0).max(100).optional(),
  enablePurchases: z.boolean().optional(),
  contactEmail: z.string().trim().email().optional(),
});

// Fallback settings state if DB connection is unavailable in sandbox
let fallbackSettings = {
  id: "default",
  storeName: "Chudiwalas",
  whatsappNumber: "919876543210",
  highValueThresholdPaise: 10_000_000n,
  gstPercentage: 3.0,
  enablePurchases: true,
  contactEmail: "concierge@chudiwalas.com",
};

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Any authenticated admin role (STAFF, MANAGER, OWNER) can view settings
  try {
    const settings = await db.storeSettings.findUnique({
      where: { id: "default" },
    });

    if (settings) {
      return NextResponse.json({
        success: true,
        settings: {
          ...settings,
          highValueThresholdPaise: settings.highValueThresholdPaise.toString(),
          gstPercentage: Number(settings.gstPercentage),
        },
      });
    }
  } catch {
    // fallback
  }

  return NextResponse.json({
    success: true,
    settings: {
      ...fallbackSettings,
      highValueThresholdPaise: fallbackSettings.highValueThresholdPaise.toString(),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // S13 Invariant: Updating settings requires OWNER role strictly!
  if (!hasRole(session.role, "OWNER")) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden: Only OWNER accounts may modify store settings, tax rules, and thresholds.",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = settingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid settings" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.storeName !== undefined) updateData.storeName = data.storeName;
  if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber;
  if (data.highValueThresholdInr !== undefined) {
    updateData.highValueThresholdPaise = rupeesToPaise(data.highValueThresholdInr);
  }
  if (data.gstPercentage !== undefined) updateData.gstPercentage = data.gstPercentage;
  if (data.enablePurchases !== undefined) updateData.enablePurchases = data.enablePurchases;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;

  try {
    const updated = await db.storeSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        storeName: (data.storeName as string) || "Chudiwalas",
        whatsappNumber: (data.whatsappNumber as string) || "919876543210",
        highValueThresholdPaise: (updateData.highValueThresholdPaise as bigint) || 10_000_000n,
        gstPercentage: (data.gstPercentage as number) || 3.0,
        enablePurchases: data.enablePurchases ?? true,
        contactEmail: (data.contactEmail as string) || "concierge@chudiwalas.com",
      },
    });

    // Record audit log entry
    await writeAudit({
      data: {
        userId: session.id,
        action: "SETTINGS_UPDATE",
        entityType: "StoreSettings",
        entityId: "default",
        details: JSON.parse(
          JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v))
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Store settings updated successfully.",
      settings: {
        ...updated,
        highValueThresholdPaise: updated.highValueThresholdPaise.toString(),
        gstPercentage: Number(updated.gstPercentage),
      },
    });
  } catch (err) {
    // Production: never claim success for a write that did not persist.
    if (!isDemoMode()) {
      console.error("Store settings update failed:", err);
      return NextResponse.json(
        { success: false, error: "Could not save settings — database is unavailable. Please retry." },
        { status: 503 }
      );
    }
    // Demo/test sandboxes keep an in-runtime fallback
    fallbackSettings = {
      ...fallbackSettings,
      ...(updateData as Partial<typeof fallbackSettings>),
    };

    return NextResponse.json({
      success: true,
      message: "Store settings updated in active runtime.",
      settings: {
        ...fallbackSettings,
        highValueThresholdPaise: fallbackSettings.highValueThresholdPaise.toString(),
      },
      warning: "Updated in runtime fallback due to database connection status.",
    });
  }
}

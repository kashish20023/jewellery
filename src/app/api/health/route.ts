import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Verify database connectivity
    await db.$queryRaw`SELECT 1 as healthy`;

    const settings = await db.storeSettings.findUnique({
      where: { id: "default" },
    });

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        timestamp,
        store: {
          name: settings?.storeName || "Chudiwalas",
          currency: "INR",
          highValueThresholdPaise: settings?.highValueThresholdPaise?.toString() || "10000000",
          purchasesEnabled: settings?.enablePurchases ?? true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check database error:", error);
    return NextResponse.json(
      {
        status: "degraded",
        database: "disconnected",
        timestamp,
      },
      { status: 503 }
    );
  }
}

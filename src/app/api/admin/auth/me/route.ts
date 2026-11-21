import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: No valid admin session found." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}


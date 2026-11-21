import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminUser, createSessionToken, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { isDemoMode } from "@/lib/runtime";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Brute-force protection: sliding window per client IP.
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const ipLimit = checkRateLimit(`admin_login_${clientIp}`, { limit: 10, windowMs: 900_000 });
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: "Too many sign-in attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email and password." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await authenticateAdminUser(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or credentials." },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      // The raw token is exposed in the body only for demo/test sandboxes;
      // production clients authenticate via the httpOnly cookie alone.
      ...(isDemoMode() ? { token } : {}),
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}


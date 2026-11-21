import crypto from "crypto";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { isDemoMode, requireSecret } from "@/lib/runtime";

export type AdminRole = "OWNER" | "MANAGER" | "STAFF";

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AdminSessionPayload extends AdminSessionUser {
  iat: number;
  exp: number;
}

export const ADMIN_COOKIE_NAME = "aurum_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
// Resolved lazily so a missing AUTH_SECRET fails at first use in production
// (fail-closed) instead of silently signing sessions with a committed string.
const getAuthSecret = () => requireSecret("AUTH_SECRET", "aurum_atelier_admin_secret_key_2026_secure");

// Role hierarchy matrix: OWNER > MANAGER > STAFF
export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 3,
  MANAGER: 2,
  STAFF: 1,
};

/**
 * Checks if userRole has at least requiredRole privileges.
 */
export function hasRole(userRole: Role | string, requiredRole: Role | AdminRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as Role] || 0;
  const reqLevel = ROLE_HIERARCHY[requiredRole as Role] || 0;
  return userLevel >= reqLevel;
}

/**
 * Generates a PBKDF2 hash of the given password with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100_000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

/**
 * Deterministic test/dev credentials fallback for offline/sandbox test execution.
 */
export const FIXTURE_ADMIN_USERS: Record<string, AdminSessionUser & { passwordHash: string }> = {
  "owner@aurumatelier.internal": {
    id: "admin-owner-default",
    email: "owner@aurumatelier.internal",
    name: "Chudiwalas Owner",
    role: Role.OWNER,
    passwordHash: "pbkdf2$100000$synthetic_salt_owner$40f3b4e6fa189c45b7463f",
  },
  "manager@aurumatelier.internal": {
    id: "admin-manager-default",
    email: "manager@aurumatelier.internal",
    name: "Chudiwalas Manager",
    role: Role.MANAGER,
    passwordHash: "pbkdf2$100000$synthetic_salt_mgr$40f3b4e6fa189c45b7463f",
  },
  "staff@aurumatelier.internal": {
    id: "admin-staff-default",
    email: "staff@aurumatelier.internal",
    name: "Chudiwalas Concierge",
    role: Role.STAFF,
    passwordHash: "pbkdf2$100000$synthetic_salt_stf$40f3b4e6fa189c45b7463f",
  },
};

export const DEFAULT_ADMIN_PASSWORD = "AurumAdmin2026!";

/**
 * Verifies a password against a stored PBKDF2 hash or dev default.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // Shared sandbox password — accepted ONLY in demo/test environments.
  if (isDemoMode() && password === DEFAULT_ADMIN_PASSWORD) {
    return true;
  }

  if (storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedHash = parts[3];
      const actualHash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
      const a = Buffer.from(actualHash);
      const b = Buffer.from(expectedHash);
      if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
      return crypto.timingSafeEqual(a, b);
    }
  }

  return false;
}

/**
 * Signs a stateless admin session token using HMAC-SHA256.
 */
export function createSessionToken(user: AdminSessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a stateless admin session token.
 */
export function verifySessionToken(token: string): AdminSessionPayload | null {
  if (!token || !token.includes(".")) return null;

  try {
    const [payloadB64, providedSig] = token.split(".");
    if (!payloadB64 || !providedSig) return null;

    const expectedSig = crypto
      .createHmac("sha256", getAuthSecret())
      .update(payloadB64)
      .digest("base64url");

    if (providedSig.length !== expectedSig.length) return null;
    const isValid = crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
    if (!isValid) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as AdminSessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticates admin credentials against PostgreSQL or fixture fallback.
 */
export async function authenticateAdminUser(email: string, password: string): Promise<AdminSessionUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await db.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isActive) {
      if (verifyPassword(password, user.passwordHash)) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }
  } catch {
    // Database connection failure fallback (e.g. sandbox or unit test)
  }

  // Fixture admin accounts exist only for demo/test sandboxes; production fails closed.
  if (!isDemoMode()) return null;
  const fixture = FIXTURE_ADMIN_USERS[normalizedEmail];
  if (fixture && verifyPassword(password, fixture.passwordHash)) {
    return {
      id: fixture.id,
      email: fixture.email,
      name: fixture.name,
      role: fixture.role,
    };
  }

  return null;
}

/**
 * Extracts and verifies the admin session from an incoming Request or NextRequest.
 */
export function getAdminSessionFromRequest(req: Request): AdminSessionPayload | null {
  // 1. Check Cookie header
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
  const tokenFromCookie = match ? decodeURIComponent(match[1]) : null;

  if (tokenFromCookie) {
    const payload = verifySessionToken(tokenFromCookie);
    if (payload) return payload;
  }

  // 2. Authorization Bearer header — demo/test sandboxes only; production is cookie-only.
  if (isDemoMode()) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      return verifySessionToken(token);
    }
  }

  return null;
}


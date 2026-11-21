/**
 * Runtime mode guards (S-PROD).
 *
 * DEMO_MODE enables local-sandbox conveniences: the shared demo admin
 * password, fixture admin accounts, in-memory order/reservation fallbacks
 * and synthetic gateway orders. It must NEVER be "true" on a real
 * production deployment — with it off, every secret below fails closed.
 */
export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "development" ||
    process.env.VITEST === "true"
  );
}

/**
 * Returns the configured secret, or the demo fallback in demo mode.
 * Outside demo mode a missing secret throws instead of silently using
 * a value committed to the repository.
 */
export function requireSecret(name: string, demoFallback: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value;
  if (isDemoMode()) return demoFallback;
  throw new Error(`${name} must be set in the environment for production (set DEMO_MODE="true" only for local sandboxes).`);
}

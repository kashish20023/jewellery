/**
 * Test isolation: the suites are written against the in-memory fallbacks
 * (orders, reservations, fixtures). Point Prisma at a closed local port so
 * every DB call fails fast and deterministically instead of mutating the
 * developer's live database. Set TEST_DATABASE_URL to run against a real,
 * disposable Postgres instead.
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://test:test@127.0.0.1:1/chudiwalas_test?connect_timeout=1";

import "@testing-library/jest-dom/vitest";

// Resilient in-memory localStorage shim for jsdom environments
if (typeof window !== "undefined") {
  let store: Record<string, string> = {};

  const storageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };

  try {
    if (!window.localStorage || typeof window.localStorage.getItem !== "function") {
      Object.defineProperty(window, "localStorage", {
        value: storageMock,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }
  } catch {
    // If window.localStorage is read-only, patch global
    (window as any).localStorage = storageMock;
  }
}

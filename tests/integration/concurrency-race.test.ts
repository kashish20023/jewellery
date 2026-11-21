import { describe, it, expect, beforeEach } from "vitest";
import {
  createInventoryReservations,
  setTestStock,
  resetMemoryReservations,
} from "@/lib/checkout/reservation";

describe("Concurrent Race Condition & Atomic Lock (S17 Invariant)", () => {
  beforeEach(() => {
    resetMemoryReservations();
  });

  it("ensures two concurrent buyers competing for the final single unit cannot oversell", async () => {
    const finalUnitVariantId = "var-rare-solitaire-final-1";
    // Stock is set to exactly 1 unit
    setTestStock(finalUnitVariantId, 1);

    // Simulate two concurrent checkout attempts for the single remaining piece
    const buyerA = createInventoryReservations(
      [{ variantId: finalUnitVariantId, quantity: 1 }],
      "order-buyer-a"
    );

    const buyerB = createInventoryReservations(
      [{ variantId: finalUnitVariantId, quantity: 1 }],
      "order-buyer-b"
    );

    const [resultA, resultB] = await Promise.all([buyerA, buyerB]);

    // Exactly one must succeed, and exactly one must fail
    const successes = [resultA, resultB].filter((r) => r.success);
    const failures = [resultA, resultB].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // The winning buyer gets valid reservation
    expect(successes[0].reservationIds).toHaveLength(1);

    // The losing buyer gets out-of-stock notification with the variant ID
    expect(failures[0].error).toContain("no longer available in the requested quantity");
    expect(failures[0].insufficientVariantId).toBe(finalUnitVariantId);
  });

  it("handles high-concurrency race of 10 simultaneous buyers competing for 3 units", async () => {
    const limitedStockVariant = "var-limited-bangle-3";
    setTestStock(limitedStockVariant, 3); // 3 units available

    // 10 concurrent requests
    const buyers = Array.from({ length: 10 }, (_, i) =>
      createInventoryReservations(
        [{ variantId: limitedStockVariant, quantity: 1 }],
        `order-concurrent-${i}`
      )
    );

    const results = await Promise.all(buyers);

    const successfulReservations = results.filter((r) => r.success);
    const rejectedReservations = results.filter((r) => !r.success);

    // Exactly 3 succeed, exactly 7 are rejected
    expect(successfulReservations).toHaveLength(3);
    expect(rejectedReservations).toHaveLength(7);
  });
});


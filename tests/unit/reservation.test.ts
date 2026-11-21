import { describe, it, expect, beforeEach } from "vitest";
import {
  createInventoryReservations,
  commitReservations,
  releaseReservations,
  handleLatePaymentInventory,
  setTestStock,
  resetMemoryReservations,
  RESERVATION_TTL_MS,
} from "@/lib/checkout/reservation";

describe("Inventory Reservation Unit Suite (PRD-F12 / S17 / S19 / S22)", () => {
  beforeEach(() => {
    resetMemoryReservations();
  });

  it("calculates 15-minute TTL accurately upon reservation creation", async () => {
    setTestStock("var-test-1", 5);

    const before = Date.now();
    const result = await createInventoryReservations([{ variantId: "var-test-1", quantity: 1 }]);
    const after = Date.now();

    expect(result.success).toBe(true);
    expect(result.reservationIds).toHaveLength(1);

    const expiresAtMs = result.expiresAt.getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + RESERVATION_TTL_MS);
    expect(expiresAtMs).toBeLessThanOrEqual(after + RESERVATION_TTL_MS + 1000);
  });

  it("blocks checkout when requested quantity exceeds available stock", async () => {
    setTestStock("var-limited-stock", 2);

    const result = await createInventoryReservations([{ variantId: "var-limited-stock", quantity: 3 }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("no longer available in the requested quantity");
    expect(result.insufficientVariantId).toBe("var-limited-stock");
  });

  it("releases active reservations back to stock on payment failure or cancellation (S19)", async () => {
    setTestStock("var-cancel-item", 1);

    // Reserve final unit for order 1
    const res = await createInventoryReservations(
      [{ variantId: "var-cancel-item", quantity: 1 }],
      "order-to-cancel"
    );
    expect(res.success).toBe(true);

    // Second buyer cannot reserve
    const secondTry = await createInventoryReservations([{ variantId: "var-cancel-item", quantity: 1 }]);
    expect(secondTry.success).toBe(false);

    // Release order 1
    await releaseReservations("order-to-cancel");

    // Second buyer can now reserve!
    const thirdTry = await createInventoryReservations([{ variantId: "var-cancel-item", quantity: 1 }]);
    expect(thirdTry.success).toBe(true);
  });

  it("safely allocates stock for late payment when inventory remains (S22)", async () => {
    setTestStock("var-late-stock", 3);

    const outcome = await handleLatePaymentInventory("var-late-stock", 1, "order-late-1");
    expect(outcome).toBe("COMMITTED");
  });

  it("flags RECONCILIATION_REQUIRED when late payment arrives after stock is exhausted (S22)", async () => {
    setTestStock("var-late-depleted", 0); // No stock left

    const outcome = await handleLatePaymentInventory("var-late-depleted", 1, "order-late-2");
    expect(outcome).toBe("RECONCILIATION_REQUIRED");
  });
});


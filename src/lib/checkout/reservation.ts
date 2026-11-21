/**
 * Atomic Inventory Reservation Engine (PRD-F12 / S17 / S19 / S22)
 * 
 * INVARIANTS:
 * 1. 15-minute TTL on temporary checkout reservations.
 * 2. Strict concurrency control: two concurrent buyers competing for the final unit
 *    will never cause overselling. Exactly one succeeds; the other is rejected with INSUFFICIENT_STOCK.
 * 3. Expired or cancelled checkouts release reservations back to available stock.
 * 4. Late payments arriving after reservation expiration attempt safe reallocation;
 *    if stock is no longer available, order transitions to RECONCILIATION_REQUIRED (S22).
 */

import { db } from "@/lib/db";
import { ReservationStatus } from "@prisma/client";
import { isDemoMode } from "@/lib/runtime";

export const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface ReservationItem {
  variantId: string;
  quantity: number;
}

export interface ReservationResult {
  success: boolean;
  reservationIds: string[];
  expiresAt: Date;
  error?: string;
  insufficientVariantId?: string;
}

// Fallback in-memory reservation ledger for deterministic test and sandbox environments
interface MemoryReservation {
  id: string;
  variantId: string;
  orderId: string | null;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
}

const memoryReservations = new Map<string, MemoryReservation>();
// In-memory stock counters for testing (variantId -> stockQuantity)
const memoryStock = new Map<string, number>();

/**
 * Helper to seed/reset memory stock for testing.
 */
export function setTestStock(variantId: string, stock: number): void {
  memoryStock.set(variantId, stock);
}

export function resetMemoryReservations(): void {
  memoryReservations.clear();
  memoryStock.clear();
}

/**
 * Creates atomic inventory reservations for all items in a checkout session.
 */
export async function createInventoryReservations(
  items: ReservationItem[],
  orderId?: string,
  ttlMs = RESERVATION_TTL_MS
): Promise<ReservationResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const createdIds: string[] = [];

  try {
    // 1. Try real PostgreSQL transaction with atomic locking
    const result = await db.$transaction(async (tx) => {
      // Sweep this request's variants: holds past their TTL become RELEASED so
      // the table reflects real availability instead of accumulating dead rows.
      await tx.inventoryReservation.updateMany({
        where: {
          variantId: { in: items.map((i) => i.variantId) },
          status: ReservationStatus.ACTIVE,
          expiresAt: { lte: now },
        },
        data: { status: ReservationStatus.RELEASED },
      });

      for (const item of items) {
        // Serialise concurrent checkouts on the same variant: the row lock makes
        // read-check-insert atomic, so two buyers cannot both take the last unit.
        await tx.$queryRaw`SELECT id FROM "Variant" WHERE id = ${item.variantId} FOR UPDATE`;

        const variant = await tx.variant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new Error(`VARIANT_NOT_FOUND:${item.variantId}`);
        }

        // Calculate currently active (non-expired) reserved quantity
        const activeReservations = await tx.inventoryReservation.findMany({
          where: {
            variantId: item.variantId,
            status: ReservationStatus.ACTIVE,
            expiresAt: { gt: now },
          },
        });

        const currentReserved = activeReservations.reduce((acc, r) => acc + r.quantity, 0);
        const availableStock = variant.stockQuantity - currentReserved;

        if (availableStock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.variantId}`);
        }

        const reservation = await tx.inventoryReservation.create({
          data: {
            variantId: item.variantId,
            orderId: orderId || null,
            quantity: item.quantity,
            status: ReservationStatus.ACTIVE,
            expiresAt,
          },
        });

        createdIds.push(reservation.id);
      }

      return { success: true, reservationIds: createdIds, expiresAt };
    });

    return result;
  } catch (error: unknown) {
    const msg = (error as Error).message || "";
    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      const vId = msg.split(":")[1];
      return {
        success: false,
        reservationIds: [],
        expiresAt,
        error: "One or more items in your bag are no longer available in the requested quantity.",
        insufficientVariantId: vId,
      };
    }
    // Production: any other DB failure aborts checkout instead of inventing
    // phantom stock through the in-memory ledger.
    if (!isDemoMode()) throw error;
  }

  // 2. In-Memory Atomic Reservation Fallback (Used during tests/sandbox when DB is offline)
  for (const item of items) {
    // Determine total stock
    const totalStock = memoryStock.has(item.variantId) ? (memoryStock.get(item.variantId) as number) : 10;

    // Sum active non-expired reservations
    let activeReserved = 0;
    for (const res of memoryReservations.values()) {
      if (
        res.variantId === item.variantId &&
        res.status === ReservationStatus.ACTIVE &&
        res.expiresAt.getTime() > now.getTime()
      ) {
        activeReserved += res.quantity;
      }
    }

    const available = totalStock - activeReserved;
    if (available < item.quantity) {
      return {
        success: false,
        reservationIds: [],
        expiresAt,
        error: "One or more items in your bag are no longer available in the requested quantity.",
        insufficientVariantId: item.variantId,
      };
    }

    const resId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    memoryReservations.set(resId, {
      id: resId,
      variantId: item.variantId,
      orderId: orderId || null,
      quantity: item.quantity,
      status: ReservationStatus.ACTIVE,
      expiresAt,
      createdAt: now,
    });
    createdIds.push(resId);
  }

  return {
    success: true,
    reservationIds: createdIds,
    expiresAt,
  };
}

/**
 * Links freshly created reservations to the persisted order so commit/release
 * and late-payment handling can find them by orderId (S17/S22).
 */
export async function linkReservationsToOrder(reservationIds: string[], orderId: string): Promise<void> {
  if (reservationIds.length === 0) return;
  let linked = 0;
  try {
    const result = await db.inventoryReservation.updateMany({
      where: { id: { in: reservationIds } },
      data: { orderId },
    });
    linked = result.count;
  } catch (error) {
    if (!isDemoMode()) throw error;
  }
  // Demo/test sandboxes: reservations may live in the in-memory ledger instead.
  if (linked < reservationIds.length) {
    for (const id of reservationIds) {
      const res = memoryReservations.get(id);
      if (res) memoryReservations.set(id, { ...res, orderId });
    }
  }
}

/**
 * Commits reservations and permanently decrements stock on payment success (S18).
 */
export async function commitReservations(orderId: string): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId, status: ReservationStatus.ACTIVE },
      });

      for (const res of reservations) {
        await tx.inventoryReservation.update({
          where: { id: res.id },
          data: { status: ReservationStatus.COMMITTED },
        });

        // Decrement physical stock
        await tx.variant.update({
          where: { id: res.variantId },
          data: { stockQuantity: { decrement: res.quantity } },
        });
      }
    });
    return true;
  } catch (error) {
    // Production: surface the failure so the caller (webhook) returns 5xx and retries.
    if (!isDemoMode()) throw error;
    for (const [id, res] of memoryReservations.entries()) {
      if (res.orderId === orderId && res.status === ReservationStatus.ACTIVE) {
        memoryReservations.set(id, { ...res, status: ReservationStatus.COMMITTED });
        const currentStock = memoryStock.get(res.variantId) ?? 10;
        memoryStock.set(res.variantId, Math.max(0, currentStock - res.quantity));
      }
    }
    return true;
  }
}

/**
 * Releases active reservations back to available stock on cancel or failure (S19).
 */
export async function releaseReservations(orderId: string): Promise<boolean> {
  let releasedInDb = 0;
  try {
    const result = await db.inventoryReservation.updateMany({
      where: { orderId, status: ReservationStatus.ACTIVE },
      data: { status: ReservationStatus.RELEASED },
    });
    releasedInDb = result.count;
  } catch {
    // DB offline: fall through to the memory ledger
  }
  // Always reconcile the in-memory ledger too: a reservation created in memory
  // (DB offline or unknown variant) must be releasable even if the DB is back.
  if (releasedInDb === 0) {
    for (const [id, res] of memoryReservations.entries()) {
      if (res.orderId === orderId && res.status === ReservationStatus.ACTIVE) {
        memoryReservations.set(id, { ...res, status: ReservationStatus.RELEASED });
      }
    }
  }
  return true;
}

/**
 * Handles late payment arrival after reservation expiration (S22 Invariant).
 * Attempts to re-allocate inventory; if depleted, flags for staff reconciliation.
 */
export async function handleLatePaymentInventory(
  variantId: string,
  quantity: number,
  orderId: string
): Promise<"COMMITTED" | "RECONCILIATION_REQUIRED"> {
  const now = new Date();

  try {
    return await db.$transaction(async (tx) => {
      const variant = await tx.variant.findUnique({ where: { id: variantId } });
      // Unknown to the DB (sandbox / memory-ledger variant): use the memory path below.
      if (!variant) throw new Error(`VARIANT_NOT_FOUND:${variantId}`);

      const activeReservations = await tx.inventoryReservation.findMany({
        where: {
          variantId,
          status: ReservationStatus.ACTIVE,
          expiresAt: { gt: now },
        },
      });

      const reservedQty = activeReservations.reduce((acc, r) => acc + r.quantity, 0);
      const available = variant.stockQuantity - reservedQty;

      if (available >= quantity) {
        // Stock still available! Safely commit
        await tx.inventoryReservation.create({
          data: {
            variantId,
            orderId,
            quantity,
            status: ReservationStatus.COMMITTED,
            expiresAt: now,
          },
        });

        await tx.variant.update({
          where: { id: variantId },
          data: { stockQuantity: { decrement: quantity } },
        });

        return "COMMITTED";
      }

      // Stock is exhausted! Flag for concierge reconciliation
      return "RECONCILIATION_REQUIRED";
    });
  } catch {
    // In-memory fallback
    const stock = memoryStock.get(variantId) ?? 0;
    if (stock >= quantity) {
      memoryStock.set(variantId, stock - quantity);
      return "COMMITTED";
    }
    return "RECONCILIATION_REQUIRED";
  }
}


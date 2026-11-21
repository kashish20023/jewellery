import type { ValidatedCartItem } from "./cartValidation";

/**
 * In-memory order ledger used when the database is offline (tests, sandbox).
 * Lives outside the route module because Next.js route files may only export
 * handlers and config.
 */
export interface MemoryOrderRecord {
  id: string;
  orderNumber: string;
  capabilityToken: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Record<string, unknown>;
  subtotalPaise: bigint;
  taxPaise: bigint;
  shippingPaise: bigint;
  totalPaise: bigint;
  orderStatus: string;
  paymentStatus: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  fulfilmentStatus?: string;
  trackingNumber?: string;
  carrierName?: string;
  items: ValidatedCartItem[];
  reservationIds: string[];
  createdAt: Date;
}

export const memoryOrders = new Map<string, MemoryOrderRecord>();

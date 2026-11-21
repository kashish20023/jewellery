"use client";

import { useEffect } from "react";
import { trackPurchase, PurchaseEventPayload } from "@/lib/analytics";

interface OrderAnalyticsTrackerProps {
  order: PurchaseEventPayload;
}

/**
 * Fires deduplicated, privacy-first purchase event on client mount (S27).
 * Strictly contains zero customer PII.
 */
export function OrderAnalyticsTracker({ order }: OrderAnalyticsTrackerProps) {
  useEffect(() => {
    trackPurchase(order);
  }, [order]);

  return null;
}


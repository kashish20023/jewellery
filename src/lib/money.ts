/**
 * Centralized Money Arithmetic & Currency Formatting Module
 * 
 * INVARIANTS:
 * 1. All monetary values stored and calculated strictly in integer paise (1 INR = 100 paise).
 * 2. Floating-point arithmetic for currency totals is strictly forbidden.
 * 3. Threshold check is strictly inclusive: pricePaise >= thresholdPaise.
 * 4. Zero or null prices must never leak as free goods or 0 INR in customer-facing flows.
 */

export const DEFAULT_HIGH_VALUE_THRESHOLD_PAISE = 10_000_000n; // ₹1,00,000.00
export const DEFAULT_GST_PERCENTAGE = 3.0; // 3% GST on precious jewellery in India

/**
 * Converts integer paise into formatted INR currency string.
 * Example: 10000000n -> "₹1,00,000" or "₹1,00,000.00"
 */
export function formatPaiseToInr(
  paise: bigint | number | null | undefined,
  options?: { includeDecimals?: boolean }
): string {
  if (paise === null || paise === undefined) {
    return "Price upon request";
  }

  const numericPaise = typeof paise === "bigint" ? Number(paise) : paise;
  if (!Number.isFinite(numericPaise) || numericPaise < 0) {
    return "Price upon request";
  }

  const rupees = numericPaise / 100;
  const includeDecimals = options?.includeDecimals ?? (numericPaise % 100 !== 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Converts standard Rupee amount to integer paise (BigInt).
 */
export function inrToPaise(rupees: number | string): bigint {
  const num = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid Rupee amount: ${rupees}`);
  }
  // Round to nearest integer paise to eliminate floating point imprecision
  return BigInt(Math.round(num * 100));
}

export const rupeesToPaise = inrToPaise;

/**
 * Converts integer paise to numerical Rupee value (for display/analytics where float is accepted).
 */
export function paiseToInr(paise: bigint | number): number {
  const numeric = typeof paise === "bigint" ? Number(paise) : paise;
  return numeric / 100;
}

/**
 * Checks whether a price is classified as high-value requiring or prompting consultation.
 * Comparison is strictly pricePaise >= thresholdPaise.
 */
export function isHighValueItem(
  pricePaise: bigint | number | null | undefined,
  thresholdPaise: bigint | number = DEFAULT_HIGH_VALUE_THRESHOLD_PAISE
): boolean {
  if (pricePaise === null || pricePaise === undefined) {
    return false;
  }
  const price = typeof pricePaise === "bigint" ? pricePaise : BigInt(pricePaise);
  const threshold = typeof thresholdPaise === "bigint" ? thresholdPaise : BigInt(thresholdPaise);
  return price >= threshold;
}

/**
 * Computes GST and total amounts using BigInt integer arithmetic.
 * In India, precious metals/jewellery GST is currently 3%.
 * GST paise = round(subtotalPaise * gstPercent / 100)
 */
export function calculateOrderFinancials(
  subtotalPaise: bigint,
  gstPercentage: number = DEFAULT_GST_PERCENTAGE,
  shippingPaise: bigint = 0n
): {
  subtotalPaise: bigint;
  taxPaise: bigint;
  shippingPaise: bigint;
  totalPaise: bigint;
} {
  if (subtotalPaise < 0n) {
    throw new Error("Subtotal cannot be negative");
  }

  // Integer math for percentage with half-up rounding:
  // (subtotalPaise * gstHundredths + 5000n) / 10000n
  const gstHundredths = BigInt(Math.round(gstPercentage * 100));
  const taxPaise = (subtotalPaise * gstHundredths + 5000n) / 10000n;
  const totalPaise = subtotalPaise + taxPaise + shippingPaise;

  return {
    subtotalPaise,
    taxPaise,
    shippingPaise,
    totalPaise,
  };
}


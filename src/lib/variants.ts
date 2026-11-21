import type { PublicProductDto, PublicVariantDto } from "./types";

/**
 * Variant resolution helpers shared by cards, listing, product page and tests.
 * All pricing stays in the DTO (paise strings); nothing here derives a price.
 */

/** A variant customers may actually buy or at least see a public price for. */
export function isPublicEligible(v: PublicVariantDto): boolean {
  return v.policy.priceVisibility === "PUBLIC" && v.pricePaise !== null && v.pricePaise !== undefined;
}

/** Variants that are purchasable or enquiry-able (not archived from the storefront). */
export function eligibleVariants(product: PublicProductDto): PublicVariantDto[] {
  return product.variants.filter(isPublicEligible);
}

/**
 * Price presentation for an unconfigured card: "From ₹…" only when eligible
 * public variants genuinely differ; the exact amount otherwise.
 */
export function cardPrice(product: PublicProductDto, candidates?: PublicVariantDto[]): {
  variant: PublicVariantDto;
  label: string;
  isFrom: boolean;
} {
  const pool = (candidates && candidates.length ? candidates : eligibleVariants(product)).filter(isPublicEligible);
  if (pool.length === 0) {
    const v = product.defaultVariant;
    return { variant: v, label: v.formattedPrice, isFrom: false };
  }
  const sorted = [...pool].sort((a, b) => (BigInt(a.pricePaise!) < BigInt(b.pricePaise!) ? -1 : BigInt(a.pricePaise!) > BigInt(b.pricePaise!) ? 1 : 0));
  const cheapest = sorted[0];
  const distinct = new Set(pool.map((v) => v.pricePaise)).size;
  const isFrom = distinct > 1;
  return { variant: cheapest, label: isFrom ? `From ${cheapest.formattedPrice}` : cheapest.formattedPrice, isFrom };
}

/** Finds a variant by SKU (case-insensitive) or id; null when stale or archived. */
export function findVariant(product: PublicProductDto, ref?: string | null): PublicVariantDto | null {
  if (!ref) return null;
  const key = ref.trim().toLowerCase();
  return product.variants.find((v) => v.sku.toLowerCase() === key || v.id.toLowerCase() === key) || null;
}

/** Safe initial selection: requested variant if it exists, else the default. */
export function initialVariant(product: PublicProductDto, ref?: string | null): PublicVariantDto {
  return findVariant(product, ref) || product.defaultVariant;
}

export type OptionKey = "metalColour" | "purityLabel" | "size";

/**
 * Picks the variant that best matches one changed option while keeping the
 * other two when possible. Returns the variant and whether another option
 * had to change (so the UI can say "switched to …").
 */
export function pickVariant(
  product: PublicProductDto,
  current: PublicVariantDto,
  key: OptionKey,
  value: string
): { variant: PublicVariantDto; changed: OptionKey[] } {
  const want = {
    metalColour: key === "metalColour" ? value : current.metalColour,
    purityLabel: key === "purityLabel" ? value : current.purityLabel,
    size: key === "size" ? value : current.size || "",
  };
  const get = (v: PublicVariantDto, k: OptionKey) => (k === "size" ? v.size || "" : v[k]);
  const score = (v: PublicVariantDto) =>
    (get(v, "metalColour") === want.metalColour ? 4 : 0) +
    (get(v, "purityLabel") === want.purityLabel ? 2 : 0) +
    (get(v, "size") === want.size ? 1 : 0);

  const candidates = product.variants.filter((v) => get(v, key) === value);
  const pool = candidates.length ? candidates : product.variants;
  const best = [...pool].sort((a, b) => score(b) - score(a))[0] || current;
  const changed = (["metalColour", "purityLabel", "size"] as OptionKey[]).filter(
    (k) => k !== key && get(best, k) !== get(current, k)
  );
  return { variant: best, changed };
}

/** True when some variant carries this option value at all. */
export function optionExists(product: PublicProductDto, key: OptionKey, value: string): boolean {
  return product.variants.some((v) => (key === "size" ? v.size || "" : v[key]) === value);
}

/** True when this option value exists together with the other two current selections. */
export function optionCompatible(product: PublicProductDto, current: PublicVariantDto, key: OptionKey, value: string): boolean {
  return product.variants.some((v) => {
    const own = key === "size" ? v.size || "" : v[key];
    if (own !== value) return false;
    const others = (["metalColour", "purityLabel", "size"] as OptionKey[]).filter((k) => k !== key);
    return others.every((k) => (k === "size" ? v.size || "" : v[k]) === (k === "size" ? current.size || "" : current[k]));
  });
}

/** Gallery media for a variant: variant-assigned photos first, else product photos. */
export function mediaForVariant(product: PublicProductDto, variantId: string) {
  const own = product.media.filter((m) => m.variantId === variantId);
  if (own.length) return own;
  return product.media.filter((m) => !m.variantId);
}

/** Shareable URL for a variant, e.g. /products/slug?variant=SKU */
export function variantHref(product: PublicProductDto, variant: PublicVariantDto, basePath = "/products"): string {
  return `${basePath}/${product.slug}?variant=${encodeURIComponent(variant.sku)}`;
}

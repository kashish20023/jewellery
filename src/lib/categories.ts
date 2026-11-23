/**
 * Storefront category registry.
 *
 * `category` on a product is a plain slug ("chokers", "rings", …). This maps
 * each one to the label, banner photograph and standfirst used by the listing
 * banner, so /shop?category=rings reads as a real category page rather than
 * an unlabelled filter. Banner photographs intentionally match the homepage
 * category tiles so the two surfaces agree.
 */
export interface CategoryDefinition {
  slug: string;
  label: string;
  description: string;
  bannerImageUrl: string;
}

// Banner photographs are served from Cloudinary (chudiwalas/catalogue/photo-<id>,
// uploaded by scripts/upload-media-to-cloudinary.ts). `extra` takes a Cloudinary
// transformation such as "e_saturation:-65".
const U = (id: string, extra?: string) => {
  const transform = ["f_auto", "q_auto", "w_1800", ...(extra ? [extra] : [])].join(",");
  return `https://res.cloudinary.com/b3ddq6fp/image/upload/${transform}/chudiwalas/catalogue/photo-${id}.jpg`;
};

export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: "chokers",
    label: "Chokers",
    description:
      "Close-set polki and jadau collars worn high on the neck, finished in meenakari enamel on the reverse.",
    bannerImageUrl: U("1588444837495-c6cfeb53f32d"),
  },
  {
    slug: "necklaces",
    label: "Necklaces & pendants",
    description:
      "From single-stone pendants to layered haars, each strung and set on our own bench in Jaipur.",
    bannerImageUrl: U("1589128777073-263566ae5e4d"),
  },
  {
    slug: "earrings",
    label: "Earrings & jhumkas",
    description:
      "Studs, drops and jhumkas balanced for everyday wear, in hallmarked gold with certified stones.",
    bannerImageUrl: U("1535632066927-ab7c9ab60908", "e_saturation:-65"),
  },
  {
    slug: "rings",
    label: "Rings & bands",
    description:
      "Solitaires, cocktail rings and signet bands, sized to order and dispatched with their certificate.",
    bannerImageUrl: U("1603561591411-07134e71a2a9"),
  },
  {
    slug: "bracelets",
    label: "Bracelets & kadas",
    description:
      "Tennis lines, kadas and chain bracelets, built to sit flat and close without catching.",
    bannerImageUrl: U("1573408301185-9146fe634ad0"),
  },
  {
    slug: "bangles",
    label: "Bangles & chudiyan",
    description:
      "Kadas, openable bangles and chudi sets in hallmarked gold, sized on the wrist before they leave the bench.",
    bannerImageUrl: U("1512163143273-bde0e3cc7407"),
  },
  {
    slug: "mangalsutra",
    label: "Mangalsutra",
    description:
      "Contemporary and traditional mangalsutra, strung on black beads or a gold chain, with certified diamond or polki centres.",
    bannerImageUrl: U("1605100804763-247f67b3557e"),
  },
];

/** The slugs the admin product form offers, in navbar order. */
export const CATEGORY_SLUGS: string[] = CATEGORIES.map((c) => c.slug);

/** Returns the category definition for a slug, or null for unknown / "all". */
export function getCategory(slug?: string | null): CategoryDefinition | null {
  if (!slug || slug === "all") return null;
  const needle = slug.trim().toLowerCase();
  return CATEGORIES.find((c) => c.slug === needle) ?? null;
}

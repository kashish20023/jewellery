/**
 * Storefront navigation data.
 *
 * The header is data-driven: its "Category" menu comes from the category
 * registry (`src/lib/categories.ts`) and its "Collections" menu from the
 * Collection table, so a collection created in the admin portal appears in
 * the navbar without a code change. Collections can be kept out of the menu
 * with `showInNav = false` while still having their own /collections/<slug>
 * page.
 */
import { unstable_cache } from "next/cache";
import { CATEGORIES, type CategoryDefinition } from "./categories";
import { db } from "./db";
import { FIXTURE_COLLECTIONS } from "./fixtures/products";

export interface NavCollection {
  slug: string;
  title: string;
  bannerImageUrl: string | null;
}

export interface NavigationData {
  categories: CategoryDefinition[];
  collections: NavCollection[];
}

function fixtureNavCollections(): NavCollection[] {
  return FIXTURE_COLLECTIONS.map((c) => ({
    slug: c.slug,
    title: c.title,
    bannerImageUrl: c.bannerImageUrl ?? null,
  }));
}

/**
 * Cache tag for the navbar's collection menu. The root layout renders that
 * menu on every page, so an uncached query here would make the whole
 * storefront dynamic; writes bust this tag instead.
 */
export const NAV_COLLECTIONS_TAG = "nav-collections";

/**
 * Collections to list in the navbar, ordered the way the admin ordered them.
 * Falls back to fixtures only when the database is unreachable — an owner who
 * unticks every collection gets an empty menu, not the fixtures.
 *
 * Exported uncached for tests and scripts; pages go through
 * `getNavCollections`, which wraps this in the tagged cache.
 */
export async function queryNavCollections(): Promise<NavCollection[]> {
  try {
    return await db.collection.findMany({
      where: { isArchived: false, showInNav: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true, bannerImageUrl: true },
    });
  } catch (err) {
    console.warn("Database unavailable; loading navbar collections from fixtures.", err);
    return fixtureNavCollections();
  }
}

export const getNavCollections = unstable_cache(queryNavCollections, [NAV_COLLECTIONS_TAG], {
  tags: [NAV_COLLECTIONS_TAG],
  revalidate: 3600,
});

/** Everything the header needs in one call. */
export async function getNavigation(): Promise<NavigationData> {
  return {
    categories: CATEGORIES,
    collections: await getNavCollections(),
  };
}

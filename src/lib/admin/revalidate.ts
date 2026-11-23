import { revalidatePath, revalidateTag } from "next/cache";
import { NAV_COLLECTIONS_TAG } from "@/lib/navigation";

/**
 * Refreshes every surface that reads collections: the index, the collection
 * pages, the listing, and the navbar's Collections menu — that menu is
 * rendered by the root layout from a tagged cache, so a new, renamed or
 * hidden collection has to bust the tag as well as the paths.
 */
export function revalidateCollectionSurfaces() {
  try {
    revalidateTag(NAV_COLLECTIONS_TAG);
    revalidatePath("/collections");
    revalidatePath("/collections/[slug]", "page");
    revalidatePath("/shop");
  } catch {
    // no-op outside the Next runtime (scripts, tests)
  }
}

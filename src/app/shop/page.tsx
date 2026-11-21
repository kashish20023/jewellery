import React from "react";
import { Suspense } from "react";
import { getCatalogueProducts } from "@/lib/catalogue";
import { CollectionExperience } from "@/components/catalogue/CollectionExperience";
import { ListingBanner } from "@/components/catalogue/ListingBanner";
import { getCategory } from "@/lib/categories";
import { constructMetadata } from "@/lib/seo";

interface ShopPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ searchParams }: ShopPageProps) {
  const { category } = await searchParams;
  const cat = getCategory(category);

  if (cat) {
    return constructMetadata({
      title: cat.label,
      description: cat.description,
      path: `/shop?category=${cat.slug}`,
      ogImage: cat.bannerImageUrl,
    });
  }

  return constructMetadata({
    title: "Shop All Jewellery",
    description:
      "Every Chudiwalas piece in one place. Filter by category, budget, metal colour, purity and availability. Ready-to-ship and made-to-order polki, jadau and solitaires from our Jaipur workshop.",
    path: "/shop",
  });
}

export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category } = await searchParams;
  const cat = getCategory(category);
  const products = await getCatalogueProducts();

  // CollectionExperience applies the category filter client-side from the URL;
  // count here so the banner reports the category's own total, not the catalogue's.
  const shownCount = cat ? products.filter((p) => p.category === cat.slug).length : products.length;

  const collection = {
    id: cat?.slug ?? "all",
    slug: cat?.slug ?? "all",
    title: cat?.label ?? "All jewellery",
    description: cat?.description ?? "Every piece from the Jaipur workshop.",
    bannerImageUrl: cat?.bannerImageUrl ?? null,
    productCount: shownCount,
  };

  return (
    <div>
      <ListingBanner
        title={collection.title}
        description={
          cat
            ? cat.description
            : "Hallmarked, certified and priced at the workshop. Use the filters to narrow by category, budget, metal colour, purity or what ships now."
        }
        imageUrl={cat?.bannerImageUrl ?? null}
        meta={`${shownCount} ${shownCount === 1 ? "piece" : "pieces"}`}
        priority
      />

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Suspense fallback={<div className="py-16 text-center text-sm text-charcoal-500">Loading pieces…</div>}>
          <CollectionExperience collection={collection} initialProducts={products} productBasePath="/products" />
        </Suspense>
      </div>
    </div>
  );
}

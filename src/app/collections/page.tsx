import React from "react";
import Link from "next/link";
import { getCollections } from "@/lib/catalogue";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Collections",
  description:
    "Explore Chudiwalas suites: polki and jadau, certified solitaires, bridal heirlooms and everyday fine jewellery.",
  path: "/collections",
});

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="display-lg text-charcoal-950">Collections</h1>
        <p className="lede mt-4 text-charcoal-700">
          From Mughal-inspired polki choker suites to contemporary diamond solitaires.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        {collections.map((col) => (
          <Link key={col.slug} href={`/collections/${col.slug}`} className="group block">
            <div className="relative aspect-[16/10] w-full overflow-hidden tile-product">
              <ImageWithFallback
                src={col.bannerImageUrl || ""}
                alt={col.title}
                fallbackTitle={col.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center img-zoom"
              />
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-normal text-charcoal-950 group-hover:text-olive-700 transition-colors">{col.title}</h2>
              <p className="mt-1.5 text-sm text-charcoal-600 line-clamp-2 measure">{col.description}</p>
              <p className="meta mt-2 text-charcoal-500">
                {col.productCount} {col.productCount === 1 ? "piece" : "pieces"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCollectionBySlug, getCatalogueProducts } from "@/lib/catalogue";
import { CollectionExperience } from "@/components/catalogue/CollectionExperience";
import { ListingBanner } from "@/components/catalogue/ListingBanner";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  constructMetadata,
  constructCollectionJsonLd,
  constructBreadcrumbJsonLd,
  SITE_URL,
} from "@/lib/seo";
import { ChevronRight } from "lucide-react";

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    metal?: string;
    sort?: "featured" | "price_asc" | "price_desc" | "newest";
    inStock?: string;
    q?: string;
  }>;
}

export async function generateMetadata({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return constructMetadata({ title: "Collection Not Found" });

  return constructMetadata({
    title: collection.title,
    description: collection.description || "Curated Indian Haute Joaillerie Suite",
    path: `/collections/${collection.slug}`,
    ogImage: collection.bannerImageUrl || undefined,
  });
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  // Multi-axis filtering & URL state persistence (S02)
  const products = await getCatalogueProducts({
    collectionSlug: slug,
    metal: sParams.metal,
    sort: sParams.sort,
    inStockOnly: sParams.inStock === "true",
    search: sParams.q,
  });

  const canonicalUrl = `${SITE_URL}/collections/${collection.slug}`;
  const collectionJsonLd = constructCollectionJsonLd(collection, products, canonicalUrl);
  const breadcrumbJsonLd = constructBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: collection.title, path: `/collections/${collection.slug}` },
  ]);

  const breadcrumb = (
    <nav className="flex items-center gap-2 text-[13px] text-charcoal-500" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-olive-700 transition-colors">
        Home
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-charcoal-300" />
      <Link href="/collections" className="hover:text-olive-700 transition-colors">
        Collections
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-charcoal-300" />
      <span className="text-charcoal-800">{collection.title}</span>
    </nav>
  );

  return (
    <div>
      {/* Inject Structured JSON-LD */}
      <JsonLd data={[collectionJsonLd, breadcrumbJsonLd]} />

      <ListingBanner
        title={collection.title}
        description={collection.description}
        imageUrl={collection.bannerImageUrl}
        eyebrow={breadcrumb}
        meta={`${products.length} ${products.length === 1 ? "piece" : "pieces"}`}
        priority
      />

      {/* Collection Experience with Modern Filters & Product Grid */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <CollectionExperience collection={collection} initialProducts={products} />
      </div>
    </div>
  );
}

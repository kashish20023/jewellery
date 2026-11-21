import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getCollectionBySlug, getCatalogueProducts, getActiveOffers } from "@/lib/catalogue";
import { ProductStage } from "@/components/product/ProductStage";
import { ProductCard } from "@/components/product/ProductCard";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  constructMetadata,
  constructProductJsonLd,
  constructBreadcrumbJsonLd,
  SITE_URL,
} from "@/lib/seo";
import { ChevronRight } from "lucide-react";

interface CollectionProductPageProps {
  params: Promise<{
    slug: string;
    productSlug: string;
  }>;
  searchParams?: Promise<{ variant?: string }>;
}

export async function generateMetadata({ params }: CollectionProductPageProps) {
  const { productSlug } = await params;
  const product = await getProductBySlug(productSlug);
  if (!product) return constructMetadata({ title: "Piece Not Found" });

  const primaryImage = product.media[0]?.url;

  return constructMetadata({
    title: product.title,
    description: product.description,
    path: `/products/${product.slug}`,
    ogImage: primaryImage,
  });
}

export default async function CollectionProductDetailPage({ params, searchParams }: CollectionProductPageProps) {
  const { slug, productSlug } = await params;
  const { variant: variantRef } = (await searchParams) || {};
  const [collection, product] = await Promise.all([
    getCollectionBySlug(slug),
    getProductBySlug(productSlug),
  ]);

  if (!product) {
    notFound();
  }

  // Related pieces (other products from the catalogue, excluding active)
  const [allProducts, offers] = await Promise.all([getCatalogueProducts(), getActiveOffers()]);
  const relatedProducts = allProducts
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => (a.category === product.category ? -1 : 0) - (b.category === product.category ? -1 : 0))
    .slice(0, 4);

  // Truthful JSON-LD Schema.org representation (canonical pointing to root /products/${slug})
  const canonicalUrl = `${SITE_URL}/products/${product.slug}`;
  const productJsonLd = constructProductJsonLd(product, canonicalUrl);

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
  ];

  if (collection) {
    breadcrumbItems.push({
      name: collection.title,
      path: `/collections/${collection.slug}`,
    });
  }

  breadcrumbItems.push({
    name: product.title,
    path: collection
      ? `/collections/${collection.slug}/products/${product.slug}`
      : `/products/${product.slug}`,
  });

  const breadcrumbJsonLd = constructBreadcrumbJsonLd(breadcrumbItems);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24 md:pb-12">
      {/* Inject Structured JSON-LD */}
      <JsonLd data={[productJsonLd, breadcrumbJsonLd]} />

      {/* Breadcrumb Navigation showing Collection context */}
      <nav
        className="flex items-center space-x-2 text-[11px] uppercase tracking-[0.14em] text-charcoal-600 mb-8 overflow-x-auto whitespace-nowrap"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-olive-700 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <Link href="/collections" className="hover:text-olive-700 transition-colors">
          Collections
        </Link>
        {collection && (
          <>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link
              href={`/collections/${collection.slug}`}
              className="hover:text-olive-700 transition-colors"
            >
              {collection.title}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 shrink-0" />
        <span className="text-charcoal-900 font-medium truncate">{product.title}</span>
      </nav>

      {/* Gallery + purchase controls share one selected variant */}
      <ProductStage product={product} offers={offers} initialVariantRef={variantRef || null} />

      {/* Related Pieces Atelier Recommendation */}
      {relatedProducts.length > 0 && (
        <section className="mt-24 pt-16 border-t border-charcoal-100">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="mt-3 text-3xl font-semibold text-charcoal-950">You may also like</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed current={product} />
    </div>
  );
}


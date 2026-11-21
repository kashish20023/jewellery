import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getCatalogueProducts, getActiveOffers } from "@/lib/catalogue";
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

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{ variant?: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return constructMetadata({ title: "Piece Not Found" });

  const primaryImage = product.media[0]?.url;

  return constructMetadata({
    title: product.title,
    description: product.description,
    path: `/products/${product.slug}`,
    ogImage: primaryImage,
  });
}

export default async function ProductDetailPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const { variant: variantRef } = (await searchParams) || {};
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Related pieces (other products from the catalogue, excluding active)
  const [allProducts, offers] = await Promise.all([getCatalogueProducts(), getActiveOffers()]);
  const relatedProducts = allProducts
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => (a.category === product.category ? -1 : 0) - (b.category === product.category ? -1 : 0))
    .slice(0, 4);

  // Truthful JSON-LD Schema.org representation (guaranteeing ZERO PRICE LEAK for ON_REQUEST)
  const canonicalUrl = `${SITE_URL}/products/${product.slug}`;
  const productJsonLd = constructProductJsonLd(product, canonicalUrl);

  const breadcrumbJsonLd = constructBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: product.title, path: `/products/${product.slug}` },
  ]);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24 md:pb-12">
      {/* Inject Structured JSON-LD */}
      <JsonLd data={[productJsonLd, breadcrumbJsonLd]} />

      {/* Breadcrumb Navigation */}
      <nav
        className="flex items-center space-x-2 text-[13px] text-charcoal-500 mb-8 overflow-x-auto whitespace-nowrap"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-olive-700 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <Link href="/collections" className="hover:text-olive-700 transition-colors">
          Collections
        </Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <span className="text-charcoal-900 font-medium truncate">{product.title}</span>
      </nav>

      {/* Gallery + purchase controls share one selected variant */}
      <ProductStage product={product} offers={offers} initialVariantRef={variantRef || null} />

      {/* Related Pieces Atelier Recommendation */}
      {relatedProducts.length > 0 && (
        <section className="mt-24 pt-16 border-t border-border">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="head-section">You may also like</h2>
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

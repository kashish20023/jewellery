import React from "react";
import Link from "next/link";
import { FIXTURE_COLLECTIONS } from "@/lib/fixtures/products";
import { getCatalogueProducts, getCollections } from "@/lib/catalogue";
import { ProductCard } from "@/components/product/ProductCard";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { ShieldCheck, Sparkles, RefreshCcw } from "lucide-react";

export const dynamic = "force-dynamic";

/* Fixture imagery until the atelier shoot is delivered. Each slot uses a
   distinct photograph so no two tiles on the page repeat. */
const IMG = {
  hero: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_2400/v1795259023/chudiwalas/catalogue/photo-1611652022419-a9419f74343d.jpg",
  // "The hands that export it" — the workshop band shows hands, not a product.
  workshop: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1600/v1795259017/chudiwalas/catalogue/photo-1596944924616-7b38e7cfac36.jpg",
  chokers: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_900/v1795259015/chudiwalas/catalogue/photo-1588444837495-c6cfeb53f32d.jpg",
  necklaces: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_900/v1795259016/chudiwalas/catalogue/photo-1589128777073-263566ae5e4d.jpg",
  earrings: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_900/v1795259010/chudiwalas/catalogue/photo-1535632066927-ab7c9ab60908.jpg",
  rings: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_900/v1795259020/chudiwalas/catalogue/photo-1603561591411-07134e71a2a9.jpg",
  bracelets: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_900/v1795259014/chudiwalas/catalogue/photo-1573408301185-9146fe634ad0.jpg",
  bridal: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_900/v1795259026/chudiwalas/catalogue/photo-1620656798579-1984d9e87df7.jpg",
  editBridal: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1200/v1795255342/chudiwalas/catalogue/photo-1610694955371-d4a3e0ce4b52.jpg",
  everyday: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1200/v1795259011/chudiwalas/catalogue/photo-1550639525-c97d455acf70.jpg",
  gifting: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1200/v1795259006/chudiwalas/catalogue/photo-1512163143273-bde0e3cc7407.jpg",
  newin: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1200/v1795259024/chudiwalas/catalogue/photo-1617038260897-41a1f14a8ca0.jpg",
};

const CATEGORIES = [
  { label: "Chokers", href: "/shop?category=chokers", image: IMG.chokers },
  { label: "Necklaces", href: "/shop?category=necklaces", image: IMG.necklaces },
  { label: "Earrings", href: "/shop?category=earrings", image: IMG.earrings },
  { label: "Rings", href: "/shop?category=rings", image: IMG.rings },
  { label: "Bracelets", href: "/shop?category=bracelets", image: IMG.bracelets },
  { label: "Bridal", href: "/collections/bridal-connoisseur", image: IMG.bridal },
];

const EDITS = [
  { label: "Bridal", caption: "Full heirloom suites", href: "/collections/bridal-connoisseur", image: IMG.editBridal },
  { label: "Everyday", caption: "Under ₹50,000", href: "/shop?price=under-50k", image: IMG.everyday },
  { label: "Gifting", caption: "Ships in 2 days", href: "/shop?availability=ready", image: IMG.gifting },
  { label: "New in", caption: "Latest off the bench", href: "/shop?sort=newest", image: IMG.newin },
];

const TRUST = [
  { icon: ShieldCheck, label: "BIS hallmarked with HUID" },
  { icon: Sparkles, label: "IGI / SGL certified natural stones" },
  { icon: RefreshCcw, label: "Lifetime exchange, insured delivery" },
];

export default async function HomePage() {
  const [publicProducts, liveCollections] = await Promise.all([getCatalogueProducts(), getCollections()]);
  const featured = [...publicProducts].sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller)).slice(0, 8);

  const collections = FIXTURE_COLLECTIONS.slice(0, 3).map((fc) => {
    const live = liveCollections.find((c) => c.slug === fc.slug);
    return { ...fc, title: live?.title || fc.title, description: live?.description || fc.description, bannerImageUrl: live?.bannerImageUrl || fc.bannerImageUrl };
  });
  const [leadCollection, ...restCollections] = collections;

  return (
    <div className="bg-ivory-100">
      {/* 1. HERO — asymmetric split: the photograph holds the right, the
             proposition holds an ivory panel that cuts into it on desktop. */}
      <section className="relative">
        <div className="grid lg:grid-cols-12 lg:min-h-[86vh]">
          <div className="relative order-1 lg:order-2 lg:col-span-7 aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto overflow-hidden">
            {/* The entrance scale lives on an inner layer so the clip actually
                contains it and never widens the document. */}
            <div className="absolute inset-0 hero-frame">
              <ImageWithFallback
                src={IMG.hero}
                alt="Polki and jadau jewellery from the Chudiwalas workshop in Jaipur"
                fallbackTitle="Chudiwalas"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-5 bg-ivory-100 flex items-center lg:relative lg:z-10 lg:-mr-24">
            <div className="w-full px-5 sm:px-10 lg:pl-[max(2rem,calc((100vw-88rem)/2+2rem))] lg:pr-20 py-12 sm:py-16 lg:py-24">
              <h1 className="display-hero text-charcoal-950 hero-rise hero-d1">
                Polki set by
                <br />
                the hands that
                <br />
                export it.
              </h1>
              <p className="lede mt-7 text-charcoal-700 hero-rise hero-d2">
                Our karigars set uncut diamonds in 24K gold foil for jewellery houses abroad.
                The same bench, the same stones — sold to you at workshop prices.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3 hero-rise hero-d3">
                <Link href="/shop" className="btn-gold px-8 py-4">
                  Shop jewellery
                </Link>
                <Link href="/consultation" className="btn-outline-gold px-8 py-4">
                  Book a viewing
                </Link>
              </div>
              <p className="meta mt-7 text-charcoal-500 hero-rise hero-d3">
                Hallmarked and certified · Insured delivery across India
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES — portrait tiles; circles crop necklaces badly */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <h2 className="head-section">Shop by category</h2>
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORIES.map((c) => (
            <Link key={c.href} href={c.href} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
              <div className="relative aspect-[3/4] overflow-hidden tile-product">
                <ImageWithFallback
                  src={c.image}
                  alt={c.label}
                  fallbackTitle={c.label}
                  fill
                  sizes="(max-width: 640px) 31vw, 15vw"
                  className="object-cover object-center img-zoom"
                />
              </div>
              <p className="mt-2.5 text-sm text-charcoal-900 group-hover:text-olive-700 transition-colors">{c.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. BESTSELLERS */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="head-section">Bestsellers</h2>
          <Link href="/shop" className="link-quiet text-sm">
            See all jewellery
          </Link>
        </div>
        <p className="mt-2 text-sm text-charcoal-600">Each piece ships with its BIS hallmark and stone certificate.</p>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. THE WORKSHOP — the one loud moment on the page. Full-bleed olive,
             the brand's own proposition at display scale. */}
      <section className="mt-20 sm:mt-28 bg-olive-600 text-ivory-100">
        <div className="grid lg:grid-cols-12">
          <div className="lg:col-span-7 flex items-center">
            <div className="px-5 sm:px-10 lg:pl-[max(2rem,calc((100vw-88rem)/2+2rem))] lg:pr-16 py-16 sm:py-24 lg:py-28">
              <h2 className="display-xl text-ivory-50">
                Priced at the workshop,
                <br />
                not the showroom.
              </h2>
              <p className="lede mt-7 text-ivory-100/85">
                A piece passes from our bench to your hands with nothing in between. You pay for the
                gold, the stones and the making — never for a showroom floor or a distributor&rsquo;s cut.
              </p>
              <dl className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-7 max-w-2xl">
                {[
                  { k: "40 years", v: "Setting polki in Jaipur" },
                  { k: "Export grade", v: "The bench that supplies houses abroad" },
                  { k: "2 days", v: "Dispatch on ready-to-ship pieces" },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="text-2xl sm:text-[1.75rem] font-light tracking-tight text-ivory-50">{s.k}</dt>
                    <dd className="mt-1.5 text-[13px] leading-snug text-ivory-100/70">{s.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-11 flex flex-wrap gap-3">
                <Link
                  href="/consultation"
                  className="bg-ivory-100 text-olive-800 hover:bg-white font-medium px-8 py-4 text-xs tracking-[0.18em] uppercase transition-colors"
                >
                  Book a viewing in Jaipur
                </Link>
                <Link
                  href="/about"
                  className="border border-ivory-100/45 text-ivory-100 hover:bg-ivory-100 hover:text-olive-800 font-medium px-8 py-4 text-xs tracking-[0.18em] uppercase transition-colors"
                >
                  Our story
                </Link>
              </div>
            </div>
          </div>
          <div className="relative lg:col-span-5 aspect-[4/3] lg:aspect-auto lg:min-h-[32rem]">
            <ImageWithFallback
              src={IMG.workshop}
              alt="A karigar setting uncut polki at the Chudiwalas workshop"
              fallbackTitle="Jaipur workshop"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* 5. COLLECTIONS — asymmetric: one leads, two follow */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <h2 className="head-section">Signature collections</h2>
        <div className="mt-6 grid lg:grid-cols-12 gap-4 sm:gap-6">
          {leadCollection && (
            <Link href={`/collections/${leadCollection.slug}`} className="group block lg:col-span-7">
              <div className="relative aspect-[4/3] lg:aspect-[16/10] overflow-hidden tile-product">
                <ImageWithFallback
                  src={leadCollection.bannerImageUrl || ""}
                  alt={leadCollection.title}
                  fallbackTitle={leadCollection.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover object-center img-zoom"
                />
              </div>
              <h3 className="mt-4 text-xl font-normal text-charcoal-950 group-hover:text-olive-700 transition-colors">
                {leadCollection.title}
              </h3>
              <p className="mt-1.5 text-sm text-charcoal-600 measure">{leadCollection.description}</p>
            </Link>
          )}
          <div className="lg:col-span-5 grid sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
            {restCollections.map((col) => (
              <Link key={col.slug} href={`/collections/${col.slug}`} className="group block">
                <div className="relative aspect-[16/10] lg:aspect-[16/8] overflow-hidden tile-product">
                  <ImageWithFallback
                    src={col.bannerImageUrl || ""}
                    alt={col.title}
                    fallbackTitle={col.title}
                    fill
                    sizes="(max-width: 1024px) 50vw, 40vw"
                    className="object-cover object-center img-zoom"
                  />
                </div>
                <h3 className="mt-3 text-base font-normal text-charcoal-950 group-hover:text-olive-700 transition-colors">
                  {col.title}
                </h3>
                <p className="mt-1 text-sm text-charcoal-600 line-clamp-2">{col.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. EDITS */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        <h2 className="head-section">Find your edit</h2>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {EDITS.map((e) => (
            <Link key={e.label} href={e.href} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden tile-product">
                <ImageWithFallback
                  src={e.image}
                  alt={e.label}
                  fallbackTitle={e.label}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center img-zoom"
                />
              </div>
              <h3 className="mt-3 text-base font-normal text-charcoal-950 group-hover:text-olive-700 transition-colors">{e.label}</h3>
              <p className="mt-0.5 text-[13px] text-charcoal-600">{e.caption}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. TRUST */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28">
        <div className="rule-hair" />
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-7">
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-2.5 text-sm text-charcoal-700">
              <Icon className="w-4 h-4 text-olive-600 shrink-0" />
              {label}
            </li>
          ))}
        </ul>
        <div className="rule-hair" />
      </section>
    </div>
  );
}

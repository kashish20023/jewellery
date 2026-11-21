import React from "react";
import Link from "next/link";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { constructMetadata } from "@/lib/seo";
import { ArrowRight, Check, Minus, MapPin, Clock } from "lucide-react";

export const metadata = constructMetadata({
  title: "Our Story",
  description:
    "Chudiwalas is the retail face of Jaipur Emporium International, a jewellery export house. Polki, jadau and certified solitaires, made in our Jaipur workshop and sold direct to you.",
  path: "/about",
});

const IMG = {
  hero: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1800/v1795259008/chudiwalas/catalogue/photo-1515562141207-7a88fb7ce338.jpg",
  bench: "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_1400/v1795259018/chudiwalas/catalogue/photo-1599643478518-a784e5dc4c8f.jpg",
};

const COMPARE = [
  { row: "Who makes it", retail: "Bought in from a wholesaler", direct: "Our own karigars at Jaipur Emporium International" },
  { row: "Making charges", retail: "Marked up at the counter", direct: "Workshop rate, shown line by line" },
  { row: "Hallmark & certificates", retail: "On request", direct: "BIS HUID and stone certificates with every piece" },
  { row: "Customisation", retail: "Limited to what is in stock", direct: "Change stones, metal, size or neckline" },
  { row: "Where to see it", retail: "Showroom hours only", direct: "WhatsApp video call, or a private viewing in Jaipur" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="relative overflow-hidden rounded-xl bg-ivory-tile aspect-[16/9] lg:aspect-[21/9]">
          <ImageWithFallback src={IMG.hero} alt="Chudiwalas jewellery from the Jaipur atelier" fallbackTitle="Chudiwalas" fill priority sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/55 via-charcoal-950/10 to-transparent sm:bg-gradient-to-r" aria-hidden="true" />
          <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-6 sm:p-12 lg:p-16">
            <div className="max-w-lg text-white">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">Our story</p>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight tracking-tight">Jaipur&rsquo;s export-house jewellers, now direct to you.</h1>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 text-charcoal-800 leading-relaxed space-y-5">
        <p>
          Chudiwalas is the retail face of <strong className="font-semibold text-charcoal-950">Jaipur Emporium International</strong>, a jewellery manufacturing and export house. The same karigars who craft for the world&rsquo;s jewellery houses now make for you directly.
        </p>
        <p>
          Every piece starts as a hand drawing in our Jaipur studio, sized to the wearer. Uncut polki, natural diamonds and coloured gems are matched and certified by hand, the gold frame is raised and BIS hallmarked, and the reverse is finished in hand-painted meenakari enamel.
        </p>
        <p>
          Because there is no wholesaler and no showroom markup between the bench and you, the price you pay is the workshop price. Hallmark and stone certificates come with every piece.
        </p>
      </section>

      {/* Why direct — comparison */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20">
        <h2 className="text-xl sm:text-2xl font-semibold text-charcoal-950 mb-6">The showroom, without the showroom</h2>
        {/* Mobile cards */}
        <ul className="sm:hidden space-y-3">
          {COMPARE.map((c) => (
            <li key={c.row} className="border border-charcoal-100 rounded-lg overflow-hidden">
              <h3 className="px-4 py-3 text-base font-semibold text-charcoal-950 border-b border-charcoal-100">{c.row}</h3>
              <div className="px-4 py-3 flex items-start gap-2 text-sm text-charcoal-600"><Minus className="w-3.5 h-3.5 mt-1 shrink-0 text-charcoal-400" /><span><span className="block text-[10px] uppercase tracking-[0.14em] text-charcoal-500 font-medium">Typical showroom</span>{c.retail}</span></div>
              <div className="px-4 py-3 flex items-start gap-2 text-sm bg-olive-600 text-white"><Check className="w-3.5 h-3.5 mt-1 shrink-0 text-orange-300" /><span><span className="block text-[10px] uppercase tracking-[0.14em] text-white/70 font-medium">Chudiwalas direct</span>{c.direct}</span></div>
            </li>
          ))}
        </ul>
        {/* Desktop grid */}
        <div className="hidden sm:grid sm:grid-cols-[1.3fr_1fr_1.2fr] border border-charcoal-100 rounded-lg overflow-hidden text-sm">
          <div className="p-4" />
          <div className="p-4 border-l border-charcoal-100 text-[11px] uppercase tracking-[0.14em] font-medium text-charcoal-500">Typical showroom</div>
          <div className="p-4 border-l border-charcoal-100 bg-olive-600 text-white text-[11px] uppercase tracking-[0.14em] font-medium">Chudiwalas direct</div>
          {COMPARE.map((c, i) => {
            const last = i === COMPARE.length - 1;
            return (
              <React.Fragment key={c.row}>
                <div className={`p-4 font-medium text-charcoal-950 ${last ? "" : "border-t border-charcoal-100"}`}>{c.row}</div>
                <div className={`p-4 border-l border-charcoal-100 text-charcoal-600 flex items-start gap-2 ${last ? "" : "border-t"}`}><Minus className="w-3.5 h-3.5 mt-0.5 shrink-0 text-charcoal-400" />{c.retail}</div>
                <div className={`p-4 border-l border-charcoal-100 bg-olive-600 text-white flex items-start gap-2 ${last ? "" : "border-t border-olive-500"}`}><Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-300" />{c.direct}</div>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Visit the atelier */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center bg-ivory-tile rounded-xl overflow-hidden">
          <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full min-h-[280px]">
            <ImageWithFallback src={IMG.bench} alt="The Chudiwalas atelier in Jaipur" fallbackTitle="Jaipur atelier" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-center" />
          </div>
          <div className="p-6 sm:p-10 lg:pr-14">
            <h2 className="text-2xl sm:text-3xl font-semibold text-charcoal-950 leading-tight">See it in Jaipur, or on a video call.</h2>
            <p className="mt-4 text-sm sm:text-base text-charcoal-700 leading-relaxed">
              Book a private viewing at the atelier and try the pieces with a gemologist, or ask a concierge to show you any piece on WhatsApp video before you decide.
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 text-olive-700 shrink-0" /><dd className="text-charcoal-800">Jaipur Emporium International, Jaipur, Rajasthan 302001</dd></div>
              <div className="flex items-start gap-3"><Clock className="w-4 h-4 mt-0.5 text-olive-700 shrink-0" /><dd className="text-charcoal-800">Viewings by appointment, Monday to Saturday</dd></div>
            </dl>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/consultation" className="btn-charcoal inline-flex items-center justify-center gap-2">Book a viewing</Link>
              <Link href="/shop" className="btn-outline-gold inline-flex items-center justify-center gap-2">Shop jewellery <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

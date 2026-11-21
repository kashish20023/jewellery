import React from "react";
import Link from "next/link";
import { FaqExperience } from "@/components/faqs/FaqExperience";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  constructMetadata,
  constructBreadcrumbJsonLd,
} from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/fixtures/faqs";
import { ChevronRight } from "lucide-react";

export const metadata = constructMetadata({
  title: "Frequently Asked Questions",
  description:
    "Everything you need to know about BIS Hallmarking, certified natural diamonds, domestic insured shipping, custom commissions, and lifetime buyback at Chudiwalas.",
  path: "/faqs",
});

export default function FaqPage() {
  const breadcrumbJsonLd = constructBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "FAQs", path: "/faqs" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 pb-24">
      {/* Inject Structured Data */}
      <JsonLd data={[breadcrumbJsonLd, faqSchema]} />

      {/* Breadcrumb Navigation */}
      <nav
        className="flex items-center space-x-2 text-xs font-mono uppercase text-stone-600 mb-8 overflow-x-auto whitespace-nowrap"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-[#556B2F] transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <span className="text-stone-900 font-medium">Frequently Asked Questions</span>
      </nav>

      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
        <span className="text-[11px] uppercase font-mono tracking-widest text-[#556B2F] bg-[#E9E2CC] px-3 py-1 rounded-full font-semibold inline-block tatva-badge-sheen shadow-xs">
          Client Care & Knowledge Base
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif text-stone-950 font-semibold leading-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 font-light max-w-xl mx-auto leading-relaxed">
          Comprehensive answers regarding our Bureau of Indian Standards (BIS) hallmarking, natural diamond certifications, secure domestic armored transit, and lifetime care.
        </p>
      </div>

      {/* Interactive FAQ Component */}
      <FaqExperience />
    </div>
  );
}

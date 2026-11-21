import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, Youtube, MessageCircle, Mail, MapPin } from "lucide-react";
import { ConciergePill } from "@/components/common/ConciergePill";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All jewellery", href: "/shop" },
      { label: "Polki & Jadau", href: "/collections/royal-polki-heritage" },
      { label: "Solitaires", href: "/collections/solitaire-haute-joaillerie" },
      { label: "Bridal", href: "/collections/bridal-connoisseur" },
      { label: "Everyday", href: "/collections/everyday-fine-jewellery" },
      { label: "Ready to ship", href: "/shop?availability=ready" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Book a consultation", href: "/consultation" },
      { label: "FAQs", href: "/faqs" },
      { label: "Shipping & insurance", href: "/faqs" },
      { label: "Returns & lifetime exchange", href: "/faqs" },
      { label: "Hallmark & certification", href: "/faqs" },
      { label: "Jewellery care", href: "/faqs" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 bg-ivory-tile border-t border-charcoal-100 text-charcoal-800">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Image src="https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255325/chudiwalas/sitehttps://res.cloudinary.com/b3ddq6fp/image/upload/v1795255325/chudiwalas/site/brand/lockup-black.png" alt="Chudiwalas" width={1450} height={1384} className="h-20 w-auto" />
          <p className="mt-4 text-sm leading-relaxed text-charcoal-700 max-w-xs">
            Polki, jadau and certified solitaires made in our Jaipur workshop and sold direct to you.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {[
              { icon: Instagram, label: "Instagram" },
              { icon: Facebook, label: "Facebook" },
              { icon: Youtube, label: "YouTube" },
            ].map(({ icon: Icon, label }) => (
              <a key={label} href="#" aria-label={label} className="w-10 h-10 rounded-full border border-charcoal-200 flex items-center justify-center text-charcoal-700 hover:text-olive-700 hover:border-olive-400 transition-colors">
                <Icon className="w-4 h-4 stroke-[1.5]" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-charcoal-950">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-charcoal-700 hover:text-olive-700 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="text-sm font-semibold text-charcoal-950">Contact</h2>
          <ul className="mt-3 space-y-3 text-sm text-charcoal-700">
            <li className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 mt-0.5 text-olive-700 shrink-0" />
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello Chudiwalas, I would like to enquire about your jewellery.")}`} target="_blank" rel="noopener noreferrer" className="hover:text-olive-700">
                WhatsApp concierge
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 text-olive-700 shrink-0" />
              <a href="mailto:concierge@chudiwalas.com" className="hover:text-olive-700">concierge@chudiwalas.com</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-olive-700 shrink-0" />
              <span>Jaipur Emporium International, Jaipur, Rajasthan 302001</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-charcoal-100">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-charcoal-500">
          <span>© {new Date().getFullYear()} Chudiwalas Fine Jewellery · A Jaipur Emporium International house</span>
          <span>Ships within India · Insured transit · All prices in INR incl. GST</span>
        </div>
      </div>

      <ConciergePill />
    </footer>
  );
}

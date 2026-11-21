import React from "react";
import Link from "next/link";
import { Compass, ArrowLeft, MessageCircle } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-ivory-200 border border-gold-300 flex items-center justify-center text-gold-600">
          <Compass className="w-8 h-8 stroke-[1.25]" />
        </div>

        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-gold-700 block mb-2">
            Error 404 &bull; Atelier Archive
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-950 font-semibold">
            Piece Not Found
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
            The piece or collection you are seeking may have been placed in our private vault, completed as a bespoke commission, or the URL address is imprecise.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/collections"
            className="btn-charcoal inline-flex items-center justify-center gap-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Collections</span>
          </Link>
          <a
            href="https://wa.me/919876543210?text=Hello%2C%20I%20am%20looking%20for%20a%20piece%20in%20Chudiwalas"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-gold inline-flex items-center justify-center gap-2 text-xs"
          >
            <MessageCircle className="w-4 h-4 text-gold-600" />
            <span>Consult Concierge</span>
          </a>
        </div>
      </div>
    </main>
  );
}


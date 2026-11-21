import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { constructMetadata, constructOrganizationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

/**
 * Project typography: Poppins only (owner decision, 2026-11-19).
 * Headings use 600, body 400/300, labels and buttons 500.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = constructOrganizationJsonLd();

  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <JsonLd data={orgJsonLd} />
      </head>
      {/* Ivory page background, generous white space, no textures (guidelines p.2) */}
      <body className="min-h-screen flex flex-col bg-white text-charcoal-950 font-sans font-normal antialiased">
        <WishlistProvider>
          <CartProvider>
            <ChromeGate>
              <Header />
            </ChromeGate>
            <main id="main-content" tabIndex={-1} className="flex-grow focus:outline-none relative">
              {children}
            </main>
            <ChromeGate>
              <CartDrawer />
              <Footer />
            </ChromeGate>
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Secure Checkout",
  description: "Complete your fine jewellery order with complimentary insured domestic shipping across India.",
  path: "/checkout",
  noIndex: true, // Secure checkout flow must never be indexed by search engines
});

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


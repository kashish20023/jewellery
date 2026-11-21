import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Your Saved Heirlooms | Wishlist",
  description: "View and curate your personal selection of handcrafted fine jewellery heirlooms.",
  path: "/wishlist",
  noIndex: true, // Personal guest state should not be indexed by search engines
});

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


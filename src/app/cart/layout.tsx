import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Shopping Bag",
  description: "Review your selected fine jewellery creations prior to secure checkout.",
  path: "/cart",
  noIndex: true, // Cart state should not be indexed
});

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


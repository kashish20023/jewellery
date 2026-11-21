import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Private Consultation & Viewing Appointments",
  description:
    "Schedule a private salon appointment or request a concierge callback with our master gemologists. Personalised bridal consultations in Mumbai or via secure virtual video.",
  path: "/consultation",
});

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


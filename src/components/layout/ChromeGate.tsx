"use client";

import React from "react";
import { usePathname } from "next/navigation";

/**
 * Renders storefront chrome (header, footer, cart drawer) everywhere except
 * the admin portal, which brings its own shell.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Gem,
  Upload,
  MessageSquare,
  Settings,
  Tag,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { StatusBadge } from "./ui";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

const NAV_MAIN = [
  { label: "Home", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/admin/products", icon: Gem, exact: true },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Enquiries", href: "/admin/leads", icon: MessageSquare },
];

const NAV_MORE = [
  { label: "Offers", href: "/admin/offers", icon: Tag },
  { label: "CSV import", href: "/admin/products/import", icon: Upload },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const NAV = [...NAV_MAIN, ...NAV_MORE];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    fetch("/api/admin/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.user) {
          setUser(d.user);
        } else {
          // Not authenticated: the admin shell is never shown to anonymous visitors.
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [isLogin, pathname, router]);

  const signOut = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  if (isLogin) {
    return <div className="min-h-screen bg-ivory-100 text-charcoal-950 font-sans">{children}</div>;
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const navLink = ({ label, href, icon: Icon, exact }: { label: string; href: string; icon: typeof LayoutDashboard; exact?: boolean }) => {
    const active = isActive(href, exact);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
          active ? "bg-ivory-100 text-olive-800 font-medium" : "text-ivory-200/85 hover:bg-olive-700 hover:text-ivory-50"
        }`}
      >
        <Icon className="w-4 h-4 stroke-[1.75]" />
        <span>{label}</span>
      </Link>
    );
  };

  const nav = (
    <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
      {NAV_MAIN.map(navLink)}
      <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.18em] text-ivory-200/50">More</p>
      {NAV_MORE.map(navLink)}
    </nav>
  );

  const sidebarFooter = (
    <div className="px-3 py-4 border-t border-ivory-100/15 space-y-1">
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ivory-200/85 hover:bg-olive-700 hover:text-ivory-50 transition-colors"
      >
        <ExternalLink className="w-4 h-4 stroke-[1.75]" />
        View storefront
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ivory-200/85 hover:bg-olive-700 hover:text-ivory-50 transition-colors"
      >
        <LogOut className="w-4 h-4 stroke-[1.75]" />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory-100 text-charcoal-950 font-sans lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-olive-600 text-ivory-100 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-ivory-100/15">
          <Link href="/admin" className="block">
            <Image src="https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/sitehttps://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/site/brand/wordmark-ivory.png" alt="Chudiwalas" width={2097} height={225} className="h-[18px] w-auto" />
            <span className="block mt-2 text-[10px] uppercase tracking-[0.22em] text-ivory-200/70">Atelier admin</span>
          </Link>
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="fixed inset-0 bg-charcoal-950/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative w-72 max-w-[85vw] bg-olive-600 text-ivory-100 h-full flex flex-col z-10">
            <div className="px-5 py-5 border-b border-ivory-100/15 flex items-center justify-between">
              <Image src="https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/sitehttps://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/site/brand/wordmark-ivory.png" alt="Chudiwalas" width={2097} height={225} className="h-[16px] w-auto" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 text-ivory-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-ivory-100/95 backdrop-blur border-b border-ivory-400">
          <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open admin menu"
                className="lg:hidden p-2 -ml-2 text-charcoal-900 hover:text-olive-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Image src="https://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/sitehttps://res.cloudinary.com/b3ddq6fp/image/upload/v1795255327/chudiwalas/site/brand/wordmark-black.png" alt="Chudiwalas" width={2097} height={225} className="lg:hidden h-[14px] w-auto" />
              <span className="hidden lg:block text-xs uppercase tracking-[0.18em] text-charcoal-500 font-medium">
                {NAV.find((n) => isActive(n.href, "exact" in n ? (n as { exact?: boolean }).exact : undefined))?.label ?? "Admin"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm text-charcoal-800">{user.name}</span>
                  <StatusBadge status={user.role} />
                </div>
              )}
              <Link href="/" target="_blank" className="adm-btn-ghost hidden sm:inline-flex">
                <ExternalLink className="w-3.5 h-3.5" /> Storefront
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full">{children}</main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-charcoal-500 border-t border-ivory-300">
          Chudiwalas admin · Role-based access · Every change is written to the audit log.
        </footer>
      </div>
    </div>
  );
}

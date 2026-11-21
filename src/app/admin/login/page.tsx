"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/admin/ui";
import { ArrowRight, LockKeyhole } from "lucide-react";

// Demo credentials render only in local sandboxes (NEXT_PUBLIC_DEMO_MODE="true").
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_PASSWORD = IS_DEMO ? "AurumAdmin2026!" : "";
const DEMO_ACCOUNTS = IS_DEMO
  ? [
      { role: "OWNER", email: "owner@aurumatelier.internal" },
      { role: "MANAGER", email: "manager@aurumatelier.internal" },
      { role: "STAFF", email: "staff@aurumatelier.internal" },
    ]
  : [];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0]?.email ?? "");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Authentication failed");
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-olive-600 text-ivory-100 p-12">
        <Image src="/brand/wordmark-ivory.png" alt="Chudiwalas" width={2097} height={225} className="h-6 w-auto" />
        <div className="max-w-md">
          <Image src="/brand/crest-ivory.svg" alt="" aria-hidden="true" width={791} height={1080} className="h-16 w-auto opacity-90" />
          <h2 className="mt-6 text-3xl font-semibold leading-tight text-ivory-50">Atelier administration</h2>
          <p className="mt-3 text-sm text-ivory-200/80 leading-relaxed">
            Orders, catalogue pricing, enquiry follow-ups and store policy, in one place. Every change is recorded in the audit log.
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ivory-200/60">Jaipur Emporium International</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Image src="/brand/wordmark-black.png" alt="Chudiwalas" width={2097} height={225} className="h-5 w-auto lg:hidden mb-8" />
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-olive-700 font-medium">
            <LockKeyhole className="w-3.5 h-3.5" /> Staff sign in
          </span>
          <h1 className="mt-2 text-2xl font-semibold text-charcoal-950">Welcome back</h1>
          <p className="mt-1 text-sm text-charcoal-600">Use your Chudiwalas staff account.</p>

          {error && (
            <div className="mt-6">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="adm-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="adm-input"
              />
            </div>
            <div>
              <label htmlFor="password" className="adm-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="adm-input"
              />
            </div>
            <button type="submit" disabled={loading} className="adm-btn w-full py-3">
              {loading ? "Signing in…" : "Sign in"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {IS_DEMO && (
          <div className="mt-8 pt-6 border-t border-ivory-400">
            <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-500 font-medium mb-3">Demo accounts (sandbox)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                    setError(null);
                  }}
                  className="adm-btn-ghost text-[11px]"
                >
                  {a.role}
                </button>
              ))}
            </div>
          </div>
          )}

          <Link href="/" className="mt-8 inline-flex items-center gap-1 text-xs text-charcoal-500 hover:text-olive-700">
            Back to storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

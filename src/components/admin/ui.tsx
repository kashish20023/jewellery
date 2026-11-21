import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { CountUp } from "./CountUp";

/* ------------------------------------------------------------------
   Shared admin UI primitives. Brand palette, Poppins only.
   ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-[1.7rem] font-semibold text-charcoal-950 leading-tight">{title}</h1>
        {description && <p className="text-sm text-charcoal-600 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "olive",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "olive" | "orange" | "charcoal";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-50 text-orange-600 border-orange-100"
      : tone === "charcoal"
        ? "bg-charcoal-100 text-charcoal-800 border-charcoal-200"
        : "bg-olive-100 text-olive-700 border-olive-200";

  const accent = tone === "orange" ? "before:bg-orange-400" : tone === "charcoal" ? "before:bg-charcoal-400" : "before:bg-olive-500";

  const body = (
    <div
      className={`adm-card relative overflow-hidden p-5 h-full flex flex-col justify-between group transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:scale-y-0 before:origin-top group-hover:before:scale-y-100 before:transition-transform before:duration-300 ${accent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-600 font-medium">{label}</p>
        {Icon && (
          <span className={`w-8 h-8 rounded-md border flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${toneClass}`}>
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-semibold text-charcoal-950 tracking-tight tabular-nums">
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </p>
        {hint && <p className="text-xs text-charcoal-500 mt-1">{hint}</p>}
      </div>
      {href && (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] font-medium text-olive-700 group-hover:text-orange-500 transition-colors">
          Open <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 rounded-md">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ivory-300">
          <div>
            {title && <h2 className="text-sm font-semibold text-charcoal-950">{title}</h2>}
            {description && <p className="text-xs text-charcoal-500 mt-0.5">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const STATUS_TONES: Record<string, string> = {
  // orders
  CONFIRMED: "bg-olive-100 text-olive-800 border-olive-200",
  PENDING: "bg-ivory-200 text-charcoal-700 border-ivory-400",
  RECONCILIATION_REQUIRED: "bg-orange-50 text-orange-700 border-orange-200",
  CANCELLED: "bg-charcoal-100 text-charcoal-600 border-charcoal-200",
  // payment
  PAID: "bg-olive-100 text-olive-800 border-olive-200",
  FAILED: "bg-orange-50 text-orange-700 border-orange-200",
  INITIATED: "bg-ivory-200 text-charcoal-700 border-ivory-400",
  // fulfilment
  UNFULFILLED: "bg-ivory-200 text-charcoal-700 border-ivory-400",
  PROCESSING: "bg-olive-50 text-olive-700 border-olive-200",
  SHIPPED: "bg-olive-100 text-olive-800 border-olive-200",
  DELIVERED: "bg-olive-600 text-ivory-50 border-olive-600",
  // leads
  NEW: "bg-orange-50 text-orange-700 border-orange-200",
  CONTACTED: "bg-ivory-200 text-charcoal-700 border-ivory-400",
  SCHEDULED: "bg-olive-100 text-olive-800 border-olive-200",
  CLOSED_CONVERTED: "bg-olive-600 text-ivory-50 border-olive-600",
  CLOSED_LOST: "bg-charcoal-100 text-charcoal-600 border-charcoal-200",
  // roles
  OWNER: "bg-orange-50 text-orange-700 border-orange-200",
  MANAGER: "bg-olive-100 text-olive-800 border-olive-200",
  STAFF: "bg-ivory-200 text-charcoal-700 border-ivory-400",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONES[status] || "bg-ivory-200 text-charcoal-700 border-ivory-400";
  return <span className={`adm-chip ${tone}`}>{label || status.replace(/_/g, " ")}</span>;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-charcoal-800">{title}</p>
      {body && <p className="text-xs text-charcoal-500 mt-1">{body}</p>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="py-16 text-center text-sm text-charcoal-500" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-olive-50 border-olive-200 text-olive-800"
      : tone === "warning"
        ? "bg-orange-50 border-orange-200 text-orange-800"
        : tone === "error"
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-ivory-100 border-ivory-400 text-charcoal-800";
  return <div className={`p-3 border rounded-md text-sm ${cls}`}>{children}</div>;
}

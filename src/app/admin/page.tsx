"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPaiseToInr } from "@/lib/money";
import { PageHeader, StatCard, Card, StatusBadge, EmptyState, Loading, Alert } from "@/components/admin/ui";
import {
  IndianRupee,
  ShoppingBag,
  MessageSquare,
  Gem,
  AlertTriangle,
  CalendarClock,
  PackageSearch,
  ArrowRight,
  Upload,
  Settings,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

interface Variant {
  id: string;
  sku: string;
  pricePaise: string | null;
  stockQuantity: number;
  isMadeToOrder?: boolean;
}

interface Product {
  id: string;
  title: string;
  skuGroup: string;
  isEnquiryOnly: boolean;
  priceVisibility: "PUBLIC" | "ON_REQUEST";
  variants: Variant[];
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  totalPaise: string;
  createdAt: string;
}

interface Lead {
  id: string;
  type?: "CALLBACK" | "WHATSAPP_INTENT";
  customerName: string;
  customerPhone: string;
  status: string;
  createdAt: string;
  variantSku?: string | null;
  product?: { title: string } | null;
}

interface Appointment extends Lead {
  requestedDate: string;
  requestedTimeSlot: string;
  locationPreference: string;
}

interface Settings {
  storeName: string;
  highValueThresholdPaise: string;
  gstPercentage: number;
  enablePurchases: boolean;
  whatsappNumber: string;
  contactEmail?: string;
}

const LOW_STOCK_AT = 1;
const PLACEHOLDER_NUMBER = "919876543210";

type Range = "7" | "30" | "90" | "all";
const RANGE_LABEL: Record<Range, string> = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", all: "All time" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [range, setRange] = useState<Range>("30");
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await fetch("/api/admin/auth/me");
        if (!me.ok) {
          router.push("/admin/login");
          return;
        }
        const meData = await me.json();
        if (cancelled) return;
        setUser(meData.user);

        const [p, o, l, s] = await Promise.all([
          fetch("/api/admin/products").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/admin/leads").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/admin/settings").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        setProducts(p?.products ?? []);
        setOrders(o?.orders ?? []);
        setLeads(l?.leads ?? []);
        setAppointments(l?.appointments ?? []);
        setSettings(s?.settings ?? null);
        setWarnings([p?.warning, o?.warning, l?.warning, s?.warning].filter(Boolean));
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const since = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d;
  }, [range]);

  const inRange = (iso: string) => !since || new Date(iso) >= since;

  const stats = useMemo(() => {
    const rangedOrders = orders.filter((o) => inRange(o.createdAt));
    const confirmed = rangedOrders.filter((o) => o.orderStatus === "CONFIRMED");
    const revenuePaise = confirmed.reduce((sum, o) => sum + BigInt(o.totalPaise || "0"), 0n);
    const reconciliation = orders.filter((o) => o.orderStatus === "RECONCILIATION_REQUIRED");
    const unfulfilled = orders.filter((o) => o.orderStatus === "CONFIRMED" && o.fulfilmentStatus === "UNFULFILLED");
    const newLeads = leads.filter((l) => l.status === "NEW" && (l.type || "CALLBACK") !== "WHATSAPP_INTENT");
    const newIntents = leads.filter((l) => l.status === "NEW" && l.type === "WHATSAPP_INTENT");
    const newAppointments = appointments.filter((a) => a.status === "NEW");
    const upcoming = appointments.filter((a) => a.status === "SCHEDULED" && new Date(a.requestedDate) >= new Date());
    const lowStock = products.flatMap((p) =>
      p.variants.filter((v) => v.stockQuantity <= LOW_STOCK_AT && !v.isMadeToOrder && !p.isEnquiryOnly).map((v) => ({ product: p, variant: v }))
    );
    const onRequest = products.filter((p) => p.priceVisibility === "ON_REQUEST" || p.isEnquiryOnly);
    return { rangedOrders, confirmed, revenuePaise, reconciliation, unfulfilled, newLeads, newIntents, newAppointments, upcoming, lowStock, onRequest };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, leads, appointments, products, since]);

  if (loading) return <Loading label="Loading your dashboard…" />;

  const thresholdInr = settings ? formatPaiseToInr(BigInt(settings.highValueThresholdPaise)) : "₹1,00,000";
  const setupIssues = [
    settings && settings.whatsappNumber === PLACEHOLDER_NUMBER && "The concierge WhatsApp number is still the sandbox placeholder. Customers tapping WhatsApp reach no one.",
    settings && /aurumatelier|example\./i.test(settings.contactEmail || "") && "The concierge email is a placeholder.",
  ].filter(Boolean) as string[];

  const attention = [
    stats.reconciliation.length > 0 && { icon: AlertTriangle, tone: "orange" as const, text: `${stats.reconciliation.length} order${stats.reconciliation.length > 1 ? "s" : ""} need payment reconciliation`, href: "/admin/orders?status=RECONCILIATION_REQUIRED" },
    stats.newAppointments.length > 0 && { icon: CalendarClock, tone: "orange" as const, text: `${stats.newAppointments.length} viewing request${stats.newAppointments.length > 1 ? "s" : ""} waiting to be confirmed`, href: "/admin/leads?tab=APPOINTMENTS&status=NEW" },
    stats.newLeads.length > 0 && { icon: MessageSquare, tone: "olive" as const, text: `${stats.newLeads.length} new callback lead${stats.newLeads.length > 1 ? "s" : ""} to contact`, href: "/admin/leads?tab=CALLBACKS&status=NEW" },
    stats.newIntents.length > 0 && { icon: MessageSquare, tone: "olive" as const, text: `${stats.newIntents.length} WhatsApp intent${stats.newIntents.length > 1 ? "s" : ""} recorded (taps, not confirmed chats)`, href: "/admin/leads?tab=INTENTS" },
    stats.unfulfilled.length > 0 && { icon: ShoppingBag, tone: "olive" as const, text: `${stats.unfulfilled.length} paid order${stats.unfulfilled.length > 1 ? "s" : ""} not yet dispatched`, href: "/admin/orders?status=CONFIRMED&fulfilment=UNFULFILLED" },
    stats.lowStock.length > 0 && { icon: PackageSearch, tone: "olive" as const, text: `${stats.lowStock.length} variant${stats.lowStock.length > 1 ? "s" : ""} at or below ${LOW_STOCK_AT} unit`, href: "/admin/products?stock=low" },
  ].filter(Boolean) as { icon: typeof AlertTriangle; tone: "orange" | "olive"; text: string; href: string }[];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(" ")[0] || "there"}`}
        description={`${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · Signed in as ${user?.email}`}
        actions={
          <>
            <label className="sr-only" htmlFor="range">Date range</label>
            <select id="range" value={range} onChange={(e) => setRange(e.target.value as Range)} className="adm-input !w-auto text-xs py-2">
              {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                <option key={r} value={r}>{RANGE_LABEL[r]}</option>
              ))}
            </select>
            <Link href="/admin/products/import" className="adm-btn-ghost">
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </Link>
            <Link href="/admin/products" className="adm-btn">
              <Gem className="w-3.5 h-3.5" /> Manage catalogue
            </Link>
          </>
        }
      />

      {warnings.map((w) => (
        <Alert key={w} tone="warning">{w} Metrics below are not production figures.</Alert>
      ))}
      {setupIssues.map((w) => (
        <Alert key={w} tone="warning">
          {w}{" "}
          <Link href="/admin/settings" className="underline underline-offset-4 font-medium">Fix in settings</Link>
        </Alert>
      ))}

      {/* KPIs for the selected range */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={`Confirmed revenue · ${RANGE_LABEL[range]}`} value={formatPaiseToInr(stats.revenuePaise)} hint={`${stats.confirmed.length} confirmed order${stats.confirmed.length === 1 ? "" : "s"}`} icon={IndianRupee} tone="orange" href="/admin/orders?status=CONFIRMED" />
        <StatCard label={`Orders · ${RANGE_LABEL[range]}`} value={stats.rangedOrders.length} hint={`${stats.unfulfilled.length} to dispatch · ${stats.reconciliation.length} to reconcile`} icon={ShoppingBag} href="/admin/orders" />
        <StatCard label="New enquiries" value={stats.newLeads.length + stats.newAppointments.length} hint={`${stats.newLeads.length} callbacks · ${stats.newAppointments.length} viewings · ${stats.newIntents.length} WhatsApp taps`} icon={MessageSquare} href="/admin/leads?status=NEW" />
        <StatCard label="Catalogue" value={products.length} hint={`${stats.onRequest.length} enquiry-only · ${stats.lowStock.length} low stock`} icon={Gem} tone="charcoal" href="/admin/products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Needs attention" description="Each line opens the filtered queue." className="lg:col-span-1">
          {attention.length === 0 ? (
            <EmptyState title="All clear" body="No pending reconciliation, leads or stock alerts." />
          ) : (
            <ul className="divide-y divide-ivory-300">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link href={a.href} className="flex items-start gap-3 px-5 py-3.5 min-h-[44px] hover:bg-ivory-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
                    <span className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${a.tone === "orange" ? "bg-orange-50 text-orange-600" : "bg-olive-100 text-olive-700"}`}>
                      <a.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm text-charcoal-900 leading-snug">{a.text}</span>
                    <ArrowRight className="w-4 h-4 ml-auto text-charcoal-400 shrink-0 mt-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent orders" description="Latest 5 by date." className="lg:col-span-2" action={<Link href="/admin/orders" className="text-xs font-medium text-olive-700 hover:text-orange-500 inline-flex items-center gap-1">All orders <ArrowRight className="w-3.5 h-3.5" /></Link>}>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" body="Orders appear here as soon as a payment is initiated." />
          ) : (
            <>
              {/* Mobile: stacked rows so the status badges are never clipped */}
              <ul className="sm:hidden divide-y divide-ivory-300">
                {orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/orders?open=${o.id}`} className="font-medium text-charcoal-950 hover:text-olive-700 block truncate">{o.orderNumber}</Link>
                        <span className="text-[11px] text-charcoal-500">{o.customerName} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                      <span className="font-semibold text-charcoal-950 whitespace-nowrap tabular-nums">{formatPaiseToInr(BigInt(o.totalPaise))}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={o.orderStatus} />
                      <StatusBadge status={o.fulfilmentStatus} />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop/tablet: table */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th>Fulfilment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders?open=${o.id}`} className="font-medium text-charcoal-950 hover:text-olive-700">{o.orderNumber}</Link>
                          <div className="text-[11px] text-charcoal-500">{new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
                        </td>
                        <td className="text-charcoal-800">{o.customerName}</td>
                        <td className="font-medium text-charcoal-950 whitespace-nowrap text-right tabular-nums">{formatPaiseToInr(BigInt(o.totalPaise))}</td>
                        <td><StatusBadge status={o.orderStatus} /></td>
                        <td><StatusBadge status={o.fulfilmentStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Upcoming appointments" description="Confirmed viewings from today onward." className="lg:col-span-1" action={<Link href="/admin/leads?tab=APPOINTMENTS" className="text-xs font-medium text-olive-700 hover:text-orange-500">All</Link>}>
          {stats.upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled" body="Confirmed viewings show here with date and mode." />
          ) : (
            <ul className="divide-y divide-ivory-300">
              {stats.upcoming.slice(0, 5).map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-charcoal-950">{a.customerName}</p>
                  <p className="text-xs text-charcoal-600">
                    {new Date(a.requestedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {a.requestedTimeSlot} · {a.locationPreference === "IN_STORE" ? "In atelier" : "Video call"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent enquiries" description="Callbacks, viewing requests and WhatsApp taps." className="lg:col-span-1" action={<Link href="/admin/leads" className="text-xs font-medium text-olive-700 hover:text-orange-500">All leads</Link>}>
          {leads.length + appointments.length === 0 ? (
            <EmptyState title="No enquiries yet" body="WhatsApp intents, callbacks and appointment requests land here." />
          ) : (
            <ul className="divide-y divide-ivory-300">
              {[
                ...appointments.map((a) => ({ ...a, kind: "Viewing" as const })),
                ...leads.map((l) => ({ ...l, kind: l.type === "WHATSAPP_INTENT" ? ("WhatsApp" as const) : ("Callback" as const) })),
              ]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="px-5 py-3 flex items-center gap-3">
                    <span className="adm-chip bg-ivory-200 text-charcoal-700 border-ivory-400">{e.kind}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal-950 truncate">{e.kind === "WhatsApp" ? e.variantSku || "General" : e.customerName}</p>
                      <p className="text-xs text-charcoal-500 truncate">{e.product?.title || (e.kind === "WhatsApp" ? "Tap recorded" : "General consultation")}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title="Store snapshot" description="Live policy values." className="lg:col-span-1">
          <dl className="px-5 py-2 divide-y divide-ivory-300 text-sm">
            <div className="py-3 flex items-center justify-between gap-4">
              <dt className="text-charcoal-600">Online purchases</dt>
              <dd><StatusBadge status={settings?.enablePurchases === false ? "CLOSED_LOST" : "CONFIRMED"} label={settings?.enablePurchases === false ? "Paused" : "Enabled"} /></dd>
            </div>
            <div className="py-3 flex items-center justify-between gap-4">
              <dt className="text-charcoal-600">High-value threshold</dt>
              <dd className="font-medium text-charcoal-950 tabular-nums">{thresholdInr}</dd>
            </div>
            <div className="py-3 flex items-center justify-between gap-4">
              <dt className="text-charcoal-600">GST on jewellery</dt>
              <dd className="font-medium text-charcoal-950 tabular-nums">{settings?.gstPercentage ?? 3}%</dd>
            </div>
            <div className="py-3 flex items-center justify-between gap-4">
              <dt className="text-charcoal-600">Concierge WhatsApp</dt>
              <dd className="font-medium text-charcoal-950 tabular-nums">+{settings?.whatsappNumber ?? "—"}</dd>
            </div>
          </dl>
          <div className="px-5 pb-5">
            <Link href="/admin/settings" className="adm-btn-ghost w-full">
              <Settings className="w-3.5 h-3.5" /> Edit settings
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

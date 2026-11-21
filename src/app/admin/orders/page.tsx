"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPaiseToInr } from "@/lib/money";
import { PageHeader, Card, StatusBadge, EmptyState, Loading, Alert } from "@/components/admin/ui";
import { X } from "lucide-react";

interface OrderItem {
  id?: string;
  sku: string;
  productTitle: string;
  variantAttributes?: Record<string, unknown> | null;
  metalType?: string;
  size?: string | null;
  purity?: string | null;
  unitPricePaise: string;
  quantity: number;
  lineTotalPaise: string;
}

interface PaymentEvent {
  id: string;
  eventType: string;
  signatureVerified: boolean;
  processedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: Record<string, string> | null;
  orderStatus: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  subtotalPaise?: string;
  taxPaise?: string;
  shippingPaise?: string;
  totalPaise: string;
  trackingNumber?: string | null;
  carrierName?: string | null;
  adminNotes?: string | null;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  createdAt: string;
  items?: OrderItem[];
  paymentEvents?: PaymentEvent[];
}

const STATUS_FILTERS = ["ALL", "CONFIRMED", "RECONCILIATION_REQUIRED", "PENDING", "CANCELLED"];

function OrdersPageInner() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(searchParams.get("status") || "ALL");
  const [fulfilmentFilter] = useState<string | null>(searchParams.get("fulfilment"));
  const [warning, setWarning] = useState<string | null>(null);
  const [open, setOpen] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ fulfilmentStatus: "", trackingNumber: "", carrierName: "", adminNotes: "" });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "ALL" ? "/api/admin/orders" : `/api/admin/orders?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setWarning(data.warning || null);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrder = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setOpen(data.order);
        setForm({
          fulfilmentStatus: data.order.fulfilmentStatus || "UNFULFILLED",
          trackingNumber: data.order.trackingNumber || "",
          carrierName: data.order.carrierName || "",
          adminNotes: data.order.adminNotes || "",
        });
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Deep link from the dashboard: /admin/orders?open=<id>
  useEffect(() => {
    const id = searchParams.get("open");
    if (id) openOrder(id);
  }, [searchParams, openOrder]);

  const save = async () => {
    if (!open) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${open.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update the order.");
      setMsg({ tone: "success", text: `${open.orderNumber} updated. Guest tracking now shows the new status.` });
      setOrders((prev) => prev.map((o) => (o.id === open.id ? { ...o, ...form } : o)));
      setOpen((prev) => (prev ? { ...prev, ...form } : prev));
    } catch (err) {
      setMsg({ tone: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const visible = fulfilmentFilter ? orders.filter((o) => o.fulfilmentStatus === fulfilmentFilter) : orders;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders & fulfilment"
        description="Payments, atomic stock commitments and courier dispatch. Open an order for its item snapshots and payment events."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 min-h-[36px] rounded text-[11px] font-semibold transition-colors ${
                  filter === f ? "bg-olive-600 text-ivory-50 border border-olive-600" : "bg-ivory-100 border border-ivory-400 text-charcoal-800 hover:bg-ivory-200"
                }`}
                aria-pressed={filter === f}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        }
      />

      {warning && <Alert tone="warning">{warning}</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {fulfilmentFilter && <Alert tone="info">Showing only orders with fulfilment {fulfilmentFilter.replace(/_/g, " ")}.</Alert>}

      {loading ? (
        <Loading label="Loading orders…" />
      ) : visible.length === 0 ? (
        <Card><EmptyState title="No orders for this filter" body="Change the status filter or wait for the next checkout." /></Card>
      ) : (
        <>
          {/* Mobile: one tappable card per order (the table clips the status on narrow screens) */}
          <div className="sm:hidden space-y-3">
            {visible.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order.id)}
                className="adm-card w-full text-left p-4 active:bg-ivory-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-charcoal-950 block truncate">{order.orderNumber}</span>
                    <span className="text-[11px] text-charcoal-500">{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  <span className="font-semibold text-charcoal-950 whitespace-nowrap tabular-nums">{formatPaiseToInr(BigInt(order.totalPaise))}</span>
                </div>
                <div className="mt-2 text-sm text-charcoal-800">{order.customerName}</div>
                <div className="text-[11px] text-charcoal-500">+91 {order.customerPhone}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.orderStatus} />
                  <StatusBadge status={order.fulfilmentStatus} />
                  <span className="text-[10px] text-charcoal-500 uppercase tracking-wide">Pay: {order.paymentStatus}</span>
                </div>
                {order.trackingNumber && (
                  <div className="mt-2 text-[11px] text-charcoal-600">{order.carrierName || "Courier"} · {order.trackingNumber}</div>
                )}
              </button>
            ))}
          </div>

          {/* Desktop/tablet: full table */}
          <Card className="overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th className="text-right">Amount</th>
                    <th>Payment & order</th>
                    <th>Fulfilment</th>
                    <th>Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <button type="button" onClick={() => openOrder(order.id)} className="font-medium text-charcoal-950 hover:text-olive-700 text-left min-h-[32px]">
                          {order.orderNumber}
                        </button>
                        <div className="text-[11px] text-charcoal-500">{new Date(order.createdAt).toLocaleDateString("en-IN")}</div>
                      </td>
                      <td>
                        <div className="font-medium text-charcoal-950">{order.customerName}</div>
                        <div className="text-[11px] text-charcoal-500">+91 {order.customerPhone}</div>
                      </td>
                      <td className="font-medium text-charcoal-950 text-right whitespace-nowrap tabular-nums">{formatPaiseToInr(BigInt(order.totalPaise))}</td>
                      <td>
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={order.orderStatus} />
                          <span className="text-[10px] text-charcoal-500">{order.paymentStatus}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={order.fulfilmentStatus} /></td>
                      <td className="text-[11px] text-charcoal-600">
                        {order.trackingNumber ? `${order.carrierName || "Courier"} · ${order.trackingNumber}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Order detail drawer */}
      {(open || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-charcoal-950/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Order details">
          <div className="w-full max-w-2xl h-full bg-ivory-100 shadow-dropdown flex flex-col">
            <header className="px-6 py-4 border-b border-ivory-400 bg-ivory-50 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-charcoal-950">{open?.orderNumber || "Loading…"}</h2>
                {open && <p className="text-xs text-charcoal-500">{new Date(open.createdAt).toLocaleString("en-IN")} · {open.customerName} · {open.customerEmail} · +91 {open.customerPhone}</p>}
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="w-11 h-11 flex items-center justify-center text-charcoal-600 hover:text-charcoal-950" autoFocus>
                <X className="w-5 h-5" />
              </button>
            </header>

            {detailLoading && !open ? (
              <Loading />
            ) : open && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={open.orderStatus} />
                  <StatusBadge status={open.paymentStatus} label={`Payment ${open.paymentStatus}`} />
                  <StatusBadge status={open.fulfilmentStatus} />
                  {open.orderStatus === "RECONCILIATION_REQUIRED" && (
                    <span className="text-xs text-orange-700">Late payment arrived after the stock hold expired. Confirm stock before dispatching.</span>
                  )}
                </div>

                <Card title="Items" description="Snapshot taken at checkout; later catalogue edits do not change it.">
                  <table className="adm-table">
                    <thead><tr><th>Piece</th><th>Variant</th><th className="text-right">Unit</th><th className="text-right">Qty</th><th className="text-right">Line</th></tr></thead>
                    <tbody>
                      {(open.items || []).map((i, idx) => {
                        const attrs = (i.variantAttributes || {}) as Record<string, unknown>;
                        const variantText = [attrs.metalType || i.metalType, attrs.purity || i.purity, attrs.size || i.size].filter(Boolean).join(" · ");
                        return (
                          <tr key={i.id || idx}>
                            <td><div className="font-medium text-charcoal-950">{i.productTitle}</div><div className="text-[11px] text-charcoal-500">{i.sku}</div></td>
                            <td className="text-xs text-charcoal-700">{variantText || "—"}</td>
                            <td className="text-right tabular-nums">{formatPaiseToInr(BigInt(i.unitPricePaise))}</td>
                            <td className="text-right tabular-nums">{i.quantity}</td>
                            <td className="text-right tabular-nums font-medium">{formatPaiseToInr(BigInt(i.lineTotalPaise))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <dl className="px-4 py-3 text-sm grid grid-cols-2 gap-y-1 tabular-nums">
                    {open.subtotalPaise && <><dt className="text-charcoal-600">Subtotal</dt><dd className="text-right">{formatPaiseToInr(BigInt(open.subtotalPaise))}</dd></>}
                    {open.taxPaise && <><dt className="text-charcoal-600">GST</dt><dd className="text-right">{formatPaiseToInr(BigInt(open.taxPaise))}</dd></>}
                    {open.shippingPaise && <><dt className="text-charcoal-600">Shipping</dt><dd className="text-right">{formatPaiseToInr(BigInt(open.shippingPaise))}</dd></>}
                    <dt className="font-medium text-charcoal-950">Total</dt><dd className="text-right font-semibold">{formatPaiseToInr(BigInt(open.totalPaise))}</dd>
                  </dl>
                </Card>

                {open.shippingAddress && (
                  <Card title="Shipping address">
                    <p className="px-5 py-3 text-sm text-charcoal-800">
                      {[open.shippingAddress.line1, open.shippingAddress.line2, open.shippingAddress.city, open.shippingAddress.state, open.shippingAddress.pinCode].filter(Boolean).join(", ")}
                    </p>
                  </Card>
                )}

                <Card title="Payment events" description="Signature-verified gateway events.">
                  {(open.paymentEvents || []).length === 0 ? (
                    <EmptyState title="No events recorded" body={open.gatewayOrderId ? `Gateway order ${open.gatewayOrderId}` : "No gateway order yet."} />
                  ) : (
                    <ul className="divide-y divide-ivory-300 text-sm">
                      {(open.paymentEvents || []).map((e) => (
                        <li key={e.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                          <span className="text-charcoal-900">{e.eventType}</span>
                          <span className="text-xs text-charcoal-500">{new Date(e.processedAt).toLocaleString("en-IN")} · {e.signatureVerified ? "verified" : "unverified"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Fulfilment" description="Changes show on the customer's tracking page immediately.">
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="adm-label">Status</span>
                      <select className="adm-input" value={form.fulfilmentStatus} onChange={(e) => setForm({ ...form, fulfilmentStatus: e.target.value })}>
                        {["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="adm-label">Carrier</span>
                      <input className="adm-input" value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} placeholder="Sequel / Blue Dart" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="adm-label">Tracking number</span>
                      <input className="adm-input" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="adm-label">Internal notes</span>
                      <textarea rows={2} className="adm-input" value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} />
                    </label>
                  </div>
                </Card>
              </div>
            )}

            <footer className="px-6 py-4 border-t border-ivory-400 bg-ivory-50 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(null)} className="adm-btn-ghost">Close</button>
              <button type="button" onClick={save} disabled={saving || !open} className="adm-btn">{saving ? "Saving…" : "Save fulfilment"}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Loading label="Loading orders…" />}>
      <OrdersPageInner />
    </Suspense>
  );
}

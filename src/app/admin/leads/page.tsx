"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Card, StatusBadge, EmptyState, Loading, Alert } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/common/WhatsAppButton";
import { Phone } from "lucide-react";

type EnquiryStatus = "NEW" | "CONTACTED" | "SCHEDULED" | "CLOSED_CONVERTED" | "CLOSED_LOST";
type TabKey = "CALLBACKS" | "APPOINTMENTS" | "INTENTS";

interface Lead {
  id: string;
  type: "CALLBACK" | "WHATSAPP_INTENT";
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  preferredTime?: string | null;
  message?: string | null;
  variantSku?: string | null;
  sourceUrl?: string | null;
  status: EnquiryStatus;
  staffNotes?: string | null;
  createdAt: string;
  product?: { title: string; skuGroup: string } | null;
}

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  requestedDate: string;
  requestedTimeSlot: string;
  locationPreference: string;
  status: EnquiryStatus;
  staffNotes?: string | null;
  createdAt: string;
  product?: { title: string; skuGroup: string } | null;
}

/** Permitted transitions; closed states are terminal. */
const NEXT: Record<EnquiryStatus, EnquiryStatus[]> = {
  NEW: ["NEW", "CONTACTED", "SCHEDULED", "CLOSED_LOST"],
  CONTACTED: ["CONTACTED", "SCHEDULED", "CLOSED_CONVERTED", "CLOSED_LOST"],
  SCHEDULED: ["SCHEDULED", "CONTACTED", "CLOSED_CONVERTED", "CLOSED_LOST"],
  CLOSED_CONVERTED: ["CLOSED_CONVERTED"],
  CLOSED_LOST: ["CLOSED_LOST", "CONTACTED"],
};

function variantFromUrl(url?: string | null) {
  try {
    if (!url) return null;
    const u = new URL(url);
    return u.searchParams.get("variant");
  } catch {
    return null;
  }
}

function LeadsPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "CALLBACKS");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "ALL");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/leads");
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
          setAppointments(data.appointments || []);
          setWarning(data.warning || null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const changeStatus = async (id: string, targetType: "LEAD" | "APPOINTMENT", status: EnquiryStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, targetType, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      if (targetType === "LEAD") setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      else setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      setMsg({ tone: "success", text: "Status saved." });
    } catch (err) {
      setMsg({ tone: "error", text: (err as Error).message });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const byStatus = <T extends { status: EnquiryStatus }>(rows: T[]) => (statusFilter === "ALL" ? rows : rows.filter((r) => r.status === statusFilter));
  const callbacks = byStatus(leads.filter((l) => l.type !== "WHATSAPP_INTENT"));
  const intents = byStatus(leads.filter((l) => l.type === "WHATSAPP_INTENT"));
  const appts = byStatus(appointments);

  const tabs: [TabKey, string, number][] = [
    ["CALLBACKS", "Callback requests", callbacks.length],
    ["APPOINTMENTS", "Appointment requests", appts.length],
    ["INTENTS", "WhatsApp intents", intents.length],
  ];

  const ContactActions = ({ phone, name, piece }: { phone: string; name: string; piece?: string | null }) => {
    const digits = phone.replace(/\D/g, "");
    const wa = `https://wa.me/91${digits}?text=${encodeURIComponent(`Hello ${name}, this is the Chudiwalas concierge${piece ? ` about the ${piece}` : ""}.`)}`;
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <a href={`tel:+91${digits}`} className="adm-btn-ghost !px-2 min-h-[32px]" aria-label={`Call ${name}`} title="Call"><Phone className="w-3.5 h-3.5" /> Call</a>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 min-h-[32px] rounded-md border border-[#25D366] text-[#128C4B] text-xs font-medium hover:bg-[#25D366] hover:text-white transition-colors" aria-label={`WhatsApp ${name}`} title="WhatsApp"><WhatsAppIcon className="w-3.5 h-3.5" /> WhatsApp</a>
      </div>
    );
  };

  const StatusSelect = ({ value, onChange, disabled }: { value: EnquiryStatus; onChange: (s: EnquiryStatus) => void; disabled: boolean }) => (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as EnquiryStatus)} className="adm-input !w-auto text-xs py-1.5 min-h-[36px]" aria-label="Change status">
      {NEXT[value].map((s) => (
        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & viewings"
        description="Callback requests, appointment bookings and WhatsApp taps. A WhatsApp intent is a recorded tap, not a received message."
        actions={
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="adm-input !w-auto text-xs py-2" aria-label="Filter by status">
            {["ALL", "NEW", "CONTACTED", "SCHEDULED", "CLOSED_CONVERTED", "CLOSED_LOST"].map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
        }
      />

      {warning && <Alert tone="warning">{warning}</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <div className="flex border-b border-ivory-400 gap-6 text-xs uppercase tracking-[0.12em] font-medium overflow-x-auto" role="tablist">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`pb-3 min-h-[44px] border-b-2 whitespace-nowrap transition-colors ${activeTab === key ? "border-olive-600 text-olive-800" : "border-transparent text-charcoal-500 hover:text-charcoal-900"}`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading enquiries…" />
      ) : activeTab === "CALLBACKS" ? (
        <Card className="overflow-hidden">
          {callbacks.length === 0 ? (
            <EmptyState title="No callback requests" body="Requests from the consultation page appear here." />
          ) : (
            <>
            <div className="sm:hidden divide-y divide-ivory-300">
              {callbacks.map((lead) => (
                <div key={lead.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-charcoal-950 truncate">{lead.customerName}</div>
                      <div className="text-[11px] text-charcoal-500">{new Date(lead.createdAt).toLocaleString("en-IN")}</div>
                    </div>
                    <StatusSelect value={lead.status} disabled={updatingId === lead.id} onChange={(s) => changeStatus(lead.id, "LEAD", s)} />
                  </div>
                  <div className="mt-1 text-sm text-charcoal-800">+91 {lead.customerPhone}</div>
                  <div className="text-[11px] text-charcoal-600">{lead.preferredTime || "Anytime"}{lead.product ? ` · ${lead.product.title}` : ""}</div>
                  {lead.message && <div className="text-[11px] italic text-charcoal-500 mt-1 line-clamp-2">“{lead.message}”</div>}
                  <div className="mt-2"><ContactActions phone={lead.customerPhone} name={lead.customerName} piece={lead.product?.title} /></div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="adm-table">
                <thead><tr><th>Customer</th><th>Contact</th><th>Preferred time / notes</th><th>Piece</th><th>Status</th></tr></thead>
                <tbody>
                  {callbacks.map((lead) => (
                    <tr key={lead.id}>
                      <td><div className="font-medium text-charcoal-950">{lead.customerName}</div><div className="text-[11px] text-charcoal-500">{new Date(lead.createdAt).toLocaleString("en-IN")}</div></td>
                      <td><div className="text-charcoal-900">+91 {lead.customerPhone}</div>{lead.customerEmail && <div className="text-[11px] text-charcoal-500">{lead.customerEmail}</div>}<ContactActions phone={lead.customerPhone} name={lead.customerName} piece={lead.product?.title} /></td>
                      <td className="max-w-xs text-charcoal-700"><div>{lead.preferredTime || "Anytime"}</div>{lead.message && <div className="text-[11px] italic text-charcoal-500 mt-0.5 line-clamp-2">“{lead.message}”</div>}</td>
                      <td className="text-charcoal-800">{lead.product ? lead.product.title : <span className="text-charcoal-400">General consultation</span>}{lead.variantSku && <div className="text-[11px] text-charcoal-500">{lead.variantSku}</div>}</td>
                      <td><StatusSelect value={lead.status} disabled={updatingId === lead.id} onChange={(s) => changeStatus(lead.id, "LEAD", s)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      ) : activeTab === "APPOINTMENTS" ? (
        <Card className="overflow-hidden">
          {appts.length === 0 ? (
            <EmptyState title="No viewing requests" body="Appointment requests from the consultation page appear here." />
          ) : (
            <>
            <div className="sm:hidden divide-y divide-ivory-300">
              {appts.map((a) => (
                <div key={a.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-charcoal-950 truncate">{a.customerName}</div>
                      <div className="text-[11px] text-charcoal-500">{new Date(a.createdAt).toLocaleString("en-IN")}</div>
                    </div>
                    <StatusSelect value={a.status} disabled={updatingId === a.id} onChange={(s) => changeStatus(a.id, "APPOINTMENT", s)} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.locationPreference === "IN_STORE" ? "SCHEDULED" : "CONTACTED"} label={a.locationPreference === "IN_STORE" ? "In atelier" : "Video call"} />
                    <span className="text-[11px] text-charcoal-700">{new Date(a.requestedDate).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} · {a.requestedTimeSlot}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-charcoal-600">{a.product ? a.product.title : "Atelier consultation"}</div>
                  <div className="mt-1 text-sm text-charcoal-800">+91 {a.customerPhone}</div>
                  <div className="mt-2"><ContactActions phone={a.customerPhone} name={a.customerName} piece={a.product?.title} /></div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="adm-table">
                <thead><tr><th>Customer</th><th>Contact</th><th>Requested viewing</th><th>Mode</th><th>Piece</th><th>Status</th></tr></thead>
                <tbody>
                  {appts.map((a) => (
                    <tr key={a.id}>
                      <td><div className="font-medium text-charcoal-950">{a.customerName}</div><div className="text-[11px] text-charcoal-500">{new Date(a.createdAt).toLocaleString("en-IN")}</div></td>
                      <td><div className="text-charcoal-900">+91 {a.customerPhone}</div><div className="text-[11px] text-charcoal-500">{a.customerEmail}</div><ContactActions phone={a.customerPhone} name={a.customerName} piece={a.product?.title} /></td>
                      <td className="text-charcoal-800"><div className="font-medium">{new Date(a.requestedDate).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</div><div className="text-[11px] text-charcoal-500">{a.requestedTimeSlot}</div></td>
                      <td><StatusBadge status={a.locationPreference === "IN_STORE" ? "SCHEDULED" : "CONTACTED"} label={a.locationPreference === "IN_STORE" ? "In atelier" : "Video call"} /></td>
                      <td className="text-charcoal-800">{a.product ? a.product.title : "Atelier consultation"}</td>
                      <td><StatusSelect value={a.status} disabled={updatingId === a.id} onChange={(s) => changeStatus(a.id, "APPOINTMENT", s)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {intents.length === 0 ? (
            <EmptyState title="No WhatsApp taps recorded" body="Every WhatsApp button on the storefront records the piece and selection here when tapped." />
          ) : (
            <>
            <div className="sm:hidden divide-y divide-ivory-300">
              {intents.map((i) => {
                const v = variantFromUrl(i.sourceUrl);
                return (
                  <div key={i.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-charcoal-950 truncate">{i.variantSku || v || "General"}</div>
                        {i.product && <div className="text-[11px] text-charcoal-500 truncate">{i.product.title}</div>}
                        <div className="text-[11px] text-charcoal-500">{new Date(i.createdAt).toLocaleString("en-IN")}</div>
                      </div>
                      <StatusSelect value={i.status} disabled={updatingId === i.id} onChange={(s) => changeStatus(i.id, "LEAD", s)} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="adm-table">
                <thead><tr><th>When</th><th>SKU / selection</th><th>Source page</th><th>Status</th></tr></thead>
                <tbody>
                  {intents.map((i) => {
                    const v = variantFromUrl(i.sourceUrl);
                    return (
                      <tr key={i.id}>
                        <td className="text-charcoal-800 whitespace-nowrap">{new Date(i.createdAt).toLocaleString("en-IN")}</td>
                        <td><div className="font-medium text-charcoal-950">{i.variantSku || v || "General"}</div>{i.product && <div className="text-[11px] text-charcoal-500">{i.product.title}</div>}</td>
                        <td className="max-w-xs truncate text-xs text-charcoal-600">{i.sourceUrl && /^https?:\/\//.test(i.sourceUrl) ? <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-olive-700 underline underline-offset-4">{i.sourceUrl.replace(/^https?:\/\/[^/]+/, "")}</a> : i.sourceUrl ? <span>{i.sourceUrl.slice(0, 80)}</span> : "—"}</td>
                        <td><StatusSelect value={i.status} disabled={updatingId === i.id} onChange={(s) => changeStatus(i.id, "LEAD", s)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<Loading label="Loading enquiries…" />}>
      <LeadsPageInner />
    </Suspense>
  );
}

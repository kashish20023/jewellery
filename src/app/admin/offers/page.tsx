"use client";

import React, { useEffect, useState } from "react";
import { PageHeader, Card, StatusBadge, EmptyState, Loading, Alert } from "@/components/admin/ui";
import { Plus, Trash2, Save } from "lucide-react";

interface Offer {
  id: string;
  title: string;
  description?: string | null;
  code?: string | null;
  isAuto: boolean;
  isActive: boolean;
  displayOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

const EMPTY: Omit<Offer, "id"> = { title: "", description: "", code: "", isAuto: true, isActive: true, displayOrder: 0, startsAt: "", endsAt: "" };

const toIso = (local?: string | null) => (local ? new Date(local).toISOString() : null);
const scheduleState = (o: Offer) => {
  const now = Date.now();
  if (!o.isActive) return "Paused";
  if (o.startsAt && new Date(o.startsAt).getTime() > now) return "Scheduled";
  if (o.endsAt && new Date(o.endsAt).getTime() < now) return "Expired";
  return "Live";
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [draft, setDraft] = useState<Omit<Offer, "id">>(EMPTY);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offers");
      const data = await res.json();
      setOffers(data.offers || []);
      setWarning(data.warning || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (tone: "success" | "error", text: string) => {
    setMsg({ tone, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("new");
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          code: draft.code || null,
          isAuto: !draft.code,
          displayOrder: Number(draft.displayOrder) || 0,
          startsAt: toIso(draft.startsAt),
          endsAt: toIso(draft.endsAt),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create offer.");
      setDraft(EMPTY);
      flash("success", "Offer added. It is live on product pages.");
      await load();
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const patch = async (o: Offer, changes: Partial<Offer>) => {
    setSaving(o.id);
    try {
      const res = await fetch(`/api/admin/offers/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update offer.");
      setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...data.offer } : x)));
      flash("success", "Offer updated.");
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const remove = async (o: Offer) => {
    if (!window.confirm(`Delete "${o.title}"? This cannot be undone.`)) return;
    setSaving(o.id);
    try {
      const res = await fetch(`/api/admin/offers/${o.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete offer.");
      setOffers((prev) => prev.filter((x) => x.id !== o.id));
      flash("success", "Offer deleted.");
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        description="Shown as the 'Special offers' strip on every product page. Display only: set the selling price and compare-at price on the product itself."
      />

      {warning && <Alert tone="warning">{warning}</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Add an offer" description="Leave the code empty for an auto-applied offer." className="lg:col-span-1">
          <form onSubmit={create} className="p-5 space-y-4">
            <div>
              <label className="adm-label" htmlFor="offer-title">Title</label>
              <input id="offer-title" className="adm-input" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Min. 30% off on making charges" />
            </div>
            <div>
              <label className="adm-label" htmlFor="offer-desc">Description</label>
              <input id="offer-desc" className="adm-input" value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Auto applied at checkout" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="adm-label" htmlFor="offer-code">Coupon code</label>
                <input id="offer-code" className="adm-input uppercase" value={draft.code || ""} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="FIRST05" />
              </div>
              <div>
                <label className="adm-label" htmlFor="offer-order">Order</label>
                <input id="offer-order" type="number" min={0} className="adm-input" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="adm-label" htmlFor="offer-start">Starts (optional)</label>
                <input id="offer-start" type="datetime-local" className="adm-input text-xs" value={draft.startsAt || ""} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
              </div>
              <div>
                <label className="adm-label" htmlFor="offer-end">Ends (optional)</label>
                <input id="offer-end" type="datetime-local" className="adm-input text-xs" value={draft.endsAt || ""} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
              </div>
            </div>
            <p className="text-[11px] text-charcoal-500">Appears in the “Special offers” strip on every public-priced product page while live. Expired or paused offers disappear automatically.</p>
            <button type="submit" disabled={saving === "new"} className="adm-btn w-full">
              <Plus className="w-3.5 h-3.5" /> {saving === "new" ? "Adding…" : "Add offer"}
            </button>
          </form>
        </Card>

        <Card title="Live offers" description="Toggle to pause without deleting." className="lg:col-span-2">
          {loading ? (
            <Loading />
          ) : offers.length === 0 ? (
            <EmptyState title="No offers yet" body="Add one on the left. It appears on every product page immediately." />
          ) : (
            <ul className="divide-y divide-ivory-300">
              {offers.map((o) => (
                <li key={o.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-charcoal-950">{o.title}</p>
                      <StatusBadge status={scheduleState(o) === "Live" ? "CONFIRMED" : scheduleState(o) === "Scheduled" ? "SCHEDULED" : "CLOSED_LOST"} label={scheduleState(o)} />
                      <span className="adm-chip bg-ivory-200 text-charcoal-700 border-ivory-400">{o.code ? o.code : "Auto"}</span>
                    </div>
                    {o.description && <p className="text-xs text-charcoal-600 mt-0.5">{o.description}</p>}
                    {(o.startsAt || o.endsAt) && (
                      <p className="text-[11px] text-charcoal-500 mt-0.5">
                        {o.startsAt ? `From ${new Date(o.startsAt).toLocaleString("en-IN")}` : ""}{o.startsAt && o.endsAt ? " · " : ""}{o.endsAt ? `Until ${new Date(o.endsAt).toLocaleString("en-IN")}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" disabled={saving === o.id} onClick={() => patch(o, { isActive: !o.isActive })} className="adm-btn-ghost">
                      <Save className="w-3.5 h-3.5" /> {o.isActive ? "Pause" : "Resume"}
                    </button>
                    <button type="button" disabled={saving === o.id} onClick={() => remove(o)} className="adm-btn-ghost text-red-700" aria-label={`Delete ${o.title}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

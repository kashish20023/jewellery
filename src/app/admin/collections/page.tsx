"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, EmptyState, Loading, Alert } from "@/components/admin/ui";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { slugify } from "@/lib/utils";
import { Plus, Trash2, Save, ExternalLink, ImagePlus, Archive, ArchiveRestore } from "lucide-react";

export interface AdminCollection {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  displayOrder: number;
  showInNav: boolean;
  isArchived: boolean;
  productCount: number;
}

type Draft = {
  title: string;
  slug: string;
  description: string;
  bannerImageUrl: string;
  displayOrder: number;
  showInNav: boolean;
};

const EMPTY: Draft = { title: "", slug: "", description: "", bannerImageUrl: "", displayOrder: 0, showInNav: true };

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Draft>>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string>("new");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/collections");
      const data = await res.json();
      setCollections(data.collections || []);
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
    setTimeout(() => setMsg(null), 4500);
  };

  const derivedSlug = slugTouched ? draft.slug : slugify(draft.title);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving("new");
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          slug: derivedSlug || null,
          description: draft.description.trim() || null,
          bannerImageUrl: draft.bannerImageUrl.trim() || null,
          displayOrder: Number(draft.displayOrder) || 0,
          showInNav: draft.showInNav,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the collection.");
      setDraft(EMPTY);
      setSlugTouched(false);
      flash(
        "success",
        `“${data.collection.title}” created. Tag products to it from Products → Collections & flags.${
          data.collection.showInNav ? " It is now in the storefront navbar." : ""
        }`
      );
      await load();
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const patch = async (c: AdminCollection, changes: Partial<Draft> & { isArchived?: boolean }) => {
    setSaving(c.id);
    try {
      const res = await fetch(`/api/admin/collections/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update the collection.");
      setCollections((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...data.collection } : x)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      flash("success", "Collection updated. The storefront and navbar were refreshed.");
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const remove = async (c: AdminCollection) => {
    const warn =
      c.productCount > 0
        ? `Delete “${c.title}”? ${c.productCount} ${c.productCount === 1 ? "product loses" : "products lose"} this tag. The products themselves are kept.`
        : `Delete “${c.title}”? This cannot be undone.`;
    if (!window.confirm(warn)) return;
    setSaving(c.id);
    try {
      const res = await fetch(`/api/admin/collections/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete the collection.");
      setCollections((prev) => prev.filter((x) => x.id !== c.id));
      flash("success", "Collection deleted.");
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  /** Banner upload reuses the product media endpoint; the key is namespaced. */
  const pickBanner = (target: string) => {
    uploadTarget.current = target;
    fileInput.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const target = uploadTarget.current;
    const slugForKey =
      target === "new"
        ? derivedSlug || "untitled"
        : collections.find((c) => c.id === target)?.slug || "collection";
    setUploading(target);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("productSlug", `collection-${slugForKey}`);
      const res = await fetch("/api/admin/media/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      if (target === "new") {
        setDraft((d) => ({ ...d, bannerImageUrl: data.url }));
      } else {
        setEdits((prev) => ({ ...prev, [target]: { ...prev[target], bannerImageUrl: data.url } }));
      }
      flash("success", "Banner uploaded. Save the collection to keep it.");
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const field = (c: AdminCollection, key: keyof Draft) => {
    const edit = edits[c.id] || {};
    if (key in edit) return edit[key];
    if (key === "description") return c.description || "";
    if (key === "bannerImageUrl") return c.bannerImageUrl || "";
    return c[key as "title" | "slug" | "displayOrder" | "showInNav"];
  };

  const setField = (id: string, key: keyof Draft, value: string | number | boolean) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const dirty = (id: string) => Object.keys(edits[id] || {}).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Collections are the merchandising groups a product can be tagged to — polki suites, bridal, everyday. Each one gets its own /collections/<slug> page, and appears in the storefront navbar under “Collections”."
      />

      {warning && <Alert tone="warning">{warning}</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFile} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Create a collection" description="The URL is derived from the title. You can tag products straight after." className="lg:col-span-1">
          <form onSubmit={create} className="p-5 space-y-4">
            <div>
              <label className="adm-label" htmlFor="col-title">Title</label>
              <input
                id="col-title"
                className="adm-input"
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Wedding Polki Suites"
              />
            </div>
            <div>
              <label className="adm-label" htmlFor="col-slug">URL slug</label>
              <input
                id="col-slug"
                className="adm-input lowercase"
                value={derivedSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft({ ...draft, slug: e.target.value });
                }}
                placeholder="wedding-polki-suites"
              />
              <p className="text-[11px] text-charcoal-500 mt-1">/collections/{derivedSlug || "…"}</p>
            </div>
            <div>
              <label className="adm-label" htmlFor="col-desc">Description</label>
              <textarea
                id="col-desc"
                rows={3}
                className="adm-input"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Heirloom wedding suites in 22K hallmarked gold, built to order in Jaipur."
              />
            </div>
            <div>
              <label className="adm-label" htmlFor="col-banner">Banner photograph</label>
              <input
                id="col-banner"
                className="adm-input"
                value={draft.bannerImageUrl}
                onChange={(e) => setDraft({ ...draft, bannerImageUrl: e.target.value })}
                placeholder="https://… or upload"
              />
              <button type="button" onClick={() => pickBanner("new")} disabled={uploading === "new"} className="adm-btn-ghost mt-2">
                <ImagePlus className="w-3.5 h-3.5" /> {uploading === "new" ? "Uploading…" : "Upload a photograph"}
              </button>
              <p className="text-[11px] text-charcoal-500 mt-1">Shown on the collection card, its page banner and the navbar menu tile. Landscape crops read best.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="adm-label" htmlFor="col-order">Order</label>
                <input
                  id="col-order"
                  type="number"
                  min={0}
                  className="adm-input"
                  value={draft.displayOrder}
                  onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-charcoal-800 min-h-[36px]">
                <input type="checkbox" className="accent-[#556B2F]" checked={draft.showInNav} onChange={(e) => setDraft({ ...draft, showInNav: e.target.checked })} />
                Show in navbar
              </label>
            </div>
            <button type="submit" disabled={saving === "new"} className="adm-btn w-full">
              <Plus className="w-3.5 h-3.5" /> {saving === "new" ? "Creating…" : "Create collection"}
            </button>
          </form>
        </Card>

        <Card
          title="Your collections"
          description="Order controls the navbar and the collections index. Untick “Show in navbar” to keep a collection live but out of the menu."
          className="lg:col-span-2"
        >
          {loading ? (
            <Loading />
          ) : collections.length === 0 ? (
            <EmptyState title="No collections yet" body="Create one on the left, then tag products to it from the product editor." />
          ) : (
            <ul className="divide-y divide-ivory-300">
              {collections.map((c) => (
                <li key={c.id} className={`px-5 py-4 ${c.isArchived ? "opacity-60" : ""}`}>
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-md bg-ivory-200">
                      <ImageWithFallback
                        src={String(field(c, "bannerImageUrl") || "")}
                        alt={c.title}
                        fallbackTitle={c.title}
                        fill
                        sizes="80px"
                        className="object-cover object-center"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="adm-input !py-1 text-sm font-medium flex-1 min-w-[160px]"
                          value={String(field(c, "title"))}
                          onChange={(e) => setField(c.id, "title", e.target.value)}
                          aria-label={`Title of ${c.title}`}
                        />
                        <span className="adm-chip bg-ivory-200 text-charcoal-700 border-ivory-400">
                          {c.productCount} {c.productCount === 1 ? "product" : "products"}
                        </span>
                        {c.isArchived && <span className="adm-chip bg-ivory-200 text-charcoal-700 border-ivory-400">Archived</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-charcoal-500">/collections/</span>
                        <input
                          className="adm-input !py-1 text-xs lowercase w-48"
                          value={String(field(c, "slug"))}
                          onChange={(e) => setField(c.id, "slug", e.target.value)}
                          aria-label={`URL slug of ${c.title}`}
                        />
                        <Link href={`/collections/${c.slug}`} target="_blank" className="adm-btn-ghost !py-1 text-[11px]">
                          <ExternalLink className="w-3 h-3" /> View
                        </Link>
                      </div>

                      <textarea
                        rows={2}
                        className="adm-input text-xs"
                        value={String(field(c, "description") || "")}
                        onChange={(e) => setField(c.id, "description", e.target.value)}
                        placeholder="Description shown on the collection card and page"
                        aria-label={`Description of ${c.title}`}
                      />

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-[11px] text-charcoal-600 flex items-center gap-1.5">
                          Order
                          <input
                            type="number"
                            min={0}
                            className="adm-input !py-1 !w-16 text-xs"
                            value={Number(field(c, "displayOrder"))}
                            onChange={(e) => setField(c.id, "displayOrder", Number(e.target.value))}
                          />
                        </label>
                        <label className="text-[11px] text-charcoal-700 flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="accent-[#556B2F]"
                            checked={Boolean(field(c, "showInNav"))}
                            onChange={(e) => setField(c.id, "showInNav", e.target.checked)}
                          />
                          Show in navbar
                        </label>
                        <button type="button" onClick={() => pickBanner(c.id)} disabled={uploading === c.id} className="adm-btn-ghost !py-1 text-[11px]">
                          <ImagePlus className="w-3 h-3" /> {uploading === c.id ? "Uploading…" : "Replace banner"}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={saving === c.id || !dirty(c.id)}
                          onClick={() => patch(c, edits[c.id] || {})}
                          className="adm-btn !py-1.5 text-[11px]"
                        >
                          <Save className="w-3 h-3" /> {saving === c.id ? "Saving…" : dirty(c.id) ? "Save changes" : "Saved"}
                        </button>
                        <button
                          type="button"
                          disabled={saving === c.id}
                          onClick={() => patch(c, { isArchived: !c.isArchived })}
                          className="adm-btn-ghost !py-1.5 text-[11px]"
                        >
                          {c.isArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                          {c.isArchived ? "Restore" : "Archive"}
                        </button>
                        <button
                          type="button"
                          disabled={saving === c.id}
                          onClick={() => remove(c)}
                          className="adm-btn-ghost !py-1.5 text-[11px] text-red-700"
                          aria-label={`Delete ${c.title}`}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
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

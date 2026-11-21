"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPaiseToInr } from "@/lib/money";
import { PageHeader, Card, StatusBadge, EmptyState, Loading, Alert } from "@/components/admin/ui";
import { Plus, X, Search, Upload, ExternalLink, ArrowUp, ArrowDown, Trash2, Eye, ImagePlus, RefreshCcw, Archive } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types (mirror the admin API serialisation)                          */
/* ------------------------------------------------------------------ */

interface Variant {
  id: string;
  sku: string;
  metalType: string;
  metalColour?: string | null;
  size?: string | null;
  purity?: string | null;
  pricePaise: string | null;
  compareAtPricePaise?: string | null;
  offerLabel?: string | null;
  goldValuePaise?: string | null;
  stoneValuePaise?: string | null;
  makingChargesPaise?: string | null;
  makingDiscountPercent?: number | null;
  goldWeightGrams?: number | null;
  stockQuantity: number;
  reservedQuantity?: number;
  isMadeToOrder?: boolean;
  leadTimeDays?: number;
  isPurchaseEnabled: boolean;
  isArchived?: boolean;
}

interface Media {
  id?: string;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  isHoverImage: boolean;
  variantId?: string | null;
}

interface Product {
  id: string;
  slug: string;
  skuGroup: string;
  title: string;
  description: string;
  craftsmanshipNotes?: string | null;
  materialSummary: string;
  stoneDetails?: string | null;
  certificationData?: string | null;
  isEnquiryOnly: boolean;
  priceVisibility: "PUBLIC" | "ON_REQUEST";
  forceWhatsApp: boolean;
  isArchived?: boolean;
  category?: string | null;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  styleId?: string | null;
  stylingTip?: string | null;
  dimensions?: string | null;
  diamondWeightCts?: number | null;
  diamondQuality?: string | null;
  polkiWeightCts?: number | null;
  polkiCount?: number | null;
  otherStones?: string | null;
  grossWeightGrams?: number | null;
  variants: Variant[];
  media?: Media[];
  collectionSlugs?: string[];
}

interface VariantForm {
  id?: string;
  sku: string;
  metalType: string;
  metalColour: string;
  purity: string;
  size: string;
  priceInr: string;
  compareAtPriceInr: string;
  offerLabel: string;
  goldValueInr: string;
  stoneValueInr: string;
  makingChargesInr: string;
  makingDiscountPercent: string;
  goldWeightGrams: string;
  stockQuantity: number;
  reservedQuantity: number;
  isMadeToOrder: boolean;
  leadTimeDays: number;
  isPurchaseEnabled: boolean;
  isArchived: boolean;
  isNew?: boolean;
}

interface CollectionOpt {
  slug: string;
  title: string;
}

interface StorageInfo {
  mode: "cloudinary" | "object-storage" | "local";
  durable: boolean;
  note: string;
}

interface UploadJob {
  id: string;
  file: File;
  name: string;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
}

const CATEGORIES = ["chokers", "necklaces", "earrings", "rings", "bracelets", "bangles", "mangalsutra"];
const COLOURS = ["Yellow Gold", "Rose Gold", "White Gold", "Platinum"];
const PURITIES = ["375 / 9K", "585 / 14K", "750 / 18K", "916 / 22K", "Pt 950"];
const NEW_ID = "__new__";

const inr = (paise?: string | null) => (paise ? (Number(BigInt(paise)) / 100).toString() : "");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toForm(v: Variant): VariantForm {
  return {
    id: v.id,
    sku: v.sku,
    metalType: v.metalType,
    metalColour: v.metalColour || "",
    purity: v.purity || "",
    size: v.size || "",
    priceInr: inr(v.pricePaise),
    compareAtPriceInr: inr(v.compareAtPricePaise),
    offerLabel: v.offerLabel || "",
    goldValueInr: inr(v.goldValuePaise),
    stoneValueInr: inr(v.stoneValuePaise),
    makingChargesInr: inr(v.makingChargesPaise),
    makingDiscountPercent: v.makingDiscountPercent != null ? String(v.makingDiscountPercent) : "",
    goldWeightGrams: v.goldWeightGrams != null ? String(v.goldWeightGrams) : "",
    stockQuantity: v.stockQuantity,
    reservedQuantity: v.reservedQuantity ?? 0,
    isMadeToOrder: Boolean(v.isMadeToOrder),
    leadTimeDays: v.leadTimeDays ?? 14,
    isPurchaseEnabled: v.isPurchaseEnabled,
    isArchived: Boolean(v.isArchived),
  };
}

function blankVariant(skuGroup: string, n: number): VariantForm {
  return {
    sku: `${skuGroup || "SKU"}-V${n}`,
    metalType: "18K Yellow Gold",
    metalColour: "Yellow Gold",
    purity: "750 / 18K",
    size: "",
    priceInr: "",
    compareAtPriceInr: "",
    offerLabel: "",
    goldValueInr: "",
    stoneValueInr: "",
    makingChargesInr: "",
    makingDiscountPercent: "",
    goldWeightGrams: "",
    stockQuantity: 0,
    reservedQuantity: 0,
    isMadeToOrder: false,
    leadTimeDays: 14,
    isPurchaseEnabled: true,
    isArchived: false,
    isNew: true,
  };
}

function blankProduct(): Product {
  return {
    id: NEW_ID,
    slug: "",
    skuGroup: "",
    title: "",
    description: "",
    materialSummary: "",
    isEnquiryOnly: false,
    priceVisibility: "PUBLIC",
    forceWhatsApp: false,
    category: null,
    isNewArrival: true,
    isBestSeller: false,
    variants: [],
    media: [],
    collectionSlugs: [],
  };
}

/** Row-level validation. Returns a message per row index (empty when valid). */
function validateVariants(rows: VariantForm[], priceVisibility: string): Record<number, string> {
  const errors: Record<number, string> = {};
  const seenSku = new Map<string, number>();
  const seenCombo = new Map<string, number>();
  rows.forEach((v, i) => {
    if (v.isArchived) return;
    const sku = v.sku.trim().toUpperCase();
    if (!sku) errors[i] = "SKU is required.";
    else if (seenSku.has(sku)) errors[i] = `Duplicate SKU (same as row ${seenSku.get(sku)! + 1}).`;
    else seenSku.set(sku, i);

    const combo = `${v.metalColour}|${v.purity}|${v.size.trim().toLowerCase()}`;
    if (!errors[i] && seenCombo.has(combo)) errors[i] = `Same colour, purity and size as row ${seenCombo.get(combo)! + 1}.`;
    else if (!errors[i]) seenCombo.set(combo, i);

    if (!errors[i] && priceVisibility === "PUBLIC" && v.priceInr !== "" && Number(v.priceInr) <= 0) errors[i] = "Price must be above zero.";
    if (!errors[i] && v.compareAtPriceInr !== "" && v.priceInr !== "" && Number(v.compareAtPriceInr) <= Number(v.priceInr))
      errors[i] = "Compare-at price must be higher than the selling price.";
    if (!errors[i] && v.makingDiscountPercent !== "" && (Number(v.makingDiscountPercent) < 0 || Number(v.makingDiscountPercent) > 100))
      errors[i] = "Making discount must be between 0 and 100.";
    if (!errors[i] && v.stockQuantity < 0) errors[i] = "Stock cannot be negative.";
  });
  return errors;
}

/* ------------------------------------------------------------------ */

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<CollectionOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pubFilter, setPubFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState(searchParams.get("stock") || "all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [editorTab, setEditorTab] = useState<"basics" | "variants" | "media" | "merch" | "policy">("variants");

  // Editor state
  const [form, setForm] = useState<Partial<Product>>({});
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [original, setOriginal] = useState<VariantForm[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);

  const isCreate = editing?.id === NEW_ID;

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, st] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/collections"), fetch("/api/admin/media/upload")]);
      if (p.ok) {
        const data = await p.json();
        setProducts(data.products || []);
        setWarning(data.warning || null);
      }
      if (c.ok) {
        const data = await c.json();
        setCollections(data.collections || []);
      }
      if (st.ok) {
        const data = await st.json();
        setStorage(data.storage || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (tone: "success" | "error", text: string) => {
    setMsg({ tone, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const open = (p: Product) => {
    setEditing(p);
    setForm({ ...p });
    const rows = p.variants.map(toForm);
    setVariants(rows);
    setOriginal(rows);
    setMedia([...(p.media || [])].sort((a, b) => a.displayOrder - b.displayOrder));
    setSelectedCollections(p.collectionSlugs || []);
    setJobs([]);
    setSlugTouched(true);
    setEditorTab("variants");
  };

  const openCreate = () => {
    const draft = blankProduct();
    setEditing(draft);
    setForm({ ...draft });
    setVariants([blankVariant("", 1)]);
    setOriginal([]);
    setMedia([]);
    setSelectedCollections([]);
    setJobs([]);
    setSlugTouched(false);
    setEditorTab("basics");
  };

  const close = () => {
    setEditing(null);
    setForm({});
    setVariants([]);
    setOriginal([]);
    setMedia([]);
    setJobs([]);
  };

  const setV = (i: number, patch: Partial<VariantForm>) => setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const syncMetalType = (i: number, patch: Partial<VariantForm>) => {
    const v = { ...variants[i], ...patch };
    const karat = (v.purity.match(/(\d{1,2})K/) || [])[1];
    const metalType = v.metalColour === "Platinum" ? "950 Platinum" : karat ? `${karat}K ${v.metalColour || "Yellow Gold"}` : v.metalType;
    setV(i, { ...patch, metalType });
  };

  const isDirty = (i: number) => {
    const o = original[i];
    if (!o) return true;
    return JSON.stringify(o) !== JSON.stringify(variants[i]);
  };

  const errors = useMemo(() => validateVariants(variants, form.priceVisibility || "PUBLIC"), [variants, form.priceVisibility]);
  const hasErrors = Object.keys(errors).length > 0;

  const basicsErrors = useMemo(() => {
    if (!isCreate) return [] as string[];
    const e: string[] = [];
    if (!(form.title || "").trim()) e.push("Title is required.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug || "")) e.push("Slug must be lowercase letters, numbers and hyphens.");
    if (!(form.skuGroup || "").trim()) e.push("SKU group is required (e.g. CW-CHK-012).");
    if (!(form.materialSummary || "").trim()) e.push("Material summary is required.");
    if (variants.filter((v) => !v.isArchived).length === 0) e.push("Add at least one variant.");
    return e;
  }, [isCreate, form.title, form.slug, form.skuGroup, form.materialSummary, variants]);

  const uploadSlug = isCreate ? form.slug || "" : editing?.slug || "";

  const runUpload = async (job: UploadJob) => {
    if (!editing) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(uploadSlug)) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "error", error: "Enter the product title first so the photo can be filed under its slug." } : j)));
      return;
    }
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "uploading", error: undefined } : j)));
    try {
      const fd = new FormData();
      fd.append("file", job.file, job.file.name);
      fd.append("productSlug", uploadSlug);
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Upload failed (${res.status}).`);
      const url: string = data.upload.url;
      setMedia((prev) => [...prev, { url, altText: form.title || editing.title || "Product photograph", displayOrder: prev.length + 1, isPrimary: prev.length === 0, isHoverImage: false, variantId: null }]);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "done", url } : j)));
    } catch (err) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "error", error: (err as Error).message } : j)));
    }
  };

  const enqueueFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const next: UploadJob[] = Array.from(files).map((file) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, name: file.name, status: "queued" }));
    setJobs((prev) => [...prev, ...next]);
    (async () => {
      for (const job of next) await runUpload(job);
    })();
  };

  const variantPayload = (v: VariantForm) => {
    const n = (s: string) => (s === "" ? null : Number(s));
    return {
      id: v.id,
      sku: v.sku.trim().toUpperCase(),
      metalType: v.metalType,
      metalColour: v.metalColour || null,
      purity: v.purity || null,
      size: v.size || null,
      priceInr: v.priceInr ? Number(v.priceInr) : undefined,
      compareAtPriceInr: n(v.compareAtPriceInr),
      offerLabel: v.offerLabel || null,
      goldValueInr: n(v.goldValueInr),
      stoneValueInr: n(v.stoneValueInr),
      makingChargesInr: n(v.makingChargesInr),
      makingDiscountPercent: n(v.makingDiscountPercent),
      goldWeightGrams: n(v.goldWeightGrams),
      stockQuantity: v.stockQuantity,
      isMadeToOrder: v.isMadeToOrder,
      leadTimeDays: v.leadTimeDays,
      isPurchaseEnabled: v.isPurchaseEnabled,
      isArchived: v.isArchived,
    };
  };

  const productPayload = () => ({
    title: form.title,
    description: form.description || `${form.title} from the Chudiwalas atelier.`,
    craftsmanshipNotes: form.craftsmanshipNotes ?? null,
    materialSummary: form.materialSummary,
    stoneDetails: form.stoneDetails ?? null,
    certificationData: form.certificationData ?? null,
    isEnquiryOnly: Boolean(form.isEnquiryOnly),
    priceVisibility: form.priceVisibility,
    forceWhatsApp: Boolean(form.forceWhatsApp),
    category: form.category ?? null,
    isNewArrival: Boolean(form.isNewArrival),
    isBestSeller: Boolean(form.isBestSeller),
    styleId: form.styleId ?? null,
    stylingTip: form.stylingTip ?? null,
    dimensions: form.dimensions ?? null,
    diamondWeightCts: form.diamondWeightCts ?? null,
    diamondQuality: form.diamondQuality ?? null,
    polkiWeightCts: form.polkiWeightCts ?? null,
    polkiCount: form.polkiCount ?? null,
    otherStones: form.otherStones ?? null,
    grossWeightGrams: form.grossWeightGrams ?? null,
    collectionSlugs: selectedCollections,
    media: media.map((m, i) => ({ ...m, displayOrder: i + 1 })),
  });

  const save = async () => {
    if (!editing) return;
    if (hasErrors) {
      flash("error", "Fix the highlighted variant rows before saving.");
      setEditorTab("variants");
      return;
    }
    if (isCreate && basicsErrors.length) {
      flash("error", basicsErrors[0]);
      setEditorTab(basicsErrors[0].startsWith("Add at least") ? "variants" : "basics");
      return;
    }
    setSaving(true);
    try {
      if (isCreate) {
        const payload = {
          ...productPayload(),
          slug: form.slug,
          skuGroup: (form.skuGroup || "").trim().toUpperCase(),
          variants: variants.filter((v) => !v.isArchived).map((v) => ({ ...variantPayload(v), priceInr: v.priceInr ? Number(v.priceInr) : null })),
        };
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create product.");
        flash("success", `"${form.title}" is live with ${payload.variants.length} variant${payload.variants.length === 1 ? "" : "s"} and ${media.length} photo${media.length === 1 ? "" : "s"}.`);
      } else {
        const updates = variants.filter((v, i) => !v.isNew && v.id && isDirty(i)).map(variantPayload);
        const created = variants.filter((v) => v.isNew && !v.isArchived).map((v) => ({ ...variantPayload(v), priceInr: v.priceInr ? Number(v.priceInr) : null }));
        const payload = { ...productPayload(), isArchived: Boolean(form.isArchived), variantUpdates: updates, newVariants: created };
        const res = await fetch(`/api/admin/products/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save product.");
        flash("success", `Saved. ${updates.length} variant${updates.length === 1 ? "" : "s"} updated, ${created.length} added. The storefront was revalidated.`);
      }
      close();
      await load();
    } catch (err) {
      flash("error", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!showArchived && p.isArchived) return false;
      if (q && !(p.title.toLowerCase().includes(q) || p.skuGroup.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q)))) return false;
      if (categoryFilter !== "all" && (p.category || "") !== categoryFilter) return false;
      if (pubFilter === "public" && (p.priceVisibility !== "PUBLIC" || p.isEnquiryOnly)) return false;
      if (pubFilter === "enquiry" && !(p.priceVisibility === "ON_REQUEST" || p.isEnquiryOnly)) return false;
      const live = p.variants.filter((v) => !v.isArchived);
      const stock = live.reduce((s, v) => s + v.stockQuantity, 0);
      if (stockFilter === "low" && !live.some((v) => v.stockQuantity <= 1 && !v.isMadeToOrder && !p.isEnquiryOnly)) return false;
      if (stockFilter === "out" && stock > 0) return false;
      if (stockFilter === "in" && stock === 0) return false;
      return true;
    });
  }, [products, query, categoryFilter, pubFilter, stockFilter, showArchived]);

  const stock = (p: Product) => p.variants.filter((v) => !v.isArchived).reduce((n, v) => n + v.stockQuantity, 0);
  const priceRange = (p: Product) => {
    if (p.priceVisibility === "ON_REQUEST") return "On request";
    const prices = p.variants.filter((v) => !v.isArchived).map((v) => (v.pricePaise ? BigInt(v.pricePaise) : null)).filter((x): x is bigint => x !== null);
    if (!prices.length) return "—";
    const min = prices.reduce((a, b) => (a < b ? a : b));
    const max = prices.reduce((a, b) => (a > b ? a : b));
    return min === max ? formatPaiseToInr(min) : `${formatPaiseToInr(min)} – ${formatPaiseToInr(max)}`;
  };

  const moveMedia = (i: number, dir: -1 | 1) =>
    setMedia((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const uploadsBusy = jobs.some((j) => j.status === "uploading" || j.status === "queued");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue"
        description="Pricing by metal colour and purity, offers, stock, photography, collections, product sheet and purchase policy. Every change is audited."
        actions={
          <>
            <Link href="/admin/products/import" className="adm-btn-ghost"><Upload className="w-3.5 h-3.5" /> CSV import</Link>
            <Link href="/shop" target="_blank" className="adm-btn-ghost"><ExternalLink className="w-3.5 h-3.5" /> View shop</Link>
            <button type="button" onClick={openCreate} disabled={Boolean(warning)} className="adm-btn"><Plus className="w-3.5 h-3.5" /> New product</button>
          </>
        }
      />

      {warning && <Alert tone="warning">{warning} Edits are disabled until the database is reachable.</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Card>
        <div className="px-5 py-3 border-b border-ivory-300 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-charcoal-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, SKU or category" className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-charcoal-400 min-h-[36px]" aria-label="Search catalogue" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="adm-input !w-auto text-xs py-1.5 capitalize" aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={pubFilter} onChange={(e) => setPubFilter(e.target.value)} className="adm-input !w-auto text-xs py-1.5" aria-label="Publication">
            <option value="all">Public and enquiry</option>
            <option value="public">Purchasable online</option>
            <option value="enquiry">Enquiry / on request</option>
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="adm-input !w-auto text-xs py-1.5" aria-label="Stock">
            <option value="all">Any stock</option>
            <option value="low">Low stock (≤1)</option>
            <option value="out">Out of stock</option>
            <option value="in">In stock</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-charcoal-700"><input type="checkbox" className="accent-[#556B2F]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived</label>
          <span className="text-xs text-charcoal-500 tabular-nums">{filtered.length} pieces</span>
        </div>

        {loading ? (
          <Loading label="Loading catalogue…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No pieces match" body="Try a different search or filter, or add a new product." />
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const live = p.variants.filter((v) => !v.isArchived);
              const colours = [...new Set(live.map((v) => v.metalColour).filter(Boolean))];
              const cover = (p.media || []).find((m) => m.isPrimary) || (p.media || [])[0];
              const lowStock = live.some((v) => v.stockQuantity <= 1 && !v.isMadeToOrder && !p.isEnquiryOnly);
              return (
                <div key={p.id} className={`adm-card overflow-hidden flex flex-col ${p.isArchived ? "opacity-60" : ""}`}>
                  <div className="relative aspect-[4/3] bg-ivory-tile">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-charcoal-400">No photo</div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {p.isArchived && <StatusBadge status="CLOSED_LOST" label="Archived" />}
                      {p.isBestSeller && <StatusBadge status="SCHEDULED" label="Best seller" />}
                      {p.isNewArrival && <StatusBadge status="CONFIRMED" label="New" />}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-medium text-charcoal-950 leading-snug line-clamp-2">{p.title}</h3>
                    <p className="mt-0.5 text-[11px] text-charcoal-500">{p.skuGroup} · {p.category || "uncategorised"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-charcoal-950 tabular-nums">{priceRange(p)}</span>
                      <span className={`text-xs tabular-nums ${lowStock ? "text-orange-600 font-medium" : "text-charcoal-600"}`}>{stock(p)} in stock</span>
                    </div>
                    <p className="mt-1 text-[11px] text-charcoal-500">{live.length} variant{live.length === 1 ? "" : "s"}{colours.length ? ` · ${colours.join(", ")}` : ""}</p>
                    {(p.priceVisibility === "ON_REQUEST" || p.isEnquiryOnly) && <p className="mt-1 text-[11px] text-olive-700">Enquiry only</p>}
                    <div className="mt-3 pt-3 border-t border-ivory-300 flex items-center gap-2">
                      <button type="button" onClick={() => open(p)} disabled={Boolean(warning)} className="adm-btn flex-1 min-h-[40px]">Edit</button>
                      <Link href={`/products/${p.slug}`} target="_blank" className="adm-btn-ghost min-h-[40px]" aria-label={`Preview ${p.title} on the storefront`}><Eye className="w-4 h-4" /></Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Editor / create drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-charcoal-950/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isCreate ? "New product" : `Edit ${editing.title}`}>
          <div className="w-full max-w-4xl h-full bg-ivory-100 shadow-dropdown flex flex-col">
            <header className="px-6 py-4 border-b border-ivory-400 bg-ivory-50 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-charcoal-950 leading-tight">{isCreate ? form.title?.trim() || "New product" : editing.title}</h2>
                <p className="text-xs text-charcoal-500">
                  {isCreate ? (form.slug ? `/products/${form.slug}` : "Fill in the basics, then variants and photos. Nothing is published until you save.") : (
                    <>{editing.skuGroup} · <Link href={`/products/${editing.slug}`} target="_blank" className="underline underline-offset-4 hover:text-olive-700">/products/{editing.slug}</Link></>
                  )}
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Close editor" className="w-11 h-11 flex items-center justify-center text-charcoal-600 hover:text-charcoal-950" autoFocus><X className="w-5 h-5" /></button>
            </header>

            <div className="px-6 border-b border-ivory-400 bg-ivory-50 flex gap-6 overflow-x-auto" role="tablist">
              {(
                [
                  ["basics", `1. Basics${isCreate && basicsErrors.length ? " ⚠" : ""}`],
                  ["variants", `2. Variants & pricing${hasErrors ? " ⚠" : ""}`],
                  ["media", `3. Photography (${media.length})`],
                  ["merch", "4. Collections & flags"],
                  ["policy", "5. Policy"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={editorTab === k} onClick={() => setEditorTab(k)} className={`py-3 min-h-[44px] text-xs uppercase tracking-[0.12em] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${editorTab === k ? "border-olive-600 text-olive-800" : "border-transparent text-charcoal-500 hover:text-charcoal-900"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ----- Basics / product sheet ----- */}
              {editorTab === "basics" && (
                <div className="space-y-5">
                  {isCreate && basicsErrors.length > 0 && (
                    <Alert tone="warning">
                      <ul className="list-disc pl-4 space-y-0.5">{basicsErrors.map((e) => <li key={e}>{e}</li>)}</ul>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="adm-label">Title *</label>
                      <input
                        className="adm-input"
                        value={form.title || ""}
                        placeholder="Heritage Polki & Zambian Emerald Choker"
                        onChange={(e) => {
                          const title = e.target.value;
                          setForm((f) => ({ ...f, title, slug: isCreate && !slugTouched ? slugify(title) : f.slug }));
                        }}
                      />
                    </div>
                    {isCreate && (
                      <>
                        <div>
                          <label className="adm-label">URL slug *</label>
                          <input className="adm-input lowercase" value={form.slug || ""} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) || e.target.value.toLowerCase() }); }} placeholder="heritage-polki-emerald-choker" />
                          <p className="text-[11px] text-charcoal-500 mt-1">Public address: /products/{form.slug || "…"}</p>
                        </div>
                        <div>
                          <label className="adm-label">SKU group *</label>
                          <input className="adm-input uppercase" value={form.skuGroup || ""} onChange={(e) => setForm({ ...form, skuGroup: e.target.value.toUpperCase() })} placeholder="CW-CHK-012" />
                          <p className="text-[11px] text-charcoal-500 mt-1">Variant SKUs start with this, e.g. CW-CHK-012-YG18.</p>
                        </div>
                      </>
                    )}
                    <div><label className="adm-label">Category</label><select className="adm-input capitalize" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value || null })}><option value="">—</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="adm-label">Style ID</label><input className="adm-input" value={form.styleId || ""} onChange={(e) => setForm({ ...form, styleId: e.target.value })} /></div>
                    <div className="md:col-span-2"><label className="adm-label">Description</label><textarea rows={3} className="adm-input" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="md:col-span-2"><label className="adm-label">Styling tip</label><input className="adm-input" value={form.stylingTip || ""} onChange={(e) => setForm({ ...form, stylingTip: e.target.value })} /></div>
                    <div className="md:col-span-2"><label className="adm-label">Craftsmanship notes</label><textarea rows={2} className="adm-input" value={form.craftsmanshipNotes || ""} onChange={(e) => setForm({ ...form, craftsmanshipNotes: e.target.value })} /></div>
                    <div><label className="adm-label">Material summary *</label><input className="adm-input" value={form.materialSummary || ""} onChange={(e) => setForm({ ...form, materialSummary: e.target.value })} placeholder="22K Hallmarked Yellow Gold (916)" /></div>
                    <div><label className="adm-label">Stone details</label><input className="adm-input" value={form.stoneDetails || ""} onChange={(e) => setForm({ ...form, stoneDetails: e.target.value })} /></div>
                    <div><label className="adm-label">Certification (only if recorded)</label><input className="adm-input" value={form.certificationData || ""} onChange={(e) => setForm({ ...form, certificationData: e.target.value })} /></div>
                    <div><label className="adm-label">Dimensions</label><input className="adm-input" value={form.dimensions || ""} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="27.3 (l) x 103.4 (w) mm" /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className="adm-label">Diamond wt (ct)</label><input type="number" step="0.01" min={0} className="adm-input text-right tabular-nums" value={form.diamondWeightCts ?? ""} onChange={(e) => setForm({ ...form, diamondWeightCts: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                    <div><label className="adm-label">Diamond quality</label><input className="adm-input" value={form.diamondQuality || ""} onChange={(e) => setForm({ ...form, diamondQuality: e.target.value })} placeholder="SI / GH" /></div>
                    <div><label className="adm-label">Polki wt (ct)</label><input type="number" step="0.01" min={0} className="adm-input text-right tabular-nums" value={form.polkiWeightCts ?? ""} onChange={(e) => setForm({ ...form, polkiWeightCts: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                    <div><label className="adm-label">Polki count</label><input type="number" min={0} className="adm-input text-right tabular-nums" value={form.polkiCount ?? ""} onChange={(e) => setForm({ ...form, polkiCount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                    <div className="col-span-2 md:col-span-3"><label className="adm-label">Other stones</label><input className="adm-input" value={form.otherStones || ""} onChange={(e) => setForm({ ...form, otherStones: e.target.value })} placeholder="Ruby 0.01 ct, Tourmaline 0.25 ct" /></div>
                    <div><label className="adm-label">Gross wt (g)</label><input type="number" step="0.01" min={0} className="adm-input text-right tabular-nums" value={form.grossWeightGrams ?? ""} onChange={(e) => setForm({ ...form, grossWeightGrams: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                  </div>
                  {isCreate && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setEditorTab("variants")} className="adm-btn-ghost">Next: variants & pricing</button>
                    </div>
                  )}
                </div>
              )}

              {/* ----- Variants ----- */}
              {editorTab === "variants" && (
                <div className="space-y-4">
                  <p className="text-xs text-charcoal-600">
                    One row per metal colour × purity × size. Enter INR; the server stores paise. Compare-at is the regular price shown struck through. Breakup is indicative only and never sets the payable amount.
                    {!isCreate && " Rows marked Edited are sent on save; the rest stay untouched. Archived rows disappear from the storefront but keep their order history."}
                  </p>
                  {variants.map((v, i) => {
                    const err = errors[i];
                    const dirty = isDirty(i);
                    if (v.isArchived) {
                      return (
                        <div key={v.id || `new-${i}`} className="adm-card p-3 flex items-center justify-between gap-3 opacity-70">
                          <div className="flex items-center gap-2"><span className="text-xs font-medium text-charcoal-950">{v.sku}</span><StatusBadge status="CLOSED_LOST" label="Archived" /><span className="text-[11px] text-charcoal-500">{v.metalColour} {v.purity} {v.size}</span></div>
                          <button type="button" onClick={() => setV(i, { isArchived: false })} className="adm-btn-ghost min-h-[32px]"><RefreshCcw className="w-3.5 h-3.5" /> Restore</button>
                        </div>
                      );
                    }
                    return (
                      <div key={v.id || `new-${i}`} className={`adm-card p-4 space-y-3 ${err ? "border-red-300" : dirty && !isCreate ? "border-orange-300" : ""}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-charcoal-950">{v.isNew ? (isCreate ? `Variant ${i + 1}` : "New variant") : v.sku}</span>
                            {v.isNew && !isCreate && <StatusBadge status="NEW" label="Unsaved" />}
                            {!v.isNew && dirty && <StatusBadge status="RECONCILIATION_REQUIRED" label="Edited" />}
                            {!v.isNew && !dirty && <StatusBadge status="CONFIRMED" label="Saved" />}
                            {v.reservedQuantity > 0 && <span className="text-[11px] text-charcoal-500">{v.reservedQuantity} reserved in checkouts</span>}
                          </div>
                          {v.isNew ? (
                            variants.filter((x) => !x.isArchived).length > 1 && (
                              <button type="button" onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-700 hover:underline min-h-[32px]">Remove</button>
                            )
                          ) : (
                            <button type="button" onClick={() => setV(i, { isArchived: true })} className="adm-btn-ghost min-h-[32px] text-red-700" title="Hide from the storefront; past orders keep their snapshot"><Archive className="w-3.5 h-3.5" /> Archive</button>
                          )}
                        </div>
                        {err && <p className="text-xs text-red-700" role="alert">{err}</p>}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div><label className="adm-label">SKU</label><input className="adm-input text-xs uppercase" value={v.sku} disabled={!v.isNew} onChange={(e) => setV(i, { sku: e.target.value.toUpperCase() })} /></div>
                          <div><label className="adm-label">Metal colour</label><select className="adm-input text-xs" value={v.metalColour} onChange={(e) => syncMetalType(i, { metalColour: e.target.value })}><option value="">—</option>{COLOURS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                          <div><label className="adm-label">Purity</label><select className="adm-input text-xs" value={v.purity} onChange={(e) => syncMetalType(i, { purity: e.target.value })}><option value="">—</option>{PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
                          <div><label className="adm-label">Size</label><input className="adm-input text-xs" value={v.size} onChange={(e) => setV(i, { size: e.target.value })} placeholder="Ring size 12 / 7 in" /></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div><label className="adm-label">Price (₹)</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" disabled={form.priceVisibility === "ON_REQUEST"} value={form.priceVisibility === "ON_REQUEST" ? "" : v.priceInr} placeholder={form.priceVisibility === "ON_REQUEST" ? "On request" : "0"} onChange={(e) => setV(i, { priceInr: e.target.value })} /></div>
                          <div><label className="adm-label">Compare-at (₹)</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" value={v.compareAtPriceInr} onChange={(e) => setV(i, { compareAtPriceInr: e.target.value })} placeholder="Regular price" /></div>
                          <div className="col-span-2"><label className="adm-label">Offer label</label><input className="adm-input text-xs" value={v.offerLabel} onChange={(e) => setV(i, { offerLabel: e.target.value })} placeholder="50% off on making charges" /></div>
                        </div>

                        <details className="group/adv">
                          <summary className="cursor-pointer list-none text-xs font-medium text-olive-700 hover:text-orange-500 py-1 select-none">
                            <span className="group-open/adv:hidden">+ Advanced: price breakup &amp; weight (optional)</span>
                            <span className="hidden group-open/adv:inline">− Hide price breakup &amp; weight</span>
                          </summary>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                            <div><label className="adm-label">Gold value (₹)</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" value={v.goldValueInr} onChange={(e) => setV(i, { goldValueInr: e.target.value })} /></div>
                            <div><label className="adm-label">Stone value (₹)</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" value={v.stoneValueInr} onChange={(e) => setV(i, { stoneValueInr: e.target.value })} /></div>
                            <div><label className="adm-label">Making (₹)</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" value={v.makingChargesInr} onChange={(e) => setV(i, { makingChargesInr: e.target.value })} /></div>
                            <div><label className="adm-label">Making off %</label><input type="number" min={0} max={100} className="adm-input text-xs text-right tabular-nums" value={v.makingDiscountPercent} onChange={(e) => setV(i, { makingDiscountPercent: e.target.value })} /></div>
                            <div><label className="adm-label">Gold wt (g)</label><input type="number" min={0} step="0.01" className="adm-input text-xs text-right tabular-nums" value={v.goldWeightGrams} onChange={(e) => setV(i, { goldWeightGrams: e.target.value })} /></div>
                          </div>
                        </details>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                          <div><label className="adm-label">Stock</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" value={v.stockQuantity} onChange={(e) => setV(i, { stockQuantity: parseInt(e.target.value, 10) || 0 })} /></div>
                          <div><label className="adm-label">Lead time (days)</label><input type="number" min={0} className="adm-input text-xs text-right tabular-nums" value={v.leadTimeDays} onChange={(e) => setV(i, { leadTimeDays: parseInt(e.target.value, 10) || 0 })} /></div>
                          <label className="flex items-center gap-2 text-xs text-charcoal-800 pb-2 min-h-[36px]"><input type="checkbox" className="accent-[#556B2F]" checked={v.isMadeToOrder} onChange={(e) => setV(i, { isMadeToOrder: e.target.checked })} />Made to order</label>
                          <label className="flex items-center gap-2 text-xs text-charcoal-800 pb-2 min-h-[36px]"><input type="checkbox" className="accent-[#556B2F]" checked={v.isPurchaseEnabled} onChange={(e) => setV(i, { isPurchaseEnabled: e.target.checked })} />Purchasable online</label>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setVariants((prev) => [...prev, blankVariant(isCreate ? (form.skuGroup || "") : editing.skuGroup, prev.length + 1)])} className="adm-btn-ghost min-h-[44px]">
                      <Plus className="w-3.5 h-3.5" /> Add a colour / purity / size
                    </button>
                    {isCreate && <button type="button" onClick={() => setEditorTab("media")} className="adm-btn-ghost min-h-[44px]">Next: photography</button>}
                  </div>
                </div>
              )}

              {/* ----- Photography ----- */}
              {editorTab === "media" && (
                <div className="space-y-4">
                  <Alert tone={storage?.durable ? "info" : "warning"}>
                    {storage?.note || "Checking storage…"} The first photo is the cover used on cards. Assign a photo to a variant to show it when that colour is selected{isCreate ? " (available after the first save)" : ""}.
                  </Alert>

                  <label
                    className="block border-2 border-dashed border-olive-300 bg-ivory-50 rounded-md p-5 text-center cursor-pointer hover:border-olive-600 focus-within:border-olive-600"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      enqueueFiles(e.dataTransfer.files);
                    }}
                  >
                    <ImagePlus className="w-6 h-6 mx-auto text-olive-700" />
                    <span className="block mt-2 text-sm font-medium text-charcoal-950">Upload photographs</span>
                    <span className="block text-xs text-charcoal-600">JPEG, PNG, WebP or AVIF up to 8 MB each. Drag files here or click to choose.</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      className="sr-only"
                      aria-label="Upload product photographs"
                      onChange={(e) => {
                        enqueueFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {jobs.length > 0 && (
                    <ul className="space-y-1.5" aria-live="polite">
                      {jobs.map((j) => (
                        <li key={j.id} className="flex items-center justify-between gap-3 text-xs border border-ivory-400 bg-ivory-50 rounded-md px-3 py-2">
                          <span className="truncate text-charcoal-900">{j.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            {j.status === "queued" && <span className="text-charcoal-500">Queued</span>}
                            {j.status === "uploading" && <span className="text-olive-700">Uploading…</span>}
                            {j.status === "done" && <StatusBadge status="CONFIRMED" label="Added" />}
                            {j.status === "error" && (
                              <>
                                <span className="text-red-700">{j.error}</span>
                                <button type="button" onClick={() => runUpload(j)} className="adm-btn-ghost !px-2 min-h-[32px]" aria-label={`Retry ${j.name}`}>
                                  <RefreshCcw className="w-3.5 h-3.5" /> Retry
                                </button>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const url = newMediaUrl.trim();
                      if (!/^https?:\/\//.test(url)) return flash("error", "Enter a full https:// image URL.");
                      setMedia((prev) => [...prev, { url, altText: form.title || editing.title || "Product photograph", displayOrder: prev.length + 1, isPrimary: prev.length === 0, isHoverImage: false, variantId: null }]);
                      setNewMediaUrl("");
                    }}
                    className="flex gap-2"
                  >
                    <input className="adm-input" value={newMediaUrl} onChange={(e) => setNewMediaUrl(e.target.value)} placeholder="…or paste an https:// image URL" aria-label="Image URL" />
                    <button type="submit" className="adm-btn-ghost whitespace-nowrap"><Plus className="w-3.5 h-3.5" /> Add URL</button>
                  </form>

                  {media.length === 0 ? (
                    <EmptyState title="No photos yet" body="Cards and the product page show a placeholder until a photo is added." />
                  ) : (
                    <ul className="space-y-3">
                      {media.map((m, i) => (
                        <li key={m.id || m.url + i} className="adm-card p-3 flex gap-4 items-start">
                          <div className="w-20 h-24 bg-ivory-200 border border-ivory-400 overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <label className="adm-label">Alt text</label>
                              <input className="adm-input text-xs" value={m.altText} onChange={(e) => setMedia((prev) => prev.map((x, idx) => (idx === i ? { ...x, altText: e.target.value } : x)))} />
                            </div>
                            <div>
                              <label className="adm-label">Shown for variant</label>
                              <select className="adm-input text-xs" value={m.variantId || ""} disabled={isCreate} onChange={(e) => setMedia((prev) => prev.map((x, idx) => (idx === i ? { ...x, variantId: e.target.value || null } : x)))}>
                                <option value="">All variants</option>
                                {variants.filter((v) => v.id && !v.isArchived).map((v) => <option key={v.id} value={v.id}>{v.sku} · {v.metalColour} {v.purity}</option>)}
                              </select>
                            </div>
                            <div className="flex items-end gap-3 text-xs text-charcoal-800">
                              <label className="flex items-center gap-2 min-h-[36px]"><input type="radio" name="cover" className="accent-[#556B2F]" checked={m.isPrimary} onChange={() => setMedia((prev) => prev.map((x, idx) => ({ ...x, isPrimary: idx === i })))} />Cover</label>
                              <label className="flex items-center gap-2 min-h-[36px]"><input type="checkbox" className="accent-[#556B2F]" checked={m.isHoverImage} onChange={(e) => setMedia((prev) => prev.map((x, idx) => (idx === i ? { ...x, isHoverImage: e.target.checked } : x)))} />Hover photo</label>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button type="button" onClick={() => moveMedia(i, -1)} aria-label="Move up" className="adm-btn-ghost !px-2"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => moveMedia(i, 1)} aria-label="Move down" className="adm-btn-ghost !px-2"><ArrowDown className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove photo" className="adm-btn-ghost !px-2 text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {isCreate && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setEditorTab("merch")} className="adm-btn-ghost">Next: collections & flags</button>
                    </div>
                  )}
                </div>
              )}

              {/* ----- Collections & flags ----- */}
              {editorTab === "merch" && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <p className="adm-label">Collections</p>
                    <div className="space-y-2">
                      {collections.map((c) => (
                        <label key={c.slug} className="flex items-center gap-3 text-sm text-charcoal-800 min-h-[36px]">
                          <input type="checkbox" className="accent-[#556B2F]" checked={selectedCollections.includes(c.slug)} onChange={(e) => setSelectedCollections((prev) => (e.target.checked ? [...prev, c.slug] : prev.filter((s) => s !== c.slug)))} />
                          {c.title} <span className="text-xs text-charcoal-500">/collections/{c.slug}</span>
                        </label>
                      ))}
                      {collections.length === 0 && <p className="text-xs text-charcoal-500">No collections available.</p>}
                    </div>
                  </div>
                  <div className="border-t border-ivory-400 pt-4 space-y-3">
                    <label className="flex items-center gap-3 text-sm text-charcoal-800 min-h-[36px]"><input type="checkbox" className="accent-[#556B2F]" checked={Boolean(form.isNewArrival)} onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })} />New arrival (orange badge, sorts first under “Newest”)</label>
                    <label className="flex items-center gap-3 text-sm text-charcoal-800 min-h-[36px]"><input type="checkbox" className="accent-[#556B2F]" checked={Boolean(form.isBestSeller)} onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })} />Best seller (featured first on the homepage)</label>
                  </div>
                  {isCreate && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setEditorTab("policy")} className="adm-btn-ghost">Next: policy</button>
                    </div>
                  )}
                </div>
              )}

              {/* ----- Policy ----- */}
              {editorTab === "policy" && (
                <div className="space-y-5 max-w-xl">
                  <div>
                    <label className="adm-label">Price visibility</label>
                    <select className="adm-input" value={form.priceVisibility} onChange={(e) => setForm({ ...form, priceVisibility: e.target.value as "PUBLIC" | "ON_REQUEST" })}>
                      <option value="PUBLIC">PUBLIC — price shown, checkout allowed</option>
                      <option value="ON_REQUEST">ON_REQUEST — price hidden, WhatsApp only</option>
                    </select>
                    <p className="text-[11px] text-charcoal-500 mt-1">ON_REQUEST also hides the compare-at price, offers and the breakup everywhere. Enforced on the server.</p>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-charcoal-800"><input type="checkbox" className="accent-[#556B2F] mt-1" checked={Boolean(form.isEnquiryOnly)} onChange={(e) => setForm({ ...form, isEnquiryOnly: e.target.checked })} /><span><span className="font-medium">Enquiry only</span><span className="block text-xs text-charcoal-500">Shows the price but disables Add to bag. Bespoke and bridal pieces.</span></span></label>
                  <label className="flex items-start gap-3 text-sm text-charcoal-800"><input type="checkbox" className="accent-[#556B2F] mt-1" checked={Boolean(form.forceWhatsApp)} onChange={(e) => setForm({ ...form, forceWhatsApp: e.target.checked })} /><span><span className="font-medium">Always show WhatsApp consult</span><span className="block text-xs text-charcoal-500">Even below the high-value threshold.</span></span></label>
                  {!isCreate && (
                    <div className="border-t border-ivory-400 pt-4">
                      <label className="flex items-start gap-3 text-sm text-charcoal-800"><input type="checkbox" className="accent-[#556B2F] mt-1" checked={Boolean(form.isArchived)} onChange={(e) => setForm({ ...form, isArchived: e.target.checked })} /><span><span className="font-medium">Archive this product</span><span className="block text-xs text-charcoal-500">Removes it from the storefront and listings. Orders, leads and audit history are kept. Untick to restore.</span></span></label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-ivory-400 bg-ivory-50 flex items-center justify-between gap-3">
              <p className="text-[11px] text-charcoal-500">
                {hasErrors
                  ? `${Object.keys(errors).length} variant row${Object.keys(errors).length === 1 ? "" : "s"} need attention.`
                  : isCreate && basicsErrors.length
                    ? basicsErrors[0]
                    : uploadsBusy
                      ? "Uploads in progress. Save after they finish."
                      : isCreate
                        ? "Saving publishes the product to the storefront immediately."
                        : "Uploaded photos are attached when you save. Changes revalidate the storefront immediately."}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={close} className="adm-btn-ghost min-h-[40px]">Cancel</button>
                <button type="button" onClick={save} disabled={saving || hasErrors || uploadsBusy || (isCreate && basicsErrors.length > 0)} className="adm-btn min-h-[40px]">
                  {saving ? "Saving…" : isCreate ? "Create product" : "Save changes"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<Loading label="Loading catalogue…" />}>
      <ProductsPageInner />
    </Suspense>
  );
}

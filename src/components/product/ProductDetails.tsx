"use client";

import React, { useMemo, useState } from "react";
import { PublicProductDto, PublicVariantDto, PublicOfferDto } from "@/lib/types";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { buildProductWhatsAppLink, buildConsultationWhatsAppLink, handleWhatsAppClick } from "@/lib/whatsapp";
import { pickVariant, optionExists, optionCompatible, variantHref, type OptionKey } from "@/lib/variants";
import { MetalSwatch } from "@/components/common/MetalSwatch";
import { WhatsAppIcon } from "@/components/common/WhatsAppButton";
import {
  ShieldCheck,
  Truck,
  MessageCircle,
  ShoppingBag,
  Video,
  Share2,
  Heart,
  Check,
  Sparkles,
  RefreshCcw,
  Factory,
  Headphones,
  Tag,
  Clock,
} from "lucide-react";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";
const PLACEHOLDER_NUMBER = "919876543210";

const TRUST = [
  { icon: ShieldCheck, label: "BIS hallmarked with HUID" },
  { icon: Sparkles, label: "IGI / SGL certified stones" },
  { icon: Factory, label: "Crafted in our Jaipur workshop" },
  { icon: Truck, label: "Insured shipping across India" },
  { icon: RefreshCcw, label: "Lifetime exchange" },
  { icon: Headphones, label: "Concierge on WhatsApp" },
];

export interface ProductDetailsProps {
  product: PublicProductDto;
  offers?: PublicOfferDto[];
  /** Controlled selection (from ProductStage). Falls back to internal state when omitted. */
  variant?: PublicVariantDto;
  onVariantChange?: (v: PublicVariantDto) => void;
}

type Tab = "description" | "details" | "breakup";

const OPTION_LABEL: Record<OptionKey, string> = { metalColour: "colour", purityLabel: "purity", size: "size" };

export function ProductDetails({ product, offers = [], variant, onVariantChange }: ProductDetailsProps) {
  const { addItem, openCart } = useCart();
  const { isInWishlist, toggle } = useWishlist();

  const [internal, setInternal] = useState<PublicVariantDto>(product.defaultVariant);
  const activeVariant = variant || internal;
  const setVariant = (v: PublicVariantDto) => {
    setInternal(v);
    onVariantChange?.(v);
  };

  const [tab, setTab] = useState<Tab>("description");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const policy = activeVariant.policy;
  const wishlisted = isInWishlist(product.id);

  const { colours, purities, sizes } = product.options;
  const hasColours = colours.length > 1;
  const hasPurities = purities.length > 1;
  const hasSizes = sizes.length > 1;

  const choose = (key: OptionKey, value: string) => {
    const { variant: next, changed } = pickVariant(product, activeVariant, key, value);
    setVariant(next);
    if (changed.length) {
      const parts = changed.map((k) => `${OPTION_LABEL[k]} ${k === "size" ? next.size || "standard" : next[k]}`);
      setNotice(`${value} is made in ${parts.join(" and ")}. Switched to ${next.purityLabel} ${next.metalColour}${next.size ? `, ${next.size}` : ""}.`);
    } else {
      setNotice(null);
    }
  };

  const reasonFor = (key: OptionKey, value: string): string | undefined => {
    if (!optionExists(product, key, value)) return `${value} is not made for this design`;
    if (!optionCompatible(product, activeVariant, key, value)) {
      const others = key === "metalColour" ? "purity and size" : key === "purityLabel" ? "colour and size" : "colour and purity";
      return `${value} is not available with the current ${others}; selecting it will adjust them`;
    }
    return undefined;
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${variantHref(product, activeVariant)}` : undefined;

  const whatsappUrl = useMemo(
    () =>
      buildProductWhatsAppLink({
        whatsappNumber: WHATSAPP_NUMBER,
        productTitle: product.title,
        variantSku: activeVariant.sku,
        metalType: activeVariant.metalType,
        metalColour: activeVariant.metalColour,
        purity: activeVariant.purityLabel,
        size: activeVariant.size,
        formattedPrice: policy.priceVisibility === "PUBLIC" ? activeVariant.formattedPrice : null,
        productUrl: shareUrl,
      }),
    [product.title, activeVariant, policy.priceVisibility, shareUrl]
  );

  const videoCallUrl = buildConsultationWhatsAppLink({
    whatsappNumber: WHATSAPP_NUMBER,
    message: `I would like a video call to see "${product.title}" (SKU ${activeVariant.sku}) before deciding.`,
  });

  const customiseUrl = buildConsultationWhatsAppLink({
    whatsappNumber: WHATSAPP_NUMBER,
    type: "BESPOKE",
    message: `I love "${product.title}" (SKU ${activeVariant.sku}). Can it be made in a different gold purity, colour or size? Please share options and pricing.`,
  });

  const addToBag = () => {
    if (!activeVariant.pricePaise) return;
    addItem({
      variantId: activeVariant.id,
      sku: activeVariant.sku,
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      metalType: activeVariant.metalType,
      size: activeVariant.size,
      purity: activeVariant.purity,
      imageUrl: product.media.find((m) => m.variantId === activeVariant.id)?.url || product.media[0]?.url,
      unitPricePaise: activeVariant.pricePaise,
    });
  };

  const handleAddToBag = () => {
    addToBag();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
    openCart();
  };

  const handleBuyNow = () => {
    addToBag();
    window.location.assign("/checkout");
  };

  const share = async () => {
    const url = shareUrl || "";
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // cancelled or blocked
    }
  };

  const availability = policy.isOutOfStock
    ? { label: "Sold out", cls: "bg-charcoal-100 text-charcoal-700 border-charcoal-200" }
    : policy.requiresEnquiry
      ? { label: "Enquire to order", cls: "bg-olive-100 text-olive-800 border-olive-200" }
      : activeVariant.isReadyToShip
        ? { label: "Ready to ship", cls: "bg-olive-100 text-olive-800 border-olive-200" }
        : { label: "Made to order", cls: "bg-ivory-200 text-charcoal-700 border-ivory-400" };

  const dispatch = policy.isOutOfStock
    ? null
    : activeVariant.isReadyToShip
      ? "Dispatches from Jaipur within 2 working days."
      : activeVariant.isMadeToOrder && activeVariant.leadTimeDays
        ? `Made to order. Ready in about ${activeVariant.leadTimeDays} days.`
        : null;

  const breakup = activeVariant.priceBreakup;
  const toNum = (v?: string | null) => (v ? Number(v) : 0);
  const breakupSegments = breakup
    ? [
        { key: "gold", label: "Gold", paise: toNum(breakup.goldValuePaise), cls: "bg-[#CBA14A]", dot: "bg-[#CBA14A]" },
        { key: "stone", label: "Stones", paise: toNum(breakup.stoneValuePaise), cls: "bg-charcoal-800", dot: "bg-charcoal-800" },
        {
          key: "making",
          label: "Making",
          paise: toNum(breakup.makingChargesAfterDiscountPaise ?? breakup.makingChargesPaise),
          cls: "bg-olive-600",
          dot: "bg-olive-600",
        },
      ].filter((s) => s.paise > 0)
    : [];
  const breakupTotal = breakupSegments.reduce((sum, s) => sum + s.paise, 0);

  const detailRows: [string, string | null | undefined][] = [
    ["Style ID", product.styleId],
    ["Metal", `${activeVariant.purityLabel} ${activeVariant.metalColour}`],
    ["Hallmark", activeVariant.purity],
    ["Size", activeVariant.size],
    ["Dimensions", product.dimensions],
    ["Diamond weight", product.diamondWeightCts != null ? `${product.diamondWeightCts} ct` : null],
    ["Diamond quality", product.diamondQuality],
    ["Polki weight", product.polkiWeightCts != null ? `${product.polkiWeightCts} ct` : null],
    ["Polki count", product.polkiCount != null ? `${product.polkiCount} nos.` : null],
    ["Other stones", product.otherStones],
    ["Gold weight", activeVariant.goldWeightGrams != null ? `${activeVariant.goldWeightGrams} g` : null],
    ["Gross weight", product.grossWeightGrams != null ? `${product.grossWeightGrams} g` : null],
    ["Certification", product.certificationData],
    ["SKU", activeVariant.sku],
  ];

  const waTap = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    handleWhatsAppClick(url, { sku: activeVariant.sku, sourceUrl: shareUrl });
  };

  return (
    <div className="flex flex-col space-y-7">
      {/* Title, badges, price */}
      <div className="border-b border-ivory-400 pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {product.category && (
            <span className="text-[11px] text-olive-700 font-medium">{product.category}</span>
          )}
          <span className={`adm-chip ${availability.cls}`}>{availability.label}</span>
          {product.isNewArrival && <span className="adm-chip bg-orange-500 text-ivory-50 border-orange-500">New</span>}
          {product.isBestSeller && <span className="adm-chip bg-ivory-200 text-charcoal-700 border-ivory-400">Best seller</span>}
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-charcoal-950 tracking-tight leading-tight">{product.title}</h1>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
          <span className="text-2xl sm:text-[1.75rem] font-semibold text-charcoal-950 tabular-nums">{activeVariant.formattedPrice}</span>
          {activeVariant.formattedCompareAtPrice && (
            <span className="text-base text-charcoal-400 line-through tabular-nums">{activeVariant.formattedCompareAtPrice}</span>
          )}
          {activeVariant.offerLabel && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
              <Tag className="w-3.5 h-3.5" /> {activeVariant.offerLabel}
            </span>
          )}
        </div>
        {policy.priceVisibility === "PUBLIC" && (
          <p className="mt-1 text-[11px] text-charcoal-500">Inclusive of GST. Hallmark and certificates included.</p>
        )}
        {dispatch && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-charcoal-700">
            <Clock className="w-3.5 h-3.5 text-olive-700" /> {dispatch}
          </p>
        )}
      </div>

      {/* Special offers (never beside a hidden price) */}
      {offers.length > 0 && policy.priceVisibility === "PUBLIC" && (
        <div>
          <p className="text-[11px] text-charcoal-600 font-medium mb-2">Special offers</p>
          <ul className="space-y-1.5">
            {offers.map((o) => (
              <li key={o.id} className="flex items-start gap-2.5 border border-ivory-400 bg-ivory-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-charcoal-950 leading-snug">{o.title}</p>
                  {o.description && <p className="mt-0.5 text-[11px] text-charcoal-600 leading-snug">{o.description}</p>}
                </div>
                <span className={`adm-chip shrink-0 ${o.isAuto ? "bg-olive-100 text-olive-800 border-olive-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                  {o.isAuto ? "Auto" : o.code}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Option selectors */}
      {(hasColours || hasPurities || hasSizes) && (
        <div className="space-y-5 border-b border-ivory-400 pb-6">
          {hasColours && (
            <div>
              <p className="text-[11px] text-charcoal-600 font-medium mb-2">
                Metal colour: <span className="text-charcoal-950">{activeVariant.metalColour}</span>
              </p>
              <div className="flex flex-wrap gap-4" role="group" aria-label="Metal colour">
                {colours.map((c) => {
                  const reason = reasonFor("metalColour", c);
                  return (
                    <MetalSwatch
                      key={c}
                      colour={c}
                      size={30}
                      withLabel
                      selected={c === activeVariant.metalColour}
                      disabled={Boolean(reason)}
                      onClick={() => choose("metalColour", c)}
                      ariaLabel={`${activeVariant.purityLabel} ${c}${reason ? ` (${reason})` : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {hasPurities && (
            <div>
              <p className="text-[11px] text-charcoal-600 font-medium mb-2">
                Metal quality: <span className="text-charcoal-950">{activeVariant.purityLabel}</span>
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Gold purity">
                {purities.map((p) => {
                  const active = p === activeVariant.purityLabel;
                  const reason = reasonFor("purityLabel", p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => choose("purityLabel", p)}
                      aria-pressed={active}
                      title={reason}
                      className={`min-h-[44px] px-4 py-2 text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 ${
                        active ? "bg-olive-600 text-ivory-50 border-olive-600" : "bg-ivory-50 text-charcoal-900 border-ivory-400 hover:border-olive-500"
                      } ${reason ? "opacity-50 border-dashed" : ""}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasSizes && (
            <div>
              <p className="text-[11px] text-charcoal-600 font-medium mb-2">
                Size: <span className="text-charcoal-950">{activeVariant.size || "Standard"}</span>
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Size">
                {sizes.map((sz) => {
                  const active = sz === (activeVariant.size || "");
                  const reason = reasonFor("size", sz);
                  return (
                    <button
                      key={sz || "standard"}
                      type="button"
                      onClick={() => choose("size", sz)}
                      aria-pressed={active}
                      title={reason}
                      className={`min-h-[44px] px-3.5 py-2 text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 ${
                        active ? "bg-olive-600 text-ivory-50 border-olive-600" : "bg-ivory-50 text-charcoal-900 border-ivory-400 hover:border-olive-500"
                      } ${reason ? "opacity-50 border-dashed" : ""}`}
                    >
                      {sz || "Standard"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {notice && (
            <p className="text-xs text-olive-800 bg-olive-50 border border-olive-200 px-3 py-2" role="status">
              {notice}
            </p>
          )}
        </div>
      )}

      {/* Customise line */}
      <div className="border border-ivory-400 bg-ivory-50 px-4 py-3 text-xs text-charcoal-700 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>Love this design? It can also be handcrafted in 14K, 18K or 22K gold, in any colour or size.</span>
        <a href={customiseUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(customiseUrl)} className="font-medium text-olive-700 hover:text-orange-500 underline underline-offset-4">
          Customise my piece
        </a>
      </div>

      {/* Primary actions (policy engine decides) */}
      <div className="space-y-3">
        {(policy.ctaType === "BUY_NOW" || policy.ctaType === "BUY_AND_WHATSAPP") && (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={handleAddToBag} className={`min-h-[48px] flex items-center justify-center gap-2 py-4 transition-colors ${justAdded ? "bg-olive-600 text-white" : "btn-charcoal"}`}>
              {justAdded ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              <span>{justAdded ? "Added to bag" : "Add to bag"}</span>
            </button>
            <button type="button" onClick={handleBuyNow} className="btn-gold min-h-[48px] flex items-center justify-center gap-2 py-4">
              <span>Buy it now</span>
            </button>
          </div>
        )}

        {policy.ctaType === "WHATSAPP_ONLY" && (
          <div className="space-y-2">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(whatsappUrl)} className="w-full btn-gold min-h-[48px] flex items-center justify-center gap-2 py-4">
              <MessageCircle className="w-4 h-4" />
              <span>Enquire on WhatsApp</span>
            </a>
            <p className="text-[11px] text-charcoal-600 text-center">{policy.reason}</p>
          </div>
        )}

        {policy.ctaType === "OUT_OF_STOCK" && (
          <div className="space-y-2">
            <button disabled className="w-full bg-charcoal-200 text-charcoal-600 min-h-[48px] py-4 text-xs uppercase tracking-[0.18em] font-medium cursor-not-allowed">
              Currently sold out
            </button>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(whatsappUrl)} className="w-full btn-outline-gold min-h-[44px] flex items-center justify-center gap-2 py-3">
              <MessageCircle className="w-4 h-4" />
              <span>Ask about a backorder</span>
            </a>
          </div>
        )}

        {policy.ctaType === "BUY_AND_WHATSAPP" && (
          <p className="text-[11px] text-charcoal-600 text-center">
            High-value piece: a concierge can walk you through it on WhatsApp before you decide.
          </p>
        )}

        {/* Assistance row */}
        <div className="grid grid-cols-2 border border-ivory-400 divide-x divide-ivory-400 bg-ivory-50">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(whatsappUrl)} className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-olive-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
            <span className="w-8 h-8 rounded-full bg-olive-600 text-ivory-50 flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium text-charcoal-900 leading-tight">Chat for purchase assistance on WhatsApp</span>
          </a>
          <a href={videoCallUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(videoCallUrl)} className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-olive-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600">
            <span className="w-8 h-8 rounded-full bg-olive-600 text-ivory-50 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium text-charcoal-900 leading-tight">Video call assistance</span>
          </a>
        </div>
        {WHATSAPP_NUMBER === PLACEHOLDER_NUMBER && (
          <p className="text-[11px] text-charcoal-500 text-center">
            WhatsApp is on a sandbox number. You can also{" "}
            <a href="/consultation" className="underline underline-offset-4 text-olive-700">request a callback</a>.
          </p>
        )}
      </div>

      {/* Certifications + share + wishlist */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-charcoal-700">
          <ShieldCheck className="w-4 h-4 text-olive-700" />
          <span>
            <span className="font-medium text-charcoal-950">Certified.</span>{" "}
            {product.certificationData || "BIS hallmark and stone certificate with every purchase."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={share} className="adm-btn-ghost min-h-[40px]">
            {copied ? <Check className="w-3.5 h-3.5 text-olive-700" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? "Link copied" : "Share"}
          </button>
          <button type="button" onClick={() => toggle(product.id)} aria-pressed={wishlisted} className="adm-btn-ghost min-h-[40px]">
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-[#556B2F] text-[#556B2F]" : ""}`} />
            {wishlisted ? "Saved" : "Wishlist"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-ivory-400 pt-5">
        <div className="flex gap-6 border-b border-ivory-400" role="tablist" aria-label="Product information">
          {(
            [
              ["description", "Description"],
              ["details", "Product details"],
              ["breakup", "Price breakup"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`pb-3 -mb-px min-h-[44px] text-[13px] font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-600 ${
                tab === key ? "border-olive-600 text-olive-800" : "border-transparent text-charcoal-500 hover:text-charcoal-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div key={tab} className="pt-5 text-sm text-charcoal-700 leading-relaxed tab-panel-in" role="tabpanel">
          {tab === "description" && (
            <div className="space-y-4">
              <p>{product.description}</p>
              {product.craftsmanshipNotes && (
                <p className="bg-ivory-200/60 p-3 border-l-2 border-olive-500 text-charcoal-800 text-xs leading-relaxed">{product.craftsmanshipNotes}</p>
              )}
              {product.stylingTip && (
                <div>
                  <p className="text-[11px] text-charcoal-600 font-medium">Styling tip</p>
                  <p className="mt-1">{product.stylingTip}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-charcoal-600 font-medium">Care</p>
                <p className="mt-1 text-xs">
                  Store in the velvet box, away from perfume and moisture. Polki and meenakari should be wiped with a dry soft cloth only; bring the piece to the atelier for professional cleaning.
                </p>
              </div>
              <p className="text-xs text-charcoal-600">
                {product.materialSummary}
                {product.stoneDetails ? ` · ${product.stoneDetails}` : ""}
              </p>
            </div>
          )}

          {tab === "details" && (
            <dl className="grid grid-cols-[minmax(120px,1fr)_2fr] text-xs sm:text-sm">
              {detailRows
                .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
                .map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="py-2 pr-3 text-charcoal-600 border-b border-ivory-300">{k}</dt>
                    <dd className="py-2 text-charcoal-950 font-medium border-b border-ivory-300 tabular-nums">{v}</dd>
                  </React.Fragment>
                ))}
            </dl>
          )}

          {tab === "breakup" &&
            (breakup ? (
              <div>
                {breakupSegments.length > 1 && breakupTotal > 0 && (
                  <div className="mb-5">
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-ivory-200" role="img" aria-label="Price composition">
                      {breakupSegments.map((s, i) => (
                        <div
                          key={s.key}
                          className={`bar-seg h-full ${s.cls}`}
                          style={{ width: `${(s.paise / breakupTotal) * 100}%`, animationDelay: `${i * 0.12}s` }}
                          title={`${s.label}: ${Math.round((s.paise / breakupTotal) * 100)}%`}
                        />
                      ))}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                      {breakupSegments.map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-charcoal-700">
                          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                          {s.label}
                          <span className="text-charcoal-400 tabular-nums">{Math.round((s.paise / breakupTotal) * 100)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <dl className="text-xs sm:text-sm tabular-nums">
                  {breakup.formatted.goldValue && (
                    <div className="flex justify-between py-2 border-b border-ivory-300">
                      <dt className="text-charcoal-600">Gold value{activeVariant.goldWeightGrams ? ` (${activeVariant.goldWeightGrams} g)` : ""}</dt>
                      <dd className="font-medium text-charcoal-950 text-right">{breakup.formatted.goldValue}</dd>
                    </div>
                  )}
                  {breakup.formatted.stoneValue && (
                    <div className="flex justify-between py-2 border-b border-ivory-300">
                      <dt className="text-charcoal-600">Stone value</dt>
                      <dd className="font-medium text-charcoal-950 text-right">{breakup.formatted.stoneValue}</dd>
                    </div>
                  )}
                  {breakup.formatted.makingCharges && (
                    <div className="flex justify-between py-2 border-b border-ivory-300">
                      <dt className="text-charcoal-600">Making charges</dt>
                      <dd className="font-medium text-charcoal-950 flex items-baseline gap-2 text-right">
                        {breakup.makingDiscountPercent ? (
                          <>
                            <span className="line-through text-charcoal-400 font-normal">{breakup.formatted.makingCharges}</span>
                            <span>{breakup.formatted.makingChargesAfterDiscount}</span>
                            <span className="text-[11px] text-orange-600 font-medium">{breakup.makingDiscountPercent}% off</span>
                          </>
                        ) : (
                          breakup.formatted.makingCharges
                        )}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <dt className="text-charcoal-950 font-medium">Total (incl. GST)</dt>
                    <dd className="font-semibold text-charcoal-950 text-right">{activeVariant.formattedPrice}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] text-charcoal-500">
                  Indicative breakup for explanation only. The payable amount is the price shown above; the invoice carries the exact split.
                </p>
              </div>
            ) : (
              <p className="text-xs text-charcoal-600">
                The gold, stone and making-charge split for this piece is shared on request.{" "}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(whatsappUrl)} className="font-medium text-olive-700 hover:text-orange-500 underline underline-offset-4">
                  Ask on WhatsApp
                </a>
                .
              </p>
            ))}
        </div>
      </div>

      {/* Trust row */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-ivory-400 pt-6">
        {TRUST.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-[11px] text-charcoal-700">
            <Icon className="w-4 h-4 text-olive-700 shrink-0 stroke-[1.5]" />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {/* Mobile sticky CTA with safe-area spacing */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-ivory-100/95 backdrop-blur-md border-t border-ivory-400 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 shadow-dropdown flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] text-charcoal-600 block truncate">
            {activeVariant.purityLabel} {activeVariant.metalColour}
          </span>
          <span className="text-base font-semibold text-charcoal-950 tabular-nums">{activeVariant.formattedPrice}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(whatsappUrl)} aria-label="Chat on WhatsApp" className="w-12 h-12 rounded-full bg-olive-600 text-ivory-50 flex items-center justify-center shrink-0">
            <WhatsAppIcon className="w-5 h-5" />
          </a>
          {policy.canPurchase ? (
            <button type="button" onClick={handleAddToBag} className="btn-gold min-h-[48px] py-3 px-5 text-xs whitespace-nowrap">
              Add to bag
            </button>
          ) : (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={waTap(whatsappUrl)} className="btn-gold min-h-[48px] py-3 px-5 text-xs whitespace-nowrap flex items-center">
              Enquire
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";

interface Settings {
  storeName: string;
  whatsappNumber: string;
  highValueThresholdPaise: string;
  gstPercentage: number;
  enablePurchases: boolean;
  contactEmail: string;
}

export default function AdminSettingsPage() {
  const [, setSettings] = useState<Settings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("STAFF");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form inputs
  const [storeName, setStoreName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [thresholdInr, setThresholdInr] = useState("");
  const [gstPercentage, setGstPercentage] = useState("3.0");
  const [enablePurchases, setEnablePurchases] = useState(true);
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, settingsRes] = await Promise.all([
          fetch("/api/admin/auth/me"),
          fetch("/api/admin/settings"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUserRole(meData.user?.role || "STAFF");
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          const s = sData.settings;
          setSettings(s);
          setStoreName(s.storeName || "Chudiwalas");
          setWhatsappNumber(s.whatsappNumber || "919876543210");
          const inr = s.highValueThresholdPaise
            ? Number(BigInt(s.highValueThresholdPaise)) / 100
            : 100000;
          setThresholdInr(inr.toString());
          setGstPercentage(s.gstPercentage?.toString() || "3.0");
          setEnablePurchases(s.enablePurchases ?? true);
          setContactEmail(s.contactEmail || "concierge@chudiwalas.com");
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const isOwner = currentUserRole === "OWNER";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setErrorMsg("Forbidden: Only an OWNER can modify store settings and thresholds (S13).");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          whatsappNumber,
          highValueThresholdInr: Number(thresholdInr),
          gstPercentage: Number(gstPercentage),
          enablePurchases,
          contactEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update store settings.");
      }

      setSuccessMsg("Store settings, high-value policy thresholds, and tax rules saved with audit record.");
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-charcoal-500">Loading store settings...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-950">Store & Policy Settings</h1>
        <p className="text-xs text-charcoal-500 mt-1">
          Configure high-value threshold logic, WhatsApp concierge routing, and Indian GST rules.
        </p>
      </div>

      {(whatsappNumber === "919876543210" || /aurumatelier|example\./i.test(contactEmail)) && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-xs text-orange-800">
          <strong>Setup needed.</strong> The concierge WhatsApp number and/or email are still sandbox placeholders. Every WhatsApp button on the storefront points here, so customers currently reach no one. Enter the real business number (country code, digits only) and email, then save.
        </div>
      )}

      {!isOwner && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-xs text-orange-800 flex items-start space-x-2">
          <span className="font-bold">Notice:</span>
          <span>
            You are signed in with role <strong className="font-mono">{currentUserRole}</strong>. Modifying store settings, GST rules, and purchase thresholds strictly requires <strong className="font-mono">OWNER</strong> privileges (S13 Invariant).
          </span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-olive-50 border border-olive-200 text-olive-800 text-xs rounded">
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded">
          ⚠ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="adm-card p-6 space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            Store Name
          </label>
          <input
            type="text"
            disabled={!isOwner}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="adm-input text-xs disabled:bg-ivory-200"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            High-Value Threshold (₹ INR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-charcoal-400 text-xs">₹</span>
            <input
              type="number"
              disabled={!isOwner}
              value={thresholdInr}
              onChange={(e) => setThresholdInr(e.target.value)}
              className="adm-input text-xs pl-7 disabled:bg-ivory-200"
            />
          </div>
          <p className="text-[11px] text-charcoal-500 mt-1">
            Jewellery priced at or above this threshold triggers mandatory WhatsApp consultation CTAs alongside purchase. Default is ₹1,00,000 (10,000,000 paise).
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            Concierge WhatsApp Number (International Digits Only)
          </label>
          <input
            type="text"
            disabled={!isOwner}
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
            className="adm-input text-xs disabled:bg-ivory-200"
          />
          <p className="text-[11px] text-charcoal-500 mt-1">
            Country code + phone without spaces or plus (e.g. 919876543210 for India).
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            Indian Jewellery GST Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            disabled={!isOwner}
            value={gstPercentage}
            onChange={(e) => setGstPercentage(e.target.value)}
            className="adm-input text-xs disabled:bg-ivory-200"
          />
          <p className="text-[11px] text-charcoal-500 mt-1">
            Standard statutory GST on precious jewellery in India is 3.0%.
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            Concierge Notification Email
          </label>
          <input
            type="email"
            disabled={!isOwner}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="adm-input text-xs disabled:bg-ivory-200"
          />
        </div>

        <div className="pt-2 border-t border-ivory-300">
          <label className="flex items-center space-x-2 text-xs text-charcoal-800 cursor-pointer">
            <input
              type="checkbox"
              disabled={!isOwner}
              checked={enablePurchases}
              onChange={(e) => setEnablePurchases(e.target.checked)}
              className="rounded accent-[#556B2F] disabled:opacity-50"
            />
            <span className="font-medium">Enable Storefront Online Purchases</span>
          </label>
          <p className="text-[11px] text-charcoal-500 mt-1">
            Master kill-switch. When disabled, all pieces switch to consultation and inquiry mode.
          </p>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={!isOwner || saving}
            className="px-5 py-2.5 adm-btn"
          >
            {saving ? "Saving Settings..." : "Save Store Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}

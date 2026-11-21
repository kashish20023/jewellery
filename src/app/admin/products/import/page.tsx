"use client";

import React, { useState } from "react";

interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

const SAMPLE_CSV = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"The Royal Peacock Emerald Choker",AUR-CHOK-009,royal-peacock-emerald-choker,"18K Yellow Gold with Zambian Emeralds","18K Yellow Gold",AUR-CHOK-009-YG,850000,2,false,PUBLIC
"Heritage Polki Diamond Passa",AUR-PAS-010,heritage-polki-diamond-passa,"22K Hallmarked Gold with Uncut Polki Diamonds","22K Yellow Gold",AUR-PAS-010-YG,420000,1,false,PUBLIC
"Bespoke Maharani Nizam Emerald Necklace",AUR-BESP-011,bespoke-maharani-nizam-emerald-necklace,"Platinum 950 with Rare Colombian Emeralds","Platinum",AUR-BESP-011-PT,,1,true,ON_REQUEST`;

export default function AdminCsvImportPage() {
  const [csvContent, setCsvContent] = useState("");
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text || "");
        setErrors([]);
        setValidationSuccess(null);
        setImportResult(null);
      };
      reader.readAsText(file);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setErrors([]);
    setValidationSuccess(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvContent, commit: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([{ row: 1, field: "general", message: data.error || "Validation failed" }]);
        }
      } else {
        setValidationSuccess(
          `Validation successful! All ${data.validRowsCount} rows are strictly valid and ready to import.`
        );
      }
    } catch (err: unknown) {
      setErrors([{ row: 1, field: "network", message: (err as Error).message }]);
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    setErrors([]);
    setImportResult(null);

    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvContent, commit: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([{ row: 1, field: "general", message: data.error || "Import failed" }]);
        }
      } else {
        setImportResult(data.message || `Successfully committed ${data.importedCount} products into database.`);
        setValidationSuccess(null);
      }
    } catch (err: unknown) {
      setErrors([{ row: 1, field: "network", message: (err as Error).message }]);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-950">Catalogue CSV Bulk Importer</h1>
        <p className="text-xs text-charcoal-500 mt-1">
          Upload or paste catalogue spreadsheets with strict line-level schema validation (S15).
        </p>
      </div>

      {/* Template & Guidelines Card */}
      <div className="adm-card p-4 text-xs space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium text-charcoal-950 uppercase tracking-wider text-[11px]">
            Expected CSV Format & Required Headers
          </span>
          <button
            onClick={() => setCsvContent(SAMPLE_CSV)}
            className="text-[11px] text-olive-700 hover:text-orange-500"
          >
            Insert Sample CSV Template
          </button>
        </div>
        <p className="text-charcoal-600 leading-relaxed">
          Required columns: <code className="bg-ivory-100 px-1 py-0.5 rounded border border-ivory-400">title, skuGroup, slug, materialSummary, metalType, sku, priceInr, stockQuantity, isEnquiryOnly, priceVisibility</code>.
          Optional columns: <code className="bg-ivory-100 px-1 py-0.5 rounded border border-ivory-400">category, metalColour, compareAtPriceInr, offerLabel, goldValueInr, stoneValueInr, makingChargesInr, makingDiscountPercent, goldWeightGrams, grossWeightGrams, stylingTip, size, purity, leadTimeDays, isMadeToOrder</code>.
          Prices must be in positive INR; for pieces with <code className="bg-ivory-100 px-1 py-0.5 rounded border border-ivory-400">priceVisibility: ON_REQUEST</code>, priceInr can be omitted.
        </p>
      </div>

      {/* File Upload / Paste Input */}
      <div className="adm-card p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            Choose CSV File
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="text-xs text-charcoal-600 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-olive-100 file:text-olive-800 hover:file:bg-olive-200"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-800 font-medium mb-1">
            Or Paste Raw CSV Data
          </label>
          <textarea
            rows={10}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Paste CSV rows here..."
            className="w-full p-3 text-xs border border-ivory-400 bg-ivory-100 rounded focus:outline-none focus:ring-1 focus:ring-[#556B2F]"
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleValidate}
            disabled={validating || !csvContent.trim()}
            className="px-4 py-2 adm-btn-secondary"
          >
            {validating ? "Validating Lines..." : "Validate CSV (Dry Run)"}
          </button>

          <button
            onClick={handleCommit}
            disabled={committing || !csvContent.trim()}
            className="px-4 py-2 adm-btn"
          >
            {committing ? "Importing to Database..." : "Commit Import"}
          </button>
        </div>
      </div>

      {/* Line-Level Error Alert & Table (S15 Invariant) */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-5 space-y-3">
          <div className="flex items-center space-x-2 text-red-800 font-medium text-xs">
            <span className="text-base leading-none">⚠</span>
            <span>
              Validation Rejected: Found {errors.length} line-level {errors.length === 1 ? "error" : "errors"} (S15)
            </span>
          </div>

          <div className="overflow-x-auto bg-white rounded border border-red-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-red-100/50 text-red-900 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2 px-3 font-semibold">Row Number</th>
                  <th className="py-2 px-3 font-semibold">Field</th>
                  <th className="py-2 px-3 font-semibold">Validation Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {errors.map((err, i) => (
                  <tr key={i} className="hover:bg-red-50/40">
                    <td className="py-2 px-3 font-bold text-red-900">
                      Row {err.row}
                    </td>
                    <td className="py-2 px-3 text-charcoal-800">
                      {err.field}
                    </td>
                    <td className="py-2 px-3 text-red-700">
                      {err.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Success Alert */}
      {validationSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center space-x-2">
          <span>✓</span>
          <span>{validationSuccess}</span>
        </div>
      )}

      {/* Commit Result Alert */}
      {importResult && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-xs text-orange-800 flex items-center space-x-2">
          <span>🎉</span>
          <span>{importResult}</span>
        </div>
      )}
    </div>
  );
}


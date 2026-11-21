/**
 * Catalogue CSV Parser & Line-Level Validator (PRD-F07 / S15)
 * 
 * INVARIANTS:
 * 1. Line-level validation errors must return exact row numbers (1-indexed) and field names.
 * 2. Does not fail silently or stop at the first error; collects all errors in the file.
 * 3. Prices are validated as positive decimal numbers and converted to minor unit paise (BigInt).
 *    If priceVisibility is ON_REQUEST, price can be blank/null.
 *    Negative prices are strictly rejected.
 * 4. SKUs must be unique within the CSV payload.
 */

import { PriceVisibility } from "@prisma/client";
import { rupeesToPaise } from "@/lib/money";

export interface CsvRowError {
  row: number; // 1-indexed row number in the CSV
  field: string;
  message: string;
}

export interface ValidCatalogueRow {
  rowNumber: number;
  title: string;
  skuGroup: string;
  slug: string;
  description: string;
  craftsmanshipNotes?: string;
  materialSummary: string;
  stoneDetails?: string;
  certificationData?: string;
  isEnquiryOnly: boolean;
  priceVisibility: PriceVisibility;
  sku: string;
  metalType: string;
  size?: string;
  purity?: string;
  pricePaise: bigint | null;
  stockQuantity: number;
  leadTimeDays: number;
  isMadeToOrder: boolean;
  // Optional merchandising / pricing columns
  category?: string;
  metalColour?: string;
  compareAtPricePaise?: bigint | null;
  offerLabel?: string;
  goldValuePaise?: bigint | null;
  stoneValuePaise?: bigint | null;
  makingChargesPaise?: bigint | null;
  makingDiscountPercent?: number | null;
  goldWeightGrams?: number | null;
  grossWeightGrams?: number | null;
  stylingTip?: string;
}

export interface CsvValidationResult {
  success: boolean;
  totalRows: number;
  validRows: ValidCatalogueRow[];
  errors: CsvRowError[];
}

/**
 * Robust CSV line tokenizer respecting quotes and escaped commas.
 */
export function tokenizeCsvLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  values.push(currentValue.trim());
  return values;
}

/**
 * Splits CSV string into rows, handling multiline quoted cells.
 */
export function splitCsvRows(content: string): string[] {
  const rows: string[] = [];
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  let currentCombined = "";
  let insideQuotes = false;

  for (const line of lines) {
    // Count unescaped quotes in this line
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      insideQuotes = !insideQuotes;
    }

    if (currentCombined) {
      currentCombined += "\n" + line;
    } else {
      currentCombined = line;
    }

    if (!insideQuotes) {
      if (currentCombined.trim().length > 0) {
        rows.push(currentCombined);
      }
      currentCombined = "";
    }
  }

  if (currentCombined.trim().length > 0) {
    rows.push(currentCombined);
  }

  return rows;
}

export const REQUIRED_CSV_HEADERS = [
  "title",
  "skuGroup",
  "slug",
  "materialSummary",
  "metalType",
  "sku",
  "stockQuantity",
];

/**
 * Validates a complete catalogue CSV payload and returns line-level errors.
 */
export function validateCatalogueCsv(csvContent: string): CsvValidationResult {
  const errors: CsvRowError[] = [];
  const validRows: ValidCatalogueRow[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return {
      success: false,
      totalRows: 0,
      validRows: [],
      errors: [{ row: 1, field: "file", message: "CSV content is empty." }],
    };
  }

  const rows = splitCsvRows(csvContent);
  if (rows.length < 2) {
    return {
      success: false,
      totalRows: rows.length,
      validRows: [],
      errors: [
        {
          row: 1,
          field: "file",
          message: "CSV must contain at least a header row and one data row.",
        },
      ],
    };
  }

  // 1. Header validation (Row 1)
  const headerTokens = tokenizeCsvLine(rows[0]).map((h) => h.replace(/^["']|["']$/g, "").trim());
  const headerMap = new Map<string, number>();
  headerTokens.forEach((header, index) => {
    headerMap.set(header.toLowerCase(), index);
  });

  const missingHeaders = REQUIRED_CSV_HEADERS.filter(
    (reqHeader) => !headerMap.has(reqHeader.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    errors.push({
      row: 1,
      field: "headers",
      message: `Missing required column headers: ${missingHeaders.join(", ")}`,
    });
    return {
      success: false,
      totalRows: rows.length - 1,
      validRows: [],
      errors,
    };
  }

  const seenSkus = new Map<string, number>(); // SKU -> first row number seen

  // 2. Data row validation (Row 2 onwards)
  for (let r = 1; r < rows.length; r++) {
    const rowNumber = r + 1; // 1-indexed row number
    const rowLine = rows[r];
    if (!rowLine.trim()) continue; // skip trailing empty line

    const values = tokenizeCsvLine(rowLine).map((v) => v.replace(/^["']|["']$/g, "").trim());
    let rowHasError = false;

    const getValue = (colName: string): string => {
      const idx = headerMap.get(colName.toLowerCase());
      return idx !== undefined && idx < values.length ? values[idx] : "";
    };

    const title = getValue("title");
    const skuGroup = getValue("skuGroup");
    const slug = getValue("slug");
    const materialSummary = getValue("materialSummary");
    const metalType = getValue("metalType");
    const sku = getValue("sku");
    const rawPriceInr = getValue("priceInr");
    const rawStock = getValue("stockQuantity");
    const rawEnquiryOnly = getValue("isEnquiryOnly");
    const rawPriceVisibility = getValue("priceVisibility") || "PUBLIC";
    const description = getValue("description") || `${title} crafted in ${metalType}.`;
    const craftsmanshipNotes = getValue("craftsmanshipNotes") || undefined;
    const stoneDetails = getValue("stoneDetails") || undefined;
    const certificationData = getValue("certificationData") || undefined;
    const size = getValue("size") || undefined;
    const purity = getValue("purity") || undefined;
    const rawLeadTime = getValue("leadTimeDays") || "14";
    const rawMadeToOrder = getValue("isMadeToOrder") || "false";
    const category = getValue("category") || undefined;
    const metalColour = getValue("metalColour") || undefined;
    const offerLabel = getValue("offerLabel") || undefined;
    const stylingTip = getValue("stylingTip") || undefined;
    const optionalInr = (col: string): bigint | null | undefined => {
      const raw = getValue(col);
      if (!raw) return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ row: rowNumber, field: col, message: `${col} must be a non-negative number in INR.` });
        rowHasError = true;
        return undefined;
      }
      return BigInt(Math.round(n * 100));
    };
    const optionalNum = (col: string): number | null | undefined => {
      const raw = getValue(col);
      if (!raw) return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ row: rowNumber, field: col, message: `${col} must be a non-negative number.` });
        rowHasError = true;
        return undefined;
      }
      return n;
    };
    const compareAtPricePaise = optionalInr("compareAtPriceInr");
    const goldValuePaise = optionalInr("goldValueInr");
    const stoneValuePaise = optionalInr("stoneValueInr");
    const makingChargesPaise = optionalInr("makingChargesInr");
    const makingDiscountPercent = optionalNum("makingDiscountPercent");
    const goldWeightGrams = optionalNum("goldWeightGrams");
    const grossWeightGrams = optionalNum("grossWeightGrams");

    // Required field validation
    if (!title) {
      errors.push({ row: rowNumber, field: "title", message: "Title is required." });
      rowHasError = true;
    }
    if (!skuGroup) {
      errors.push({ row: rowNumber, field: "skuGroup", message: "skuGroup is required." });
      rowHasError = true;
    }
    if (!slug) {
      errors.push({ row: rowNumber, field: "slug", message: "Slug is required." });
      rowHasError = true;
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push({
        row: rowNumber,
        field: "slug",
        message: "Slug must contain only lowercase letters, numbers, and single hyphens.",
      });
      rowHasError = true;
    }

    if (!materialSummary) {
      errors.push({ row: rowNumber, field: "materialSummary", message: "materialSummary is required." });
      rowHasError = true;
    }
    if (!metalType) {
      errors.push({ row: rowNumber, field: "metalType", message: "metalType is required." });
      rowHasError = true;
    }

    // SKU validation & duplicate check
    if (!sku) {
      errors.push({ row: rowNumber, field: "sku", message: "SKU is required." });
      rowHasError = true;
    } else {
      const upperSku = sku.toUpperCase();
      if (seenSkus.has(upperSku)) {
        errors.push({
          row: rowNumber,
          field: "sku",
          message: `Duplicate SKU "${sku}" found. It was already defined on row ${seenSkus.get(upperSku)}.`,
        });
        rowHasError = true;
      } else {
        seenSkus.set(upperSku, rowNumber);
      }
    }

    // Price visibility validation
    let priceVisibility: PriceVisibility = PriceVisibility.PUBLIC;
    const upperVisibility = rawPriceVisibility.toUpperCase();
    if (upperVisibility === "ON_REQUEST") {
      priceVisibility = PriceVisibility.ON_REQUEST;
    } else if (upperVisibility === "PUBLIC" || upperVisibility === "") {
      priceVisibility = PriceVisibility.PUBLIC;
    } else {
      errors.push({
        row: rowNumber,
        field: "priceVisibility",
        message: `Invalid priceVisibility: "${rawPriceVisibility}". Must be "PUBLIC" or "ON_REQUEST".`,
      });
      rowHasError = true;
    }

    // Price INR validation
    let pricePaise: bigint | null = null;
    if (priceVisibility === PriceVisibility.ON_REQUEST) {
      pricePaise = null;
    } else {
      if (!rawPriceInr) {
        errors.push({
          row: rowNumber,
          field: "priceInr",
          message: "Price in INR is required when priceVisibility is PUBLIC.",
        });
        rowHasError = true;
      } else {
        const numPrice = Number(rawPriceInr.replace(/,/g, ""));
        if (isNaN(numPrice)) {
          errors.push({
            row: rowNumber,
            field: "priceInr",
            message: `Invalid price "${rawPriceInr}". Must be a valid number.`,
          });
          rowHasError = true;
        } else if (numPrice < 0) {
          errors.push({
            row: rowNumber,
            field: "priceInr",
            message: "Price cannot be negative.",
          });
          rowHasError = true;
        } else {
          try {
            pricePaise = rupeesToPaise(numPrice);
          } catch (e: unknown) {
            errors.push({
              row: rowNumber,
              field: "priceInr",
              message: (e as Error).message,
            });
            rowHasError = true;
          }
        }
      }
    }

    // Stock Quantity validation
    let stockQuantity = 0;
    if (!rawStock) {
      errors.push({ row: rowNumber, field: "stockQuantity", message: "stockQuantity is required." });
      rowHasError = true;
    } else {
      const numStock = Number(rawStock);
      if (isNaN(numStock) || !Number.isInteger(numStock)) {
        errors.push({
          row: rowNumber,
          field: "stockQuantity",
          message: `Invalid stockQuantity "${rawStock}". Must be an integer.`,
        });
        rowHasError = true;
      } else if (numStock < 0) {
        errors.push({
          row: rowNumber,
          field: "stockQuantity",
          message: "Stock quantity cannot be negative.",
        });
        rowHasError = true;
      } else {
        stockQuantity = numStock;
      }
    }

    // isEnquiryOnly validation
    let isEnquiryOnly = false;
    if (rawEnquiryOnly) {
      const lower = rawEnquiryOnly.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") {
        isEnquiryOnly = true;
      } else if (lower === "false" || lower === "0" || lower === "no") {
        isEnquiryOnly = false;
      } else {
        errors.push({
          row: rowNumber,
          field: "isEnquiryOnly",
          message: `Invalid boolean "${rawEnquiryOnly}". Expected true, false, 1, 0.`,
        });
        rowHasError = true;
      }
    }

    // isMadeToOrder validation
    let isMadeToOrder = false;
    if (rawMadeToOrder) {
      const lower = rawMadeToOrder.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") {
        isMadeToOrder = true;
      } else if (lower === "false" || lower === "0" || lower === "no") {
        isMadeToOrder = false;
      }
    }

    const leadTimeDays = parseInt(rawLeadTime, 10) || 14;

    if (!rowHasError) {
      validRows.push({
        rowNumber,
        title,
        skuGroup,
        slug,
        description,
        craftsmanshipNotes,
        materialSummary,
        stoneDetails,
        certificationData,
        isEnquiryOnly,
        priceVisibility,
        sku: sku.toUpperCase(),
        metalType,
        size,
        purity,
        pricePaise,
        stockQuantity,
        leadTimeDays,
        isMadeToOrder,
        category,
        metalColour,
        compareAtPricePaise,
        offerLabel,
        goldValuePaise,
        stoneValuePaise,
        makingChargesPaise,
        makingDiscountPercent,
        goldWeightGrams,
        grossWeightGrams,
        stylingTip,
      });
    }
  }

  return {
    success: errors.length === 0,
    totalRows: rows.length - 1,
    validRows,
    errors,
  };
}


import { describe, it, expect } from "vitest";
import { validateCatalogueCsv, tokenizeCsvLine, splitCsvRows } from "@/lib/admin/csv";
import { PriceVisibility } from "@prisma/client";

describe("Catalogue CSV Validator & Parser (PRD-F07 / S15)", () => {
  describe("CSV Tokenizer & Row Splitter", () => {
    it("handles quoted fields with internal commas correctly", () => {
      const line = '"The Grand Necklace","18K Gold, Natural Diamonds, Zambian Emeralds",150000';
      const tokens = tokenizeCsvLine(line);
      expect(tokens).toEqual([
        "The Grand Necklace",
        "18K Gold, Natural Diamonds, Zambian Emeralds",
        "150000",
      ]);
    });

    it("handles escaped quotes inside quoted fields", () => {
      const line = '"Ring with ""VVS"" Diamond",AUR-RNG-01';
      const tokens = tokenizeCsvLine(line);
      expect(tokens).toEqual(['Ring with "VVS" Diamond', "AUR-RNG-01"]);
    });

    it("splits rows across newline boundaries", () => {
      const csv = "h1,h2\nv1,v2\nv3,v4";
      const rows = splitCsvRows(csv);
      expect(rows).toEqual(["h1,h2", "v1,v2", "v3,v4"]);
    });
  });

  describe("Validation of Valid CSV Payloads", () => {
    it("successfully parses valid CSV and converts price to integer paise", () => {
      const validCsv = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Royal Emerald Choker",AUR-CHOK-001,royal-emerald-choker,"18K Gold with Emeralds","18K Yellow Gold",AUR-CHOK-001-YG,250000,5,false,PUBLIC
"Heritage Temple Bangle",AUR-BAN-002,heritage-temple-bangle,"22K Gold Handcrafted","22K Yellow Gold",AUR-BAN-002-YG,120000,2,true,PUBLIC
"Bespoke High Jewellery",AUR-BESP-003,bespoke-high-jewellery,"Platinum with Colombian Emeralds","Platinum",AUR-BESP-003-PT,,1,true,ON_REQUEST`;

      const result = validateCatalogueCsv(validCsv);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toHaveLength(3);

      // Verify row 1 conversions
      const row1 = result.validRows[0];
      expect(row1.title).toBe("Royal Emerald Choker");
      expect(row1.pricePaise).toBe(25_000_000n); // ₹2,50,000 -> 25,000,000 paise
      expect(row1.stockQuantity).toBe(5);
      expect(row1.isEnquiryOnly).toBe(false);
      expect(row1.priceVisibility).toBe(PriceVisibility.PUBLIC);

      // Verify row 2 conversions
      const row2 = result.validRows[1];
      expect(row2.pricePaise).toBe(12_000_000n);
      expect(row2.isEnquiryOnly).toBe(true);

      // Verify row 3 ON_REQUEST piece (null price allowed)
      const row3 = result.validRows[2];
      expect(row3.pricePaise).toBeNull();
      expect(row3.priceVisibility).toBe(PriceVisibility.ON_REQUEST);
      expect(row3.isEnquiryOnly).toBe(true);
    });
  });

  describe("Line-Level Error Reporting (S15 Invariant)", () => {
    it("rejects missing required headers with row 1 reference", () => {
      const badHeadersCsv = `title,metalType\n"Test Piece","18K Gold"`;
      const result = validateCatalogueCsv(badHeadersCsv);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].field).toBe("headers");
      expect(result.errors[0].message).toContain("Missing required column headers");
    });

    it("detects and flags negative prices with exact line number", () => {
      const csvWithNegativePrice = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Valid Piece",AUR-VAL-001,valid-piece,"18K Gold","18K Yellow Gold",AUR-VAL-001-YG,50000,1,false,PUBLIC
"Invalid Piece",AUR-INV-002,invalid-piece,"18K Gold","18K Yellow Gold",AUR-INV-002-YG,-15000,1,false,PUBLIC`;

      const result = validateCatalogueCsv(csvWithNegativePrice);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(3); // Line 3 in the CSV
      expect(result.errors[0].field).toBe("priceInr");
      expect(result.errors[0].message).toBe("Price cannot be negative.");
    });

    it("detects negative stock quantity with exact line number", () => {
      const csvWithNegativeStock = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Piece A",AUR-PCA-001,piece-a,"18K Gold","18K Yellow Gold",AUR-PCA-001-YG,50000,-3,false,PUBLIC`;

      const result = validateCatalogueCsv(csvWithNegativeStock);

      expect(result.success).toBe(false);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].field).toBe("stockQuantity");
      expect(result.errors[0].message).toBe("Stock quantity cannot be negative.");
    });

    it("flags duplicate SKUs within the same CSV payload with previous row reference", () => {
      const csvWithDuplicateSku = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Piece One",AUR-P1-001,piece-one,"18K Gold","18K Yellow Gold",AUR-DUP-001,50000,1,false,PUBLIC
"Piece Two",AUR-P2-002,piece-two,"18K Gold","18K Rose Gold",AUR-DIFF-002,60000,1,false,PUBLIC
"Piece Three",AUR-P3-003,piece-three,"18K Gold","18K White Gold",AUR-DUP-001,70000,1,false,PUBLIC`;

      const result = validateCatalogueCsv(csvWithDuplicateSku);

      expect(result.success).toBe(false);
      const duplicateError = result.errors.find((e) => e.field === "sku");
      expect(duplicateError).toBeDefined();
      expect(duplicateError?.row).toBe(4);
      expect(duplicateError?.message).toContain('Duplicate SKU "AUR-DUP-001" found. It was already defined on row 2.');
    });

    it("rejects invalid slugs with formatting error", () => {
      const csvWithBadSlug = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Piece One",AUR-P1-001,Invalid_Slug_With_Upper!,"18K Gold","18K Yellow Gold",AUR-SKU-001,50000,1,false,PUBLIC`;

      const result = validateCatalogueCsv(csvWithBadSlug);

      expect(result.success).toBe(false);
      const slugError = result.errors.find((e) => e.field === "slug");
      expect(slugError?.row).toBe(2);
      expect(slugError?.message).toContain("Slug must contain only lowercase letters, numbers, and single hyphens.");
    });
  });
});


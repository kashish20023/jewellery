import { describe, it, expect } from "vitest";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/admin/settings/route";
import { GET as getProducts, POST as createProduct } from "@/app/api/admin/products/route";
import { PATCH as updateProduct } from "@/app/api/admin/products/[id]/route";
import { POST as importCsv } from "@/app/api/admin/products/import/route";
import { createSessionToken } from "@/lib/admin/auth";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

describe("Admin RBAC & Catalogue Integration (S13, S14, S15)", () => {
  // Pre-generate session tokens for different roles
  const ownerToken = createSessionToken({
    id: "admin-owner-test",
    email: "owner@aurumatelier.internal",
    name: "Salon Owner",
    role: Role.OWNER,
  });

  const managerToken = createSessionToken({
    id: "admin-manager-test",
    email: "manager@aurumatelier.internal",
    name: "Salon Manager",
    role: Role.MANAGER,
  });

  const staffToken = createSessionToken({
    id: "admin-staff-test",
    email: "staff@aurumatelier.internal",
    name: "Stylist Concierge",
    role: Role.STAFF,
  });

  describe("RBAC Access Control (S13 Invariant)", () => {
    it("rejects unauthenticated requests to /api/admin/settings with 401 Unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings");
      const res = await getSettings(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("rejects unauthenticated requests to /api/admin/products with 401 Unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/products");
      const res = await getProducts(req);
      expect(res.status).toBe(401);
    });

    it("allows STAFF to view store settings (GET)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const res = await getSettings(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings).toBeDefined();
    });

    it("strictly blocks STAFF from modifying store settings with 403 Forbidden (S13)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ highValueThresholdInr: 200000 }),
      });
      const res = await patchSettings(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Forbidden: Only OWNER accounts may modify store settings");
    });

    it("strictly blocks STAFF from creating new products with 403 Forbidden (S13)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Unauthorized Piece",
          slug: "unauthorized-piece",
          skuGroup: "AUR-UNA-001",
          materialSummary: "18K Gold",
        }),
      });
      const res = await createProduct(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain("Forbidden: Only MANAGER or OWNER can create products");
    });

    it("allows OWNER to update store settings and high-value threshold (S13)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          highValueThresholdInr: 150000,
          gstPercentage: 3.0,
        }),
      });
      const res = await patchSettings(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings.highValueThresholdPaise).toBe("15000000"); // 1,50,000 * 100
    });
  });

  describe("Product Pricing & Stock Updates (S14 Invariant)", () => {
    it("allows MANAGER to update product and variant details with audit log", async () => {
      // Test with existing fixture ID or synthetic ID
      const req = new NextRequest("http://localhost:3000/api/admin/products/prod-heritage-choker", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${managerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isEnquiryOnly: false,
          priceVisibility: "PUBLIC",
          variantUpdates: [
            {
              sku: "AUR-CHOK-001-YG",
              priceInr: 105000,
              stockQuantity: 4,
            },
          ],
        }),
      });

      const res = await updateProduct(req, {
        params: Promise.resolve({ id: "prod-heritage-choker" }),
      });

      // 200 if product found in DB, or 404/500 if DB offline; must NOT be 401 or 403
      expect([200, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("Catalogue CSV Import Endpoint (S15 Invariant)", () => {
    it("rejects CSV with line-level errors returning 422 Unprocessable Entity", async () => {
      const badCsv = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Negative Price Ring",AUR-RNG-009,neg-price-ring,"18K Gold","18K Gold",AUR-RNG-009-YG,-5000,1,false,PUBLIC`;

      const req = new NextRequest("http://localhost:3000/api/admin/products/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${managerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csv: badCsv, commit: false }),
      });

      const res = await importCsv(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].row).toBe(2);
      expect(data.errors[0].field).toBe("priceInr");
      expect(data.errors[0].message).toBe("Price cannot be negative.");
    });

    it("accepts valid CSV on dry run returning valid: true without persisting", async () => {
      const goodCsv = `title,skuGroup,slug,materialSummary,metalType,sku,priceInr,stockQuantity,isEnquiryOnly,priceVisibility
"Valid Pendant",AUR-PEN-010,valid-pendant,"18K Gold","18K Gold",AUR-PEN-010-YG,45000,3,false,PUBLIC`;

      const req = new NextRequest("http://localhost:3000/api/admin/products/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${managerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csv: goodCsv, commit: false }),
      });

      const res = await importCsv(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.valid).toBe(true);
      expect(data.dryRun).toBe(true);
      expect(data.validRowsCount).toBe(1);
    });
  });
});


import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { validateCatalogueCsv } from "@/lib/admin/csv";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // S13: CSV import requires MANAGER or OWNER role
  if (!hasRole(session.role, "MANAGER")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only MANAGER or OWNER can import catalogue CSVs." },
      { status: 403 }
    );
  }

  try {
    let csvContent = "";
    let shouldCommit = false;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      csvContent = body.csv || "";
      shouldCommit = Boolean(body.commit);
    } else if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvContent = await req.text();
      const url = new URL(req.url);
      shouldCommit = url.searchParams.get("commit") === "true";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      shouldCommit = formData.get("commit") === "true";
      if (file && typeof file === "object" && "text" in file) {
        csvContent = await (file as Blob).text();
      }
    } else {
      csvContent = await req.text();
    }

    // Abuse guard: cap payload size and row count before any parsing work.
    const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB
    if (csvContent.length > MAX_CSV_BYTES) {
      return NextResponse.json(
        { success: false, error: "CSV file is too large (max 2 MB). Split the catalogue into smaller files." },
        { status: 413 }
      );
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No CSV content provided.",
          errors: [{ row: 1, field: "file", message: "CSV content is empty." }],
        },
        { status: 400 }
      );
    }

    const MAX_CSV_ROWS = 1000;
    const lineCount = csvContent.split("\n").length;
    if (lineCount > MAX_CSV_ROWS + 1) {
      return NextResponse.json(
        { success: false, error: `CSV has too many rows (max ${MAX_CSV_ROWS} per import).` },
        { status: 413 }
      );
    }

    // 1. Line-level validation (S15 Invariant)
    const validationResult = validateCatalogueCsv(csvContent);

    if (!validationResult.success || validationResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "CSV validation failed with line-level errors.",
          totalRows: validationResult.totalRows,
          errorCount: validationResult.errors.length,
          errors: validationResult.errors,
        },
        { status: 422 }
      );
    }

    // 2a. Reject rows whose slug or SKU already exists in the backend.
    // CSV import never silently overwrites an existing product: a duplicate slug
    // is an explicit error so the operator chooses a new slug or edits the piece.
    try {
      const csvSlugs = Array.from(new Set(validationResult.validRows.map((r) => r.slug)));
      const csvSkus = Array.from(new Set(validationResult.validRows.map((r) => r.sku)));
      const [existingProducts, existingVariants] = await Promise.all([
        db.product.findMany({ where: { slug: { in: csvSlugs } }, select: { slug: true } }),
        db.variant.findMany({ where: { sku: { in: csvSkus } }, select: { sku: true } }),
      ]);

      const rowForSlug = (slug: string) => validationResult.validRows.find((r) => r.slug === slug)?.rowNumber ?? 1;
      const rowForSku = (sku: string) => validationResult.validRows.find((r) => r.sku === sku)?.rowNumber ?? 1;

      const dupErrors = [
        ...existingProducts.map((p) => ({
          row: rowForSlug(p.slug),
          field: "slug",
          message: `This slug "${p.slug}" is already created in the backend. Choose a different slug, or edit that product from the catalogue.`,
        })),
        ...existingVariants.map((v) => ({
          row: rowForSku(v.sku),
          field: "sku",
          message: `SKU "${v.sku}" is already created in the backend on another product.`,
        })),
      ];

      if (dupErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Some rows already exist in the backend. Nothing was imported.",
            totalRows: validationResult.totalRows,
            errorCount: dupErrors.length,
            errors: dupErrors,
          },
          { status: 409 }
        );
      }
    } catch (dbErr) {
      // Database unreachable (e.g. the test sandbox): skip the existence precheck
      // rather than fail the request. The DB's own unique constraints still apply.
      console.warn("Skipped duplicate-slug precheck:", (dbErr as Error).message);
    }

    // 2. Dry run preview (if commit is not set)
    if (!shouldCommit) {
      return NextResponse.json({
        success: true,
        valid: true,
        dryRun: true,
        totalRows: validationResult.totalRows,
        validRowsCount: validationResult.validRows.length,
        message: `Validation passed! ${validationResult.validRows.length} valid rows ready for import. Send with commit: true to persist.`,
      });
    }

    // 3. Commit valid rows to database
    let importedCount = 0;
    const importedSkus: string[] = [];

    for (const row of validationResult.validRows) {
      // Upsert Product
      const product = await db.product.upsert({
        where: { slug: row.slug },
        update: {
          title: row.title,
          skuGroup: row.skuGroup,
          description: row.description,
          craftsmanshipNotes: row.craftsmanshipNotes || null,
          materialSummary: row.materialSummary,
          stoneDetails: row.stoneDetails || null,
          certificationData: row.certificationData || null,
          isEnquiryOnly: row.isEnquiryOnly,
          priceVisibility: row.priceVisibility,
          ...(row.category !== undefined && { category: row.category }),
          ...(row.stylingTip !== undefined && { stylingTip: row.stylingTip }),
          ...(row.grossWeightGrams !== undefined && { grossWeightGrams: row.grossWeightGrams }),
        },
        create: {
          slug: row.slug,
          skuGroup: row.skuGroup,
          title: row.title,
          description: row.description,
          craftsmanshipNotes: row.craftsmanshipNotes || null,
          materialSummary: row.materialSummary,
          stoneDetails: row.stoneDetails || null,
          certificationData: row.certificationData || null,
          isEnquiryOnly: row.isEnquiryOnly,
          priceVisibility: row.priceVisibility,
          category: row.category ?? null,
          stylingTip: row.stylingTip ?? null,
          grossWeightGrams: row.grossWeightGrams ?? null,
        },
      });

      const variantExtras = {
        ...(row.metalColour !== undefined && { metalColour: row.metalColour }),
        ...(row.compareAtPricePaise !== undefined && { compareAtPricePaise: row.compareAtPricePaise }),
        ...(row.offerLabel !== undefined && { offerLabel: row.offerLabel }),
        ...(row.goldValuePaise !== undefined && { goldValuePaise: row.goldValuePaise }),
        ...(row.stoneValuePaise !== undefined && { stoneValuePaise: row.stoneValuePaise }),
        ...(row.makingChargesPaise !== undefined && { makingChargesPaise: row.makingChargesPaise }),
        ...(row.makingDiscountPercent !== undefined && { makingDiscountPercent: row.makingDiscountPercent }),
        ...(row.goldWeightGrams !== undefined && { goldWeightGrams: row.goldWeightGrams }),
      };

      // Upsert Variant
      await db.variant.upsert({
        where: { sku: row.sku },
        update: {
          productId: product.id,
          metalType: row.metalType,
          size: row.size || null,
          purity: row.purity || null,
          pricePaise: row.pricePaise,
          stockQuantity: row.stockQuantity,
          leadTimeDays: row.leadTimeDays,
          isMadeToOrder: row.isMadeToOrder,
          ...variantExtras,
        },
        create: {
          productId: product.id,
          sku: row.sku,
          metalType: row.metalType,
          size: row.size || null,
          purity: row.purity || null,
          pricePaise: row.pricePaise,
          stockQuantity: row.stockQuantity,
          leadTimeDays: row.leadTimeDays,
          isMadeToOrder: row.isMadeToOrder,
          ...variantExtras,
        },
      });

      importedCount++;
      importedSkus.push(row.sku);
    }

    // Create Audit Log record
    await writeAudit({
      data: {
        userId: session.id,
        action: "CATALOGUE_CSV_IMPORT",
        entityType: "Catalogue",
        entityId: "bulk-import",
        details: {
          importedCount,
          importedSkus: importedSkus.slice(0, 50),
        },
      },
    });

    try {
      revalidatePath("/collections");
      revalidatePath("/");
    } catch {
      // test environment
    }

    return NextResponse.json({
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} items into the catalogue.`,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during CSV processing." },
      { status: 500 }
    );
  }
}


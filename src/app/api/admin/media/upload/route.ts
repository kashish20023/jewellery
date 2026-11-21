import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasRole } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, saveUpload, sniffImageType, storageStatus } from "@/lib/admin/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET: tells the admin UI where uploads go and whether that is durable. */
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, storage: storageStatus(), maxBytes: MAX_UPLOAD_BYTES, types: Object.keys(ALLOWED_IMAGE_TYPES) });
}

/**
 * POST multipart/form-data: file=<image>, productSlug=<slug>
 * MANAGER+ only. Validates declared type, sniffed magic bytes and size.
 * Returns the public URL; the caller attaches it to the product's media set.
 */
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!hasRole(session.role, "MANAGER")) {
    return NextResponse.json({ success: false, error: "Forbidden: Only MANAGER or OWNER can upload photography." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  const productSlug = String(form.get("productSlug") || "").trim();
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "No file received." }, { status: 400 });
  if (!productSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
    return NextResponse.json({ success: false, error: "A valid productSlug is required." }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ success: false, error: "The file is empty." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ success: false, error: `File is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` }, { status: 413 });
  }
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return NextResponse.json({ success: false, error: "Only JPEG, PNG, WebP or AVIF images are accepted." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  if (!sniffed || sniffed !== file.type) {
    return NextResponse.json({ success: false, error: "The file content does not match its image type." }, { status: 415 });
  }

  try {
    const saved = await saveUpload({ buffer, contentType: sniffed, productSlug });
    await writeAudit({
      data: {
        userId: session.id,
        action: "MEDIA_UPLOAD",
        entityType: "Product",
        entityId: productSlug,
        details: { key: saved.key, bytes: saved.bytes, contentType: saved.contentType, mode: storageStatus().mode },
      },
    }).catch(() => undefined); // audit must never block the upload response
    return NextResponse.json({ success: true, upload: saved, storage: storageStatus() }, { status: 201 });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Upload failed." }, { status: 500 });
  }
}

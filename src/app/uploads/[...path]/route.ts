import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { uploadRoot } from "@/lib/admin/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Serves locally stored product photography (the fallback when no object
 * storage is configured). Paths are confined to the upload root.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const root = path.resolve(uploadRoot());
  const target = path.resolve(root, ...(parts || []));
  if (!target.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const type = CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await fs.readFile(target);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(file.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

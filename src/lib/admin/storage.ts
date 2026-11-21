/**
 * Product photography storage.
 *
 * - When STORAGE_ENDPOINT / STORAGE_BUCKET / STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY
 *   are set, files go to S3-compatible object storage (AWS S3, Cloudflare R2, MinIO)
 *   and the public URL is built from STORAGE_PUBLIC_URL.
 * - Otherwise files are written under <project>/uploads (or UPLOAD_DIR) and served
 *   by the /uploads/[...path] route handler. Fine for local development and a
 *   single VPS; not durable on serverless hosts, which `storageStatus()` reports.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Magic-number sniffing so a renamed file cannot pass as an image. */
export function sniffImageType(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 12).includes("ftypavif") || ascii(4, 12).includes("ftypavis")) return "image/avif";
  return null;
}

export interface StorageStatus {
  mode: "object-storage" | "local";
  configured: boolean;
  durable: boolean;
  note: string;
}

export function storageStatus(): StorageStatus {
  const { STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_PUBLIC_URL } = process.env;
  const configured = Boolean(STORAGE_ENDPOINT && STORAGE_BUCKET && STORAGE_ACCESS_KEY && STORAGE_SECRET_KEY);
  if (configured) {
    return {
      mode: "object-storage",
      configured: true,
      durable: true,
      note: STORAGE_PUBLIC_URL
        ? `Uploads go to bucket "${STORAGE_BUCKET}" and are served from ${STORAGE_PUBLIC_URL}.`
        : `Uploads go to bucket "${STORAGE_BUCKET}". Set STORAGE_PUBLIC_URL so the storefront can load them.`,
    };
  }
  return {
    mode: "local",
    configured: false,
    durable: false,
    note: "Object storage is not configured. Uploads are saved on this server (uploads/ folder) and served at /uploads; set STORAGE_* in .env for durable storage before launch.",
  };
}

/**
 * S3 needs a real region; R2 accepts "auto". Derive it from the endpoint when
 * STORAGE_REGION is not set, e.g. https://s3.ap-south-1.amazonaws.com → ap-south-1.
 */
export function resolveRegion(endpoint: string, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const host = (() => {
    try {
      return new URL(endpoint).hostname;
    } catch {
      return endpoint;
    }
  })();
  if (/r2\.cloudflarestorage\.com$/i.test(host)) return "auto";
  const m = host.match(/s3[.-]([a-z]{2}-[a-z]+-\d)\.amazonaws\.com$/i);
  if (m) return m[1];
  return "us-east-1";
}

/** Local upload root (outside public/, so new files are served without a rebuild). */
export function uploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export interface SavedUpload {
  url: string;
  key: string;
  bytes: number;
  contentType: string;
}

function makeKey(productSlug: string, ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `products/${productSlug}/${stamp}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
}

export async function saveUpload(input: {
  buffer: Buffer;
  contentType: string;
  productSlug: string;
}): Promise<SavedUpload> {
  const ext = ALLOWED_IMAGE_TYPES[input.contentType];
  if (!ext) throw new Error("Unsupported image type.");
  if (input.buffer.length > MAX_UPLOAD_BYTES) throw new Error("File is larger than 8 MB.");
  const key = makeKey(input.productSlug.replace(/[^a-z0-9-]/gi, "-"), ext);
  const status = storageStatus();

  if (status.mode === "object-storage") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: resolveRegion(process.env.STORAGE_ENDPOINT!, process.env.STORAGE_REGION),
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET!,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    const base = (process.env.STORAGE_PUBLIC_URL || `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}`).replace(/\/$/, "");
    return { url: `${base}/${key}`, key, bytes: input.buffer.length, contentType: input.contentType };
  }

  const root = uploadRoot();
  const target = path.join(root, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, input.buffer);
  return { url: `/uploads/${key}`, key, bytes: input.buffer.length, contentType: input.contentType };
}

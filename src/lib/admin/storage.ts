/**
 * Product photography storage.
 *
 * Three modes, picked in this order from the environment:
 * - When CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are
 *   set, files go to Cloudinary via a signed upload and are served from
 *   res.cloudinary.com. This is the hosted (Vercel) default.
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
  mode: "cloudinary" | "object-storage" | "local";
  configured: boolean;
  durable: boolean;
  note: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Top-level Cloudinary folder every key is nested under. */
  folder: string;
}

/** Returns the Cloudinary credentials, or null when they are not fully set. */
export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  const folder = (process.env.CLOUDINARY_FOLDER?.trim() || "chudiwalas").replace(/^\/+|\/+$/g, "");
  return { cloudName, apiKey, apiSecret, folder };
}

export function storageStatus(): StorageStatus {
  const cloudinary = cloudinaryConfig();
  if (cloudinary) {
    return {
      mode: "cloudinary",
      configured: true,
      durable: true,
      note: `Uploads go to Cloudinary cloud "${cloudinary.cloudName}" under the "${cloudinary.folder}/" folder and are served from res.cloudinary.com.`,
    };
  }

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
    note: "Durable storage is not configured. Uploads are saved on this server (uploads/ folder) and served at /uploads; set CLOUDINARY_* (or STORAGE_*) in .env for durable storage before launch.",
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

/**
 * Cloudinary's signed-upload signature: SHA-1 over the signable params sorted by
 * key as `k=v&k=v`, with the API secret appended. `file`, `api_key`,
 * `cloud_name` and `resource_type` are never signed.
 * https://cloudinary.com/documentation/authentication_signatures
 */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const unsigned = new Set(["file", "api_key", "cloud_name", "resource_type", "signature"]);
  const payload = Object.keys(params)
    .filter((k) => !unsigned.has(k) && params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  width?: number;
  height?: number;
}

/**
 * Uploads to Cloudinary. `file` is either the image bytes or a remote URL that
 * Cloudinary fetches itself (used by the media migration script).
 * `publicId` must not carry a file extension — Cloudinary appends the format.
 */
export async function cloudinaryUpload(input: {
  file: Buffer | string;
  publicId: string;
  contentType?: string;
  overwrite?: boolean;
  config?: CloudinaryConfig;
}): Promise<CloudinaryUploadResult> {
  const config = input.config ?? cloudinaryConfig();
  if (!config) throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).");

  const signable: Record<string, string | number> = {
    public_id: input.publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };
  if (input.overwrite) {
    signable.overwrite = "true";
    signable.invalidate = "true";
  }

  const form = new FormData();
  if (typeof input.file === "string") {
    form.append("file", input.file);
  } else {
    const bytes = new Uint8Array(input.file);
    form.append("file", new Blob([bytes], { type: input.contentType || "application/octet-stream" }), "upload");
  }
  for (const [key, value] of Object.entries(signable)) form.append(key, String(value));
  form.append("api_key", config.apiKey);
  form.append("signature", signCloudinaryParams(signable, config.apiSecret));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  let body: { secure_url?: string; public_id?: string; bytes?: number; format?: string; width?: number; height?: number; error?: { message?: string } } = {};
  try {
    body = JSON.parse(text);
  } catch {
    // fall through to the status-based error below
  }
  if (!res.ok || !body.secure_url) {
    throw new Error(`Cloudinary upload failed (${res.status}): ${body.error?.message || text.slice(0, 200)}`);
  }
  return {
    url: body.secure_url,
    publicId: body.public_id || input.publicId,
    bytes: body.bytes ?? 0,
    format: body.format || "",
    width: body.width,
    height: body.height,
  };
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

  if (status.mode === "cloudinary") {
    const config = cloudinaryConfig()!;
    // Cloudinary derives the extension from the bytes, so the key is sent without one.
    const publicId = `${config.folder}/${key.replace(/\.[^.]+$/, "")}`;
    const result = await cloudinaryUpload({ file: input.buffer, publicId, contentType: input.contentType, config });
    return {
      url: result.url,
      key: result.publicId,
      bytes: result.bytes || input.buffer.length,
      contentType: input.contentType,
    };
  }

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

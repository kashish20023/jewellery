import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { cloudinaryConfig, cloudinaryUpload, saveUpload, signCloudinaryParams, storageStatus } from "@/lib/admin/storage";

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const CLOUDINARY_KEYS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_FOLDER"] as const;
const S3_KEYS = ["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY", "STORAGE_PUBLIC_URL"] as const;

function configure() {
  process.env.CLOUDINARY_CLOUD_NAME = "chudiwalas-test";
  process.env.CLOUDINARY_API_KEY = "123456789012345";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
  process.env.CLOUDINARY_FOLDER = "chudiwalas";
}

/** Captures the single Cloudinary request and replies with a realistic payload. */
function stubFetch(overrides: Partial<{ ok: boolean; status: number; body: unknown }> = {}) {
  const calls: Array<{ url: string; form: FormData }> = [];
  const spy = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), form: init?.body as FormData });
    const body = overrides.body ?? {
      secure_url: "https://res.cloudinary.com/chudiwalas-test/image/upload/v1/chudiwalas/products/test/x.png",
      public_id: "chudiwalas/products/test/x",
      bytes: PNG.length,
      format: "png",
      width: 1,
      height: 1,
    };
    return new Response(JSON.stringify(body), { status: overrides.status ?? 200 });
  });
  vi.stubGlobal("fetch", spy);
  return calls;
}

beforeEach(() => {
  for (const key of [...CLOUDINARY_KEYS, ...S3_KEYS]) delete process.env[key];
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of [...CLOUDINARY_KEYS, ...S3_KEYS]) delete process.env[key];
});

describe("Cloudinary storage mode", () => {
  it("is not configured until all three credentials are present", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "chudiwalas-test";
    process.env.CLOUDINARY_API_KEY = "123";
    expect(cloudinaryConfig()).toBeNull();
    expect(storageStatus().mode).toBe("local");
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    expect(cloudinaryConfig()).toMatchObject({ cloudName: "chudiwalas-test", folder: "chudiwalas" });
  });

  it("reports a durable cloudinary mode and outranks STORAGE_* when both are set", () => {
    configure();
    process.env.STORAGE_ENDPOINT = "https://s3.ap-south-1.amazonaws.com";
    process.env.STORAGE_BUCKET = "bucket";
    process.env.STORAGE_ACCESS_KEY = "ak";
    process.env.STORAGE_SECRET_KEY = "sk";
    const status = storageStatus();
    expect(status.mode).toBe("cloudinary");
    expect(status.durable).toBe(true);
    expect(status.note).toContain("chudiwalas-test");
  });

  it("signs params as sha1 of the sorted pairs plus the secret, never signing file or api_key", () => {
    const signed = signCloudinaryParams({ timestamp: 1315060076, public_id: "sample_image" }, "abcd");
    expect(signed).toBe(crypto.createHash("sha1").update("public_id=sample_image&timestamp=1315060076abcd").digest("hex"));

    const withNoise = signCloudinaryParams(
      { timestamp: 1315060076, public_id: "sample_image", file: "ignored", api_key: "ignored", cloud_name: "ignored" },
      "abcd"
    );
    expect(withNoise).toBe(signed);
  });

  it("uploads bytes with a signed request and returns the secure URL", async () => {
    configure();
    const calls = stubFetch();
    const saved = await saveUpload({ buffer: PNG, contentType: "image/png", productSlug: "polki-choker-suite" });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.cloudinary.com/v1_1/chudiwalas-test/image/upload");
    const form = calls[0].form;
    expect(form.get("api_key")).toBe("123456789012345");
    expect(String(form.get("signature"))).toMatch(/^[0-9a-f]{40}$/);
    // Cloudinary derives the extension itself, so the public ID carries none.
    const publicId = String(form.get("public_id"));
    expect(publicId).toMatch(/^chudiwalas\/products\/polki-choker-suite\/\d{8}-[0-9a-f]{8}$/);
    expect(publicId.endsWith(".png")).toBe(false);
    // The signature must cover exactly the params that were sent.
    expect(form.get("signature")).toBe(
      signCloudinaryParams({ public_id: publicId, timestamp: Number(form.get("timestamp")) }, "test-secret")
    );

    expect(saved.url).toBe("https://res.cloudinary.com/chudiwalas-test/image/upload/v1/chudiwalas/products/test/x.png");
    expect(saved.key).toBe("chudiwalas/products/test/x");
    expect(saved.contentType).toBe("image/png");
  });

  it("surfaces Cloudinary's error message instead of a silent success", async () => {
    configure();
    stubFetch({ status: 401, body: { error: { message: "Invalid Signature" } } });
    await expect(saveUpload({ buffer: PNG, contentType: "image/png", productSlug: "polki-choker-suite" })).rejects.toThrow(
      /Cloudinary upload failed \(401\): Invalid Signature/
    );
  });

  it("refuses to upload when credentials are missing", async () => {
    await expect(cloudinaryUpload({ file: PNG, publicId: "x" })).rejects.toThrow(/Cloudinary is not configured/);
  });
});

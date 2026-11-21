import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST as upload, GET as status } from "@/app/api/admin/media/upload/route";
import { createSessionToken, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";
import { sniffImageType, resolveRegion } from "@/lib/admin/storage";

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

function request(role: "OWNER" | "MANAGER" | "STAFF", form: FormData | null) {
  const token = createSessionToken({ id: `test-${role.toLowerCase()}`, email: `${role.toLowerCase()}@test.internal`, name: role, role });
  const headers: Record<string, string> = { cookie: `${ADMIN_COOKIE_NAME}=${token}` };
  return new NextRequest("http://localhost:3000/api/admin/media/upload", { method: "POST", headers, body: form ?? undefined });
}

function formWith(file: Blob, name: string, slug = "solitaire-diamond-pendant-18k") {
  const f = new FormData();
  f.append("file", file, name);
  f.append("productSlug", slug);
  return f;
}

let tmp: string;
beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chudiwalas-upload-"));
  process.env.UPLOAD_DIR = tmp;
  delete process.env.STORAGE_ENDPOINT;
});
afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

describe("Admin photography upload (/api/admin/media/upload)", () => {
  it("reports local, non-durable storage when STORAGE_* is unset", async () => {
    const token = createSessionToken({ id: "t", email: "t@test.internal", name: "T", role: "STAFF" });
    const res = await status(new NextRequest("http://localhost:3000/api/admin/media/upload", { headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` } }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.storage.mode).toBe("local");
    expect(data.storage.durable).toBe(false);
  });

  it("rejects anonymous and STAFF uploads", async () => {
    const anon = await upload(new NextRequest("http://localhost:3000/api/admin/media/upload", { method: "POST" }));
    expect(anon.status).toBe(401);
    const staff = await upload(request("STAFF", formWith(new Blob([PNG], { type: "image/png" }), "a.png")));
    expect(staff.status).toBe(403);
  });

  it("rejects non-image types, spoofed types and oversized files", async () => {
    const text = await upload(request("MANAGER", formWith(new Blob(["hello"], { type: "text/plain" }), "a.txt")));
    expect(text.status).toBe(415);

    const spoofed = await upload(request("MANAGER", formWith(new Blob(["not really a png"], { type: "image/png" }), "a.png")));
    expect(spoofed.status).toBe(415);

    const big = new Uint8Array(8 * 1024 * 1024 + 1);
    big.set(PNG.subarray(0, 8));
    const oversized = await upload(request("MANAGER", formWith(new Blob([big], { type: "image/png" }), "big.png")));
    expect(oversized.status).toBe(413);
  });

  it("stores a valid image for a MANAGER and returns a public URL under the product folder", async () => {
    const res = await upload(request("MANAGER", formWith(new Blob([PNG], { type: "image/png" }), "pendant.png")));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.upload.url).toMatch(/^\/uploads\/products\/solitaire-diamond-pendant-18k\/\d{8}-[0-9a-f]{8}\.png$/);
    const onDisk = await fs.readFile(path.join(tmp, data.upload.key));
    expect(onDisk.equals(PNG)).toBe(true);
  });

  it("derives the S3 region from the endpoint when STORAGE_REGION is unset", () => {
    expect(resolveRegion("https://s3.ap-south-1.amazonaws.com")).toBe("ap-south-1");
    expect(resolveRegion("https://abc123.r2.cloudflarestorage.com")).toBe("auto");
    expect(resolveRegion("https://s3.amazonaws.com")).toBe("us-east-1");
    expect(resolveRegion("https://minio.local:9000", "eu-central-1")).toBe("eu-central-1");
  });

  it("sniffs image magic numbers", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(Buffer.from("GIF89a..........", "ascii"))).toBeNull();
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as serveUpload } from "@/app/uploads/[...path]/route";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
let tmp: string;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chudiwalas-serve-"));
  process.env.UPLOAD_DIR = tmp;
  await fs.mkdir(path.join(tmp, "products", "pendant"), { recursive: true });
  await fs.writeFile(path.join(tmp, "products", "pendant", "a.png"), PNG);
  await fs.writeFile(path.join(tmp, "secret.txt"), "nope");
});
afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
  delete process.env.UPLOAD_DIR;
});

const get = (parts: string[]) => serveUpload(new NextRequest("http://localhost:3000/uploads/" + parts.join("/")), { params: Promise.resolve({ path: parts }) });

describe("Local upload serving (/uploads/[...path])", () => {
  it("serves an uploaded image with its content type and immutable caching", async () => {
    const res = await get(["products", "pendant", "a.png"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it("returns 404 for missing files, non-image files and path traversal", async () => {
    expect((await get(["products", "pendant", "missing.png"])).status).toBe(404);
    expect((await get(["secret.txt"])).status).toBe(404);
    expect((await get(["..", "..", "etc", "passwd"])).status).toBe(404);
  });
});

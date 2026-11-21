/**
 * Pushes every storefront image into Cloudinary once, then (optionally) rewrites
 * the source references so the site serves them from the CDN.
 *
 * Usage:
 *   pnpm media:cloudinary --dry-run     # list what would be uploaded, upload nothing
 *   pnpm media:cloudinary               # upload + write docs/cloudinary-media-manifest.json
 *   pnpm media:cloudinary --rewrite     # upload, then point catalogue/product refs at Cloudinary
 *
 * What gets uploaded:
 *   - every image under public/ (product shots, the damask tile, brand marks)
 *   - every remote catalogue image referenced by src/lib/fixtures/*.ts, fetched
 *     by Cloudinary directly from its URL
 *
 * What --rewrite touches: every raster image (products, catalogue, brand PNGs, the
 * damask tile). SVG crests are uploaded as CDN copies but keep their local
 * references: next/image refuses remote SVG unless `dangerouslyAllowSVG` is on, and
 * some Cloudinary accounts restrict SVG delivery outright.
 *
 * Re-running is safe: public IDs are deterministic and uploads overwrite in place.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { cloudinaryConfig, cloudinaryUpload } from "../src/lib/admin/storage";

try {
  // Node >= 20.12 reads .env for us; ignore when the file is absent.
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.(".env");
} catch {
  /* no .env on disk — rely on the ambient environment */
}

const DRY_RUN = process.argv.includes("--dry-run");
const REWRITE = process.argv.includes("--rewrite");

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const FIXTURE_DIR = path.join(ROOT, "src", "lib", "fixtures");
const MANIFEST = path.join(ROOT, "docs", "cloudinary-media-manifest.json");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

interface Target {
  /** How the codebase refers to this image today. */
  source: string;
  kind: "local" | "remote";
  /** Cloudinary public ID, without a file extension. */
  publicId: string;
  /** Width requested by the original reference, preserved as a transformation. */
  width?: number;
  /** Whether --rewrite should repoint this reference. */
  rewritable: boolean;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/** Strips the extension and normalises a path into a safe Cloudinary public ID. */
function toPublicId(folder: string, parts: string[]): string {
  const cleaned = parts
    .join("/")
    .replace(/\.[^./]+$/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-");
  return `${folder}/${cleaned}`;
}

async function collectLocal(folder: string): Promise<Target[]> {
  const files = await walk(PUBLIC_DIR);
  return files
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => {
      const rel = path.relative(PUBLIC_DIR, f);
      const source = `/${rel.split(path.sep).join("/")}`;
      return {
        source,
        kind: "local" as const,
        publicId: toPublicId(folder, ["site", ...rel.split(path.sep)]),
        rewritable: path.extname(source).toLowerCase() !== ".svg",
      };
    })
    .sort((a, b) => a.source.localeCompare(b.source));
}

async function collectRemote(folder: string): Promise<Target[]> {
  const files = (await fs.readdir(FIXTURE_DIR)).filter((f) => f.endsWith(".ts"));
  const found = new Map<string, Target>();
  for (const file of files) {
    const text = await fs.readFile(path.join(FIXTURE_DIR, file), "utf8");
    for (const match of text.matchAll(/https:\/\/images\.unsplash\.com\/[^"'`\s]+/g)) {
      const source = match[0];
      if (found.has(source)) continue;
      const url = new URL(source);
      // photo-1599643478518-a784e5dc4c8f → stable asset identity across widths
      const photoId = url.pathname.replace(/^\//, "").replace(/\.[^./]+$/, "");
      const width = Number(url.searchParams.get("w")) || undefined;
      found.set(source, {
        source,
        kind: "remote",
        publicId: toPublicId(folder, ["catalogue", photoId]),
        width,
        rewritable: true,
      });
    }
  }
  return [...found.values()].sort((a, b) => a.source.localeCompare(b.source));
}

/** Inserts f_auto,q_auto (and the original width) into a Cloudinary delivery URL. */
function deliveryUrl(secureUrl: string, width?: number): string {
  const transform = ["f_auto", "q_auto", ...(width ? [`w_${width}`] : [])].join(",");
  return secureUrl.replace("/image/upload/", `/image/upload/${transform}/`);
}

async function rewriteReferences(map: Map<string, string>): Promise<string[]> {
  const files = (await walk(path.join(ROOT, "src"))).filter((f) => /\.(ts|tsx)$/.test(f));
  const touched: string[] = [];
  // `src/lib/seo.ts` builds absolute URLs as `${SITE_URL}/brand/x.png`; a Cloudinary
  // URL is already absolute, so that prefix has to go with the path it decorated.
  const expanded = new Map(map);
  for (const [source, target] of map) {
    if (source.startsWith("/")) expanded.set("${SITE_URL}" + source, target);
  }
  // One pass over the file, longest source first. Sequential replaces would corrupt
  // the output: a Cloudinary target ends in the very path it replaced, so a later
  // source would match inside a URL this run just inserted.
  const sources = [...expanded.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(sources.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  for (const file of files) {
    const before = await fs.readFile(file, "utf8");
    const after = before.replace(pattern, (match) => expanded.get(match) ?? match);
    if (after !== before) {
      await fs.writeFile(file, after);
      touched.push(path.relative(ROOT, file));
    }
  }
  return touched;
}

async function main() {
  const config = cloudinaryConfig();
  if (!config) {
    console.error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and\n" +
        "CLOUDINARY_API_SECRET to .env (see .env.example), then re-run this script."
    );
    process.exit(1);
  }

  const targets = [...(await collectLocal(config.folder)), ...(await collectRemote(config.folder))];
  const rewritable = targets.filter((t) => t.rewritable).length;
  console.log(`Cloud: ${config.cloudName}   folder: ${config.folder}/`);
  console.log(`${targets.length} images to upload (${rewritable} of them rewritable in source).\n`);

  if (DRY_RUN) {
    for (const t of targets) console.log(`  ${t.kind.padEnd(6)} ${t.source}\n         -> ${t.publicId}${t.rewritable ? "" : "   (reference kept local)"}`);
    console.log("\nDry run — nothing uploaded.");
    return;
  }

  const manifest: Array<Record<string, unknown>> = [];
  const rewriteMap = new Map<string, string>();
  let failed = 0;
  let permissionDenied = false;

  for (const t of targets) {
    try {
      const file = t.kind === "local" ? await fs.readFile(path.join(PUBLIC_DIR, t.source.replace(/^\//, ""))) : t.source;
      const contentType = t.kind === "local" ? CONTENT_TYPES[path.extname(t.source).toLowerCase()] : undefined;
      const result = await cloudinaryUpload({ file, publicId: t.publicId, contentType, overwrite: true, config });
      // Remote catalogue art keeps its requested width as a transformation. Local
      // assets stay untransformed: one is a Tailwind arbitrary `bg-[url(...)]`
      // value, where the commas of `f_auto,q_auto` would break class parsing.
      const url = t.kind === "remote" ? deliveryUrl(result.url, t.width) : result.url;
      manifest.push({
        source: t.source,
        kind: t.kind,
        publicId: result.publicId,
        url,
        bytes: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
        referenceRewritten: t.rewritable && REWRITE,
      });
      if (t.rewritable) rewriteMap.set(t.source, url);
      console.log(`  ok   ${t.source}  ->  ${url}`);
    } catch (error) {
      failed += 1;
      const message = (error as Error).message;
      if (message.includes("(403)")) permissionDenied = true;
      console.error(`  FAIL ${t.source}: ${message}`);
    }
  }

  if (manifest.length) {
    await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
    await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  }
  console.log(`\n${manifest.length} uploaded, ${failed} failed.${manifest.length ? ` Manifest: ${path.relative(ROOT, MANIFEST)}` : ""}`);

  if (!manifest.length && permissionDenied) {
    console.error(
      "\nEvery upload was refused with 403 (missing permissions). The credentials are\n" +
        "valid but the API key has no write role: Cloudinary creates new keys with no\n" +
        "permissions at all. In Console Settings > API Keys, give this key the Master\n" +
        "Admin (or Media Library User) role, or use the product environment root key,\n" +
        "then re-run. A read-only key can list assets but cannot create them."
    );
  }

  if (REWRITE && rewriteMap.size) {
    const touched = await rewriteReferences(rewriteMap);
    console.log(`Rewrote ${rewriteMap.size} references across ${touched.length} files:`);
    for (const f of touched) console.log(`  ${f}`);
    console.log("\nRun `pnpm test && pnpm build` before committing.");
  } else if (!REWRITE) {
    console.log("Source references unchanged. Re-run with --rewrite to point the catalogue at Cloudinary.");
  }

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Repoints the image URLs stored in the database at Cloudinary.
 *
 * `scripts/upload-media-to-cloudinary.ts` moved the images referenced in source
 * code. The catalogue the storefront actually serves comes from the database, so
 * ProductMedia.url and Collection.bannerImageUrl need the same treatment.
 *
 * Usage:
 *   pnpm media:db --dry-run   # report what would change, touch nothing
 *   pnpm media:db             # upload what is missing, then update the rows
 *
 * Behaviour:
 * - Rows already on res.cloudinary.com are left alone, so re-running is a no-op.
 * - A URL already in docs/cloudinary-media-manifest.json reuses that upload
 *   instead of spending quota on a second copy of the same photo.
 * - Remote URLs are fetched by Cloudinary itself; `/uploads/...` paths are read
 *   from the local upload root and sent as bytes.
 * - A `/uploads/...` row whose file is gone cannot be migrated: it is reported and
 *   left untouched, because guessing a replacement would be worse than a known gap.
 *
 * DATABASE_URL decides which database is touched — check it before running.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { cloudinaryConfig, cloudinaryUpload, uploadRoot } from "../src/lib/admin/storage";

try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.(".env");
} catch {
  /* no .env on disk — rely on the ambient environment */
}

const DRY_RUN = process.argv.includes("--dry-run");
const MANIFEST = path.join(process.cwd(), "docs", "cloudinary-media-manifest.json");

interface Row {
  table: "ProductMedia" | "Collection";
  id: string;
  label: string;
  url: string;
}

/** source URL -> delivery URL, from the earlier source-code migration. */
async function loadManifest(): Promise<Map<string, string>> {
  try {
    const raw = JSON.parse(await fs.readFile(MANIFEST, "utf8")) as Array<{ source?: string; url?: string }>;
    return new Map(raw.filter((e) => e.source && e.url).map((e) => [e.source!, e.url!]));
  } catch {
    return new Map();
  }
}

/** Stable public ID for a database-held image, mirroring the source-code migration. */
function publicIdFor(folder: string, url: string): string {
  const withoutQuery = url.split("?")[0];
  const base = withoutQuery
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^uploads\//, "")
    .replace(/\.[^./]+$/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/^\/+/, "");
  return `${folder}/catalogue/${base}`;
}

function deliveryUrl(secureUrl: string, width?: number): string {
  const transform = ["f_auto", "q_auto", ...(width ? [`w_${width}`] : [])].join(",");
  return secureUrl.replace("/image/upload/", `/image/upload/${transform}/`);
}

async function main() {
  const config = cloudinaryConfig();
  if (!config) {
    console.error("Cloudinary is not configured. Set CLOUDINARY_* in .env (see .env.example).");
    process.exit(1);
  }

  const target = process.env.DATABASE_URL?.replace(/\/\/[^@]*@/, "//***@") ?? "(unset)";
  console.log(`Cloud:    ${config.cloudName}   folder: ${config.folder}/`);
  console.log(`Database: ${target}\n`);

  const [media, collections] = await Promise.all([
    db.productMedia.findMany({ select: { id: true, url: true, altText: true, width: true } }),
    db.collection.findMany({ select: { id: true, slug: true, bannerImageUrl: true } }),
  ]);

  const rows: Row[] = [
    ...media.map((m) => ({ table: "ProductMedia" as const, id: m.id, label: m.altText || m.id, url: m.url })),
    ...collections
      .filter((c) => c.bannerImageUrl)
      .map((c) => ({ table: "Collection" as const, id: c.id, label: c.slug, url: c.bannerImageUrl! })),
  ];

  const widthOf = new Map(media.map((m) => [m.id, m.width ?? undefined]));
  const done = rows.filter((r) => r.url.includes("res.cloudinary.com"));
  const pending = rows.filter((r) => !r.url.includes("res.cloudinary.com"));

  console.log(`${rows.length} image rows: ${done.length} already on Cloudinary, ${pending.length} to migrate.`);
  if (!pending.length) {
    console.log("Nothing to do.");
    return;
  }

  const manifest = await loadManifest();
  const reused = pending.filter((r) => manifest.has(r.url)).length;
  if (reused) console.log(`${reused} of them already exist in the manifest and will be reused.\n`);

  if (DRY_RUN) {
    for (const r of pending) {
      const known = manifest.get(r.url);
      console.log(`  ${r.table.padEnd(12)} ${r.label}\n    ${r.url}\n    -> ${known ?? publicIdFor(config.folder, r.url) + " (new upload)"}`);
    }
    console.log("\nDry run — nothing uploaded, no rows changed.");
    return;
  }

  let updated = 0;
  const failures: string[] = [];

  for (const row of pending) {
    try {
      let url = manifest.get(row.url);
      if (!url) {
        const isLocal = row.url.startsWith("/uploads/");
        let file: Buffer | string;
        if (isLocal) {
          const onDisk = path.join(uploadRoot(), row.url.replace(/^\/uploads\//, ""));
          try {
            file = await fs.readFile(onDisk);
          } catch {
            failures.push(`${row.table} ${row.label}: ${row.url} — file missing at ${onDisk}, row left unchanged`);
            continue;
          }
        } else {
          file = row.url;
        }
        const result = await cloudinaryUpload({ file, publicId: publicIdFor(config.folder, row.url), overwrite: true, config });
        url = deliveryUrl(result.url, row.table === "ProductMedia" ? widthOf.get(row.id) : undefined);
      }

      if (row.table === "ProductMedia") {
        await db.productMedia.update({ where: { id: row.id }, data: { url } });
      } else {
        await db.collection.update({ where: { id: row.id }, data: { bannerImageUrl: url } });
      }
      updated += 1;
      console.log(`  ok   ${row.table} ${row.label}\n       -> ${url}`);
    } catch (error) {
      failures.push(`${row.table} ${row.label}: ${(error as Error).message}`);
      console.error(`  FAIL ${row.table} ${row.label}: ${(error as Error).message}`);
    }
  }

  console.log(`\n${updated} rows updated, ${failures.length} left alone.`);
  if (failures.length) {
    console.log("\nNeeds a human:");
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

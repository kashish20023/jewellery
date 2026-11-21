import { describe, it, expect } from "vitest";
import { rewriteText } from "../../scripts/upload-media-to-cloudinary";

const CDN = "https://res.cloudinary.com/b3ddq6fp/image/upload/v1/chudiwalas/site";

const MAP = new Map([
  ["/brand/wordmark-black.png", `${CDN}/brand/wordmark-black.png`],
  ["/products/polki-drop.webp", `${CDN}/products/polki-drop.webp`],
  [
    "https://images.unsplash.com/photo-1599643478518?q=80&w=800",
    "https://res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_800/v1/chudiwalas/catalogue/photo-1599643478518.jpg",
  ],
]);

describe("media reference rewriting", () => {
  it("repoints a local path and a remote URL", () => {
    expect(rewriteText(`src="/brand/wordmark-black.png"`, MAP)).toBe(`src="${CDN}/brand/wordmark-black.png"`);
    expect(rewriteText(`src="https://images.unsplash.com/photo-1599643478518?q=80&w=800"`, MAP)).toContain(
      "res.cloudinary.com/b3ddq6fp/image/upload/f_auto,q_auto,w_800"
    );
  });

  it("drops the ${SITE_URL} prefix, since a Cloudinary URL is already absolute", () => {
    const before = "logo: `${SITE_URL}/brand/wordmark-black.png`,";
    expect(rewriteText(before, MAP)).toBe(`logo: \`${CDN}/brand/wordmark-black.png\`,`);
  });

  it("leaves an already-migrated URL alone, instead of doubling it", () => {
    // Regression: the path also occurs inside the Cloudinary URL a previous run
    // wrote, which produced ".../site" + a second full URL — a dead 404 link.
    const migrated = `src="${CDN}/brand/wordmark-black.png"`;
    expect(rewriteText(migrated, MAP)).toBe(migrated);

    const mixed = [migrated, `src="/products/polki-drop.webp"`].join("\n");
    const after = rewriteText(mixed, MAP);
    expect(after).toBe([migrated, `src="${CDN}/products/polki-drop.webp"`].join("\n"));
    expect(after).not.toMatch(/https:\/\/res\.cloudinary\.com\/[^"]*https:\/\//);
  });

  it("rewrites every occurrence in one pass without re-entering its own output", () => {
    const before = [`a="/brand/wordmark-black.png"`, `b="/brand/wordmark-black.png"`].join("\n");
    const after = rewriteText(before, MAP);
    expect(after.match(/res\.cloudinary\.com/g)).toHaveLength(2);
    expect(after).not.toMatch(/https:\/\/res\.cloudinary\.com\/[^"]*https:\/\//);
  });

  it("returns the text untouched when there is nothing to map", () => {
    expect(rewriteText(`src="/brand/wordmark-black.png"`, new Map())).toBe(`src="/brand/wordmark-black.png"`);
  });
});

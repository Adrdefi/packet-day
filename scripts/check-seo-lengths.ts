/**
 * Prints the <title> and meta description length for every URL in the
 * sitemap, flagging titles over 70 characters and descriptions outside
 * 120 to 160 (Bing's webmaster guidelines). /terms and /privacy are
 * listed but never flagged.
 *
 * Run it against a local production build (npm run build, then npm start):
 *   npm run script scripts/check-seo-lengths.ts
 *   npm run script scripts/check-seo-lengths.ts -- http://localhost:3001
 *
 * The sitemap always lists production URLs (lib/site.ts's SITE_URL), so each
 * URL's origin is swapped for the base URL before it's fetched. Exits 1 if
 * anything is flagged.
 */

const TITLE_MAX = 70;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;
const IGNORED_PATHS = new Set(["/terms", "/privacy"]);

const baseUrl = (process.argv.slice(2).find((arg) => arg.startsWith("http")) ?? "http://localhost:3000").replace(/\/$/, "");

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function metaContent(html: string, name: string): string | null {
  const tag = html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*>`, "i"))?.[0];
  const content = tag?.match(/content="([^"]*)"/i)?.[1];
  return content === undefined ? null : decodeEntities(content);
}

// Counts characters the way a reader sees them (an emoji is one, not two).
function charLength(text: string | null): number {
  return text === null ? 0 : [...text].length;
}

async function main() {
  const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`);
  if (!sitemapResponse.ok) {
    throw new Error(`Couldn't load ${baseUrl}/sitemap.xml (HTTP ${sitemapResponse.status}). Is the server running?`);
  }
  const sitemap = await sitemapResponse.text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

  const rows: { path: string; titleLength: number; descriptionLength: number; flags: string[] }[] = [];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1]) : null;
    const description = metaContent(html, "description");
    const titleLength = charLength(title);
    const descriptionLength = charLength(description);

    const flags: string[] = [];
    if (!response.ok) flags.push(`HTTP ${response.status}`);
    if (title === null) flags.push("no title");
    else if (titleLength > TITLE_MAX) flags.push(`title > ${TITLE_MAX}`);
    if (description === null) flags.push("no description");
    else if (descriptionLength < DESCRIPTION_MIN || descriptionLength > DESCRIPTION_MAX) {
      flags.push(`description outside ${DESCRIPTION_MIN} to ${DESCRIPTION_MAX}`);
    }

    rows.push({ path, titleLength, descriptionLength, flags: IGNORED_PATHS.has(path) ? [] : flags });
    if (IGNORED_PATHS.has(path) && flags.length > 0) {
      rows[rows.length - 1].flags = [`ignored (${flags.join(", ")})`];
    }
  }

  const pathWidth = Math.max(4, ...rows.map((row) => row.path.length));
  const header = `${"Path".padEnd(pathWidth)}  Title  Desc  Status`;
  console.log(header);
  console.log("-".repeat(header.length + 24));
  let failures = 0;
  for (const row of rows) {
    const failed = row.flags.length > 0 && !row.flags[0].startsWith("ignored");
    if (failed) failures++;
    const status = row.flags.length === 0 ? "ok" : `${failed ? "FAIL: " : ""}${row.flags.join(", ")}`;
    console.log(
      `${row.path.padEnd(pathWidth)}  ${String(row.titleLength).padStart(5)}  ${String(row.descriptionLength).padStart(4)}  ${status}`
    );
  }
  console.log(`\n${rows.length} URLs checked, ${failures} flagged.`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

/**
 * Turns a real packet PDF into the raw material for a unit study page.
 *
 *   npm run ingest-unit-study -- <slug> [pdfPath]    one packet (default packet-inbox/<slug>.pdf)
 *   npm run ingest-unit-study -- --all               every packet-inbox/*.pdf with no extract yet
 *
 * For each PDF it:
 *   1. counts pages and warns loudly outside PAGE_RANGE
 *   2. rasterizes every page to packet-inbox/_pages/<slug>/page-NN.png (gitignored, never public)
 *   3. pulls each page's text in reading order, and its largest-font text as the likely heading
 *   4. suggests a kind per page from the packet's own section labels ("MATH", "PUZZLE BREAK", ...)
 *   5. reads the human layout review (see LAYOUT REVIEW below) and picks 6 to 8 clean gallery
 *      pages, never the parent answer key, copying only those PNGs to
 *      public/unit-studies/<slug>/<kind>.png
 *   6. writes packet-inbox/_extracts/<slug>.extract.json for drafting the page's content file
 *
 * LAYOUT REVIEW. A script can't see a glitch, so a person looks at every page image in
 * packet-inbox/_pages/<slug>/ and records problems in packet-inbox/_reviews/<slug>.layout.json:
 *
 *   { "reviewedOn": "YYYY-MM-DD",
 *     "issues": [ { "page": 8, "what": "...", "severity": "minor" | "bad", "splitWith": 9 } ] }
 *
 * "splitWith" marks an activity split across two pages (the other page's number). Rules:
 *   - a page with any issue is never picked; a "bad" issue also blocks both halves of its split
 *     and the page right before and after it (a minor split blocks only its own page)
 *   - a slot with no clean page is left out; fewer than 6 clean pages, or any "bad" issue, marks
 *     the packet NEEDS REGENERATION and nothing is copied to public/
 *   - with no review file at all, nothing is copied to public/ either
 *
 * No AI calls: everything comes from the PDF itself. Read the extract and look at the chosen
 * PNGs before trusting a pick; low confidence guesses are marked.
 */

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadPdf, rasterizePdf, type PdfDocument, type RasterizedPage } from "./lib/rasterize-pdf";
import { PAGE_RANGE } from "../lib/situations/figures";

const REPO_ROOT = process.cwd();
const INBOX = path.join(REPO_ROOT, "packet-inbox");
const PAGES_DIR = path.join(INBOX, "_pages");
const EXTRACTS_DIR = path.join(INBOX, "_extracts");
const REVIEWS_DIR = path.join(INBOX, "_reviews");
const PUBLIC_DIR = path.join(REPO_ROOT, "public", "unit-studies");

const MIN_GALLERY = 6;

type PageKind =
  | "cover"
  | "certificate"
  | "coloring"
  | "answer-key"
  | "puzzle"
  | "movement"
  | "reading"
  | "math"
  | "science"
  | "other";
type Confidence = "high" | "medium" | "low";

interface TextItem {
  str: string;
  size: number;
  font: string;
  hasEOL: boolean;
}

interface PageInfo {
  number: number;
  heading: string;
  headingFontSize: number;
  /** The packet's own section label for this page, e.g. "MATH" or "PUZZLE BREAK", if any. */
  section: string | null;
  kind: PageKind;
  confidence: Confidence;
  reason: string;
  /** Set when an unlabeled page is read as more of the activity on an earlier page. */
  continuesPage: number | null;
  text: string;
  /** The page's own one sentence summary (the line under an activity heading), when found. */
  summary: string | null;
}

interface LayoutIssue {
  page: number;
  what: string;
  severity: "minor" | "bad";
  splitWith?: number;
}

// Section labels the packet prints in spaced capitals ("M AT H"), with the
// kind each one starts. Anything else labeled ("DID YOU KNOW?") is a
// sub-label inside a page and doesn't start an activity.
const ACTIVITY_SECTIONS: Record<string, PageKind> = {
  MATH: "math",
  READING: "reading",
  WRITING: "other",
  SCIENCE: "science",
  "PUZZLE BREAK": "puzzle",
  "MOVEMENT BREAK": "movement",
};

// What the gallery tries to show, in order. "activity" stands in for
// science when there's no clean science page.
const GALLERY_TARGETS = ["cover", "reading", "math", "science", "puzzle", "movement", "coloring", "certificate"] as const;
const GENERATED_FILES = [...GALLERY_TARGETS, "activity"].map((name) => `${name}.png`);

const FOOTER_SOURCE = String.raw`Made with love by Packet Day\s*·\s*packetday\.com\s*\d+\s*of\s*\d+`;
const FOOTER = new RegExp(FOOTER_SOURCE, "gi");
const IS_FOOTER = new RegExp(FOOTER_SOURCE, "i");
const IS_PAGE_NUMBER = /^\d+\s*of\s*\d+$/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function loudWarning(message: string) {
  const bar = "!".repeat(72);
  console.warn(`\n${bar}\n!! ${message}\n${bar}\n`);
}

/** "M AT H" -> "MATH", "P U Z Z L E B R E A K" -> "PUZZLEBREAK". Null if the item isn't a spaced label. */
function spacedLabel(str: string): string | null {
  const s = str.trim();
  if (!/^([A-Z0-9!?'’&-]{1,3} )+[A-Z0-9!?'’&-]{1,3}$/.test(s)) return null;
  return s.replace(/ /g, "");
}

function sectionFromLabel(collapsed: string): string | null {
  for (const section of Object.keys(ACTIVITY_SECTIONS)) {
    if (collapsed === section.replace(/ /g, "")) return section;
  }
  return null;
}

function isChrome(item: TextItem): boolean {
  const s = item.str.trim();
  return !s || IS_FOOTER.test(s) || IS_PAGE_NUMBER.test(s) || /^Made with love by Packet Day/.test(s);
}

/** Reading order text, with spaced labels collapsed so "M AT H" reads "MATH". */
function pageText(items: TextItem[]): string {
  return items
    .filter((item) => !isChrome(item))
    .map((item) => (spacedLabel(item.str) ?? item.str) + (item.hasEOL ? "\n" : " "))
    .join("")
    .replace(FOOTER, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function largestText(items: TextItem[]): { text: string; size: number; lastIndex: number } {
  const body = items.filter((item) => !isChrome(item) && !spacedLabel(item.str));
  const max = Math.max(0, ...body.map((item) => item.size));
  const isHeading = (item: TextItem) => !isChrome(item) && !spacedLabel(item.str) && item.size >= max - 0.5;
  let lastIndex = -1;
  items.forEach((item, i) => {
    if (isHeading(item)) lastIndex = i;
  });
  const text = items.filter(isHeading).map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
  return { text, size: Math.round(max * 10) / 10, lastIndex };
}

/**
 * The page's own one line summary. Under an activity heading the packet
 * prints "25 min · supplies" in small bold type, then a summary sentence in
 * body type ("Maya practices adding..."). The coloring page has its
 * instruction right under the heading. This takes the first run of same-font
 * text after the heading, skipping the time and supplies run, and returns its
 * first sentence.
 */
function pageSummary(items: TextItem[], headingLastIndex: number, kind: PageKind): string | null {
  if (headingLastIndex < 0) return null;
  let i = headingLastIndex + 1;
  const next = () => items[i];
  while (next() && (isChrome(next()) || spacedLabel(next().str))) i++;
  if (kind !== "coloring" && next() && /\d+\s*min\b/.test(next().str)) {
    const suppliesFont = next().font;
    const suppliesSize = next().size;
    while (next() && next().font === suppliesFont && next().size === suppliesSize) i++;
  }
  const first = next();
  if (!first || spacedLabel(first.str)) return null;
  const run: string[] = [];
  while (next() && next().font === first.font && next().size === first.size && !spacedLabel(next().str)) {
    run.push(next().str);
    i++;
  }
  const joined = run.join(" ").replace(/\s+/g, " ").trim();
  const sentence = joined.match(/^(.+?[.!?])(\s|$)/);
  return (sentence ? sentence[1] : joined) || null;
}

async function readPage(doc: PdfDocument, pageNumber: number): Promise<TextItem[]> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const items: TextItem[] = [];
  for (const item of content.items) {
    if (!("str" in item)) continue;
    items.push({
      str: item.str,
      size: Math.round(Math.hypot(item.transform[2], item.transform[3]) * 10) / 10,
      font: item.fontName,
      hasEOL: item.hasEOL,
    });
  }
  return items;
}

function classify(pageNumber: number, items: TextItem[], previous: PageInfo | undefined): PageInfo {
  const labels = items.map((item) => spacedLabel(item.str)).filter((label): label is string => !!label);
  const text = pageText(items);
  const { text: heading, size, lastIndex } = largestText(items);
  const section = labels.map(sectionFromLabel).find((s) => s !== null) ?? null;
  const base = { number: pageNumber, heading, headingFontSize: size, section, text, continuesPage: null };
  const withSummary = (page: Omit<PageInfo, "summary">): PageInfo => ({
    ...page,
    // Only activity pages and the coloring page print a summary line.
    summary:
      page.continuesPage === null && (page.section || page.kind === "coloring")
        ? pageSummary(items, lastIndex, page.kind)
        : null,
  });

  const has = (label: string) => labels.includes(label);

  if (pageNumber === 1) {
    return withSummary({ ...base, kind: "cover", confidence: has("YOURMISSIONTODAY") ? "high" : "medium", reason: "first page" });
  }
  if (has("FORGROWN-UPSONLY") || /answer key/i.test(heading)) {
    return withSummary({ ...base, section: null, kind: "answer-key", confidence: "high", reason: 'labeled "FOR GROWN-UPS ONLY" / answer key' });
  }
  if (has("CERTIFICATEOFCOMPLETION")) {
    return withSummary({ ...base, kind: "certificate", confidence: "high", reason: 'labeled "CERTIFICATE OF COMPLETION"' });
  }
  if (has("COLORME!")) {
    return withSummary({ ...base, kind: "coloring", confidence: "high", reason: 'labeled "COLOR ME!"' });
  }
  if (has("ACTIVITYSUMMARY")) {
    return withSummary({ ...base, kind: "other", confidence: "high", reason: "overview page (activity summary)" });
  }
  if (has("TODAY'SQUESTION") || /daily reflection/i.test(heading)) {
    return withSummary({ ...base, kind: "other", confidence: "high", reason: "reflection page" });
  }
  if (section) {
    return withSummary({ ...base, kind: ACTIVITY_SECTIONS[section], confidence: "high", reason: `labeled "${section}"` });
  }

  // No label. Most often the second page of the activity before it.
  if (previous?.section) {
    const start = previous.continuesPage ?? previous.number;
    return withSummary({
      ...base,
      section: previous.section,
      kind: ACTIVITY_SECTIONS[previous.section],
      confidence: previous.continuesPage ? "low" : "medium",
      reason: `no label; reads as more of the ${previous.section} activity that starts on page ${start}`,
      continuesPage: start,
    });
  }

  // Last resort: plain text clues.
  const lower = text.toLowerCase();
  if (text.length < 150) {
    return withSummary({ ...base, kind: "coloring", confidence: "low", reason: "very little text" });
  }
  const clues: [PageKind, RegExp][] = [
    ["puzzle", /word search|find these words|crossword|maze/],
    ["movement", /stretch|jump|hop|wiggle|march/],
    ["math", /\d+\s*[+\-x×÷]\s*\d+\s*=/],
    ["science", /experiment|observe|predict|hypothesis/],
    ["reading", /read this|story|comprehension/],
  ];
  for (const [kind, pattern] of clues) {
    if (pattern.test(lower)) return withSummary({ ...base, kind, confidence: "low", reason: `text clue ${pattern}` });
  }
  return withSummary({ ...base, kind: "other", confidence: "low", reason: "no label or clue matched" });
}

function titleCase(section: string): string {
  return section.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A draft alt text built only from what is printed on the page. Always needs a human read. */
function draftAlt(page: PageInfo, packetTitle: string, characterPhrase: string | null): string {
  const summary = page.summary ? ` ${page.summary}` : "";
  switch (page.kind) {
    case "cover": {
      const facts = page.text.match(/(\d+) Activities\s+(\d+) min\s+Grade (\w+)/i);
      const factText = facts ? `, grade ${facts[3]}, ${facts[1]} activities, ${facts[2]} minutes` : "";
      const guide = characterPhrase ? ` with ${characterPhrase} as the guide` : "";
      return `Cover page of the packet "${packetTitle}"${guide}${factText}.`;
    }
    case "certificate":
      return `Certificate of completion for "${packetTitle}", with a grown-up signature line.`;
    case "coloring":
      return `Coloring page, "${page.heading}".${summary}`;
    default: {
      const label = page.section ? titleCase(page.section) : "Activity";
      return `${label} page, "${page.heading}".${summary}`;
    }
  }
}

async function readLayoutReview(slug: string): Promise<{ reviewedOn: string; issues: LayoutIssue[] } | null> {
  const file = path.join(REVIEWS_DIR, `${slug}.layout.json`);
  if (!existsSync(file)) return null;
  const review = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(review.issues)) fail(`${path.relative(REPO_ROOT, file)}: "issues" must be a list.`);
  for (const [i, issue] of review.issues.entries()) {
    if (!Number.isInteger(issue.page) || typeof issue.what !== "string" || !["minor", "bad"].includes(issue.severity)) {
      fail(`${path.relative(REPO_ROOT, file)}: issue ${i} needs a whole number "page", a "what" and a "severity" of "minor" or "bad".`);
    }
  }
  return review;
}

/**
 * Pages the gallery may never use: every page with an issue of its own. A
 * "bad" issue also blocks every page it touches: both halves of a split, and
 * the page right before and after it. A minor split blocks only the page the
 * issue is recorded on (usually the spillover page), so the clean first page
 * of an activity that continues can still be picked.
 */
function blockedPages(issues: LayoutIssue[], pageCount: number): Set<number> {
  const blocked = new Set<number>();
  for (const issue of issues) {
    blocked.add(issue.page);
    if (issue.severity === "bad" && issue.splitWith !== undefined) {
      const first = Math.min(issue.page, issue.splitWith);
      const last = Math.max(issue.page, issue.splitWith);
      for (let n = first; n <= last; n++) blocked.add(n);
      if (first > 1) blocked.add(first - 1);
      if (last < pageCount) blocked.add(last + 1);
    }
  }
  return blocked;
}

function pickGallery(pages: PageInfo[], blocked: Set<number>) {
  const clean = (page: PageInfo) => !blocked.has(page.number) && page.kind !== "answer-key";
  const firstOf = (kind: PageKind) => pages.find((page) => page.kind === kind && page.continuesPage === null && clean(page));
  const picks: { target: string; page: PageInfo }[] = [];
  const used = new Set<number>();

  for (const target of GALLERY_TARGETS) {
    let page = firstOf(target as PageKind);
    let name: string = target;
    if (!page && target === "science") {
      // "science or activity": the writing activity, the one activity with
      // no gallery slot of its own (puzzle and movement have theirs).
      page = pages.find((p) => p.section === "WRITING" && p.continuesPage === null && clean(p) && !used.has(p.number));
      name = "activity";
    }
    if (!page || used.has(page.number)) continue;
    used.add(page.number);
    picks.push({ target: name, page });
  }
  return picks;
}

async function ingest(slug: string, pdfPath: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`"${slug}" isn't a valid slug (lowercase words joined by hyphens).`);
  if (!existsSync(pdfPath)) fail(`No PDF at ${pdfPath}`);

  console.log(`\n=== ${slug}  (${path.relative(REPO_ROOT, pdfPath)})`);
  const doc = await loadPdf(pdfPath);
  const pageCount = doc.numPages;
  console.log(`Pages: ${pageCount}`);
  if (pageCount < PAGE_RANGE.min || pageCount > PAGE_RANGE.max) {
    loudWarning(`${slug} has ${pageCount} pages, outside ${PAGE_RANGE.min} to ${PAGE_RANGE.max}. Check the PDF before using it.`);
  }

  // 1. Every page to the private inbox.
  const pagesDir = path.join(PAGES_DIR, slug);
  await rm(pagesDir, { recursive: true, force: true });
  const rasters = await rasterizePdf(doc, pagesDir);
  const rasterByPage = new Map<number, RasterizedPage>(rasters.map((r) => [r.pageNumber, r]));

  // 2. Text and kinds.
  const pages: PageInfo[] = [];
  for (let n = 1; n <= pageCount; n++) {
    pages.push(classify(n, await readPage(doc, n), pages[n - 2]));
  }

  const cover = pages[0];
  const packetTitle = cover.heading;
  const certificate = pages.find((page) => page.kind === "certificate");
  const childFirstName =
    certificate?.text.match(/This certifies that\s+([A-Z][\w'’-]*)\s+has completed/)?.[1] ??
    packetTitle.match(/^([A-Z][\w-]*)['’]s\b/)?.[1] ??
    null;
  // The guide introduces itself on the cover: "I am Patch the pumpkin,",
  // "it's me, Pebble the penguin!", "it is Barnaby the Ship Mouse, ...".
  const characterMatch = cover.text.match(
    /\b(?:I am|I'm|it['’]s me,|it is|this is)\s+([A-Z][\w'’-]*)(?: the ([A-Za-z][\w -]*?))?(?=[,.!])/,
  );
  const characterName = characterMatch?.[1] ?? null;
  const characterPhrase = characterMatch?.[2] ? `${characterMatch[1]} the ${characterMatch[2].trim()}` : characterName;

  // 3. Layout review, then the gallery.
  const review = await readLayoutReview(slug);
  const issues = review?.issues ?? [];
  const blocked = blockedPages(issues, pageCount);
  const picks = pickGallery(pages, blocked);

  const statusReasons: string[] = [];
  if (!review) statusReasons.push(`no layout review at packet-inbox/_reviews/${slug}.layout.json`);
  const badIssues = issues.filter((issue) => issue.severity === "bad");
  if (badIssues.length > 0) statusReasons.push(`${badIssues.length} "bad" layout issue(s) on page(s) ${badIssues.map((i) => i.page).join(", ")}`);
  if (picks.length < MIN_GALLERY) statusReasons.push(`only ${picks.length} clean gallery page(s), need at least ${MIN_GALLERY}`);
  const status = !review ? "not-reviewed" : statusReasons.length > 0 ? "needs-regeneration" : "ok";

  const publicDir = path.join(PUBLIC_DIR, slug);
  // Only ever remove the files this script names, so nothing else in the folder is touched.
  for (const file of GENERATED_FILES) {
    await rm(path.join(publicDir, file), { force: true });
  }
  if (existsSync(publicDir) && (await readdir(publicDir)).length === 0) {
    await rm(publicDir, { recursive: true });
  }

  const gallery = [];
  for (const { target, page } of picks) {
    const raster = rasterByPage.get(page.number)!;
    const file = `${target}.png`;
    if (status === "ok") {
      await mkdir(publicDir, { recursive: true });
      await copyFile(path.join(pagesDir, raster.filename), path.join(publicDir, file));
    }
    gallery.push({
      file,
      kind: target === "activity" ? "other" : target,
      width: raster.width,
      height: raster.height,
      bytes: raster.bytes,
      sourcePage: page.number,
      confidence: page.confidence,
      alt: draftAlt(page, packetTitle, characterPhrase),
      copiedToPublic: status === "ok",
    });
  }

  const activities = pages
    .filter((page) => page.section && page.continuesPage === null)
    .map((page) => ({ section: titleCase(page.section!), heading: page.heading, page: page.number }));

  const extract = {
    slug,
    sourceFile: path.basename(pdfPath),
    pageCount,
    status,
    statusReasons,
    packetTitle,
    childFirstName,
    characterName,
    characterPhrase,
    layoutReviewedOn: review?.reviewedOn ?? null,
    layoutIssues: issues,
    blockedPages: [...blocked].sort((a, b) => a - b),
    pages: pages.map((page) => ({
      number: page.number,
      heading: page.heading,
      headingFontSize: page.headingFontSize,
      section: page.section,
      kind: page.kind,
      confidence: page.confidence,
      reason: page.reason,
      continuesPage: page.continuesPage,
      summary: page.summary,
      text: page.text,
    })),
    gallery,
    activities,
  };

  await mkdir(EXTRACTS_DIR, { recursive: true });
  const extractPath = path.join(EXTRACTS_DIR, `${slug}.extract.json`);
  await writeFile(extractPath, JSON.stringify(extract, null, 2) + "\n");

  console.log(`Child: ${childFirstName ?? "(not found)"}   Character: ${characterPhrase ?? "(not found)"}`);
  for (const page of pages) {
    const flag = page.confidence === "low" ? "  <-- LOW CONFIDENCE" : "";
    const block = blocked.has(page.number) ? " [blocked]" : "";
    console.log(`  p${String(page.number).padStart(2)} ${page.kind.padEnd(11)} ${page.confidence.padEnd(6)} ${page.heading.slice(0, 55)}${block}${flag}`);
  }
  console.log(`Gallery (${picks.length} clean): ${gallery.map((item) => `${item.file.replace(".png", "")} p${item.sourcePage}`).join(", ") || "none"}`);
  if (status === "ok") {
    console.log(`Copied ${gallery.length} images to public/unit-studies/${slug}/`);
  } else {
    loudWarning(`${slug}: ${status === "not-reviewed" ? "NOT REVIEWED" : "NEEDS REGENERATION"}. Nothing copied to public/. ${statusReasons.join("; ")}`);
  }
  console.log(`Extract: ${path.relative(REPO_ROOT, extractPath)}`);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  if (args.includes("--all")) {
    const pdfs = (await readdir(INBOX)).filter((name) => name.toLowerCase().endsWith(".pdf")).sort();
    const todo = pdfs.filter((name) => !existsSync(path.join(EXTRACTS_DIR, `${name.replace(/\.pdf$/i, "")}.extract.json`)));
    if (todo.length === 0) {
      console.log("Every PDF in packet-inbox already has an extract. Nothing to do.");
      return;
    }
    for (const name of todo) {
      await ingest(name.replace(/\.pdf$/i, ""), path.join(INBOX, name));
    }
    return;
  }

  const [slug, pdfArg] = args;
  if (!slug) fail("Usage: npm run ingest-unit-study -- <slug> [pdfPath]  |  --all");
  const pdfPath = pdfArg ? (path.isAbsolute(pdfArg) ? pdfArg : path.join(REPO_ROOT, pdfArg)) : path.join(INBOX, `${slug}.pdf`);
  await ingest(slug, pdfPath);
}

main().catch((err) => fail(err instanceof Error ? err.stack ?? err.message : String(err)));

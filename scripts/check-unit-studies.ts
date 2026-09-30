/**
 * Quality gate for unit study pages (content/unit-studies/*.json). Runs
 * before every build (package.json "prebuild"), so Vercel checks it on every
 * deploy.
 *
 *   npm run check-unit-studies                 check content/unit-studies/
 *   npm run check-unit-studies -- --dir <dir>  check another folder instead (for testing the gate)
 *
 * A LIVE page failing any rule fails the command. A draft never fails it; it
 * just gets the same report. Two things fail no matter what, because the
 * build would fail on them anyway: a file that doesn't match the schema, and
 * a problem in the theme registry itself.
 *
 * The rules come from docs/unit-study-page-style-guide.md.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { unitStudyPageSchema, type UnitStudyPage } from "../lib/unit-studies/schema";
import { gallerySrc } from "../lib/unit-studies/loader";
import { THEME_SLUGS, registryProblems } from "../lib/unit-studies/themes";
import { ENTITY_SENTENCE } from "../lib/unit-studies/entity";
import { PAGE_RANGE, HOURS_RANGE } from "../lib/situations/figures";
import { SITUATIONS } from "../lib/situations/registry";
import { getAllPosts } from "../lib/blog";
import * as sickDay from "../lib/situations/sick-day";
import * as roadTrip from "../lib/situations/road-trip";
import * as funFriday from "../lib/situations/fun-friday";
import * as multipleKids from "../lib/situations/multiple-kids";
import * as screenFree from "../lib/situations/screen-free";

const REPO_ROOT = process.cwd();
const PUBLIC_DIR = path.join(REPO_ROOT, "public");

// Situation page copy, for the uniqueness check. A new situation page must be
// added here too; the gate fails if the registry has one this list doesn't.
const SITUATION_COPY: Record<string, unknown> = {
  "sick-day": sickDay,
  "road-trip": roadTrip,
  "fun-friday": funFriday,
  "multiple-kids": multipleKids,
  "screen-free": screenFree,
};

const BANNED = [
  "unlock",
  "leverage",
  "elevate",
  "seamless",
  "revolutionary",
  "game-changer",
  "game changer",
  "delve",
  "in today's fast-paced world",
  "common core",
  "aligned",
];

const WORDS = { min: 800, max: 1200 };
const CAPSULE_WORDS = { min: 40, max: 60 };
const FAQ_ANSWER_WORDS = { min: 40, max: 70 };
const SHINGLE = 5;
const MAX_OVERLAP = 0.4;
const MIN_GALLERY = 6;
const AI_WORD = /\bAI\b/;

// ─── Copy fields ──────────────────────────────────────────────────────────────

interface Field {
  label: string;
  text: string;
}

/** Copy that is printed on the page itself, from the content file. Template text in code is not included. */
function visibleFields(page: UnitStudyPage): Field[] {
  return [
    { label: "h1", text: page.h1 },
    { label: "answerCapsule", text: page.answerCapsule },
    ...page.gallery.map((g, i) => ({ label: `gallery.${i}.caption`, text: g.caption })),
    ...page.inside.flatMap((item, i) => [
      { label: `inside.${i}.subject`, text: item.subject },
      { label: `inside.${i}.activity`, text: item.activity },
      { label: `inside.${i}.detail`, text: item.detail },
    ]),
    { label: "characterSection.heading", text: page.characterSection.heading },
    { label: "characterSection.body", text: page.characterSection.body },
    { label: "learning.heading", text: page.learning.heading },
    { label: "learning.body", text: page.learning.body },
    ...page.gradeBands.map((b, i) => ({ label: `gradeBands.${i}.body`, text: b.body })),
    { label: "natalieNote.body", text: page.natalieNote.body },
    ...page.faqs.flatMap((f, i) => [
      { label: `faqs.${i}.q`, text: f.q },
      { label: `faqs.${i}.a`, text: f.a },
    ]),
  ];
}

/** Every copy field, visible or not: the visible fields plus the title, description and alt text. */
function copyFields(page: UnitStudyPage): Field[] {
  return [
    { label: "meta.title", text: page.meta.title },
    { label: "meta.description", text: page.meta.description },
    ...visibleFields(page),
    ...page.gallery.map((g, i) => ({ label: `gallery.${i}.alt`, text: g.alt })),
  ];
}

function headingFields(page: UnitStudyPage): Field[] {
  return [
    { label: "meta.title", text: page.meta.title },
    { label: "h1", text: page.h1 },
    { label: "characterSection.heading", text: page.characterSection.heading },
    { label: "learning.heading", text: page.learning.heading },
  ];
}

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/'/g, "")
    .split(" ")
    .filter(Boolean);
}

/** 5 word shingles, never across a field boundary. */
function shingles(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    const w = normalize(text);
    for (let i = 0; i + SHINGLE <= w.length; i++) out.add(w.slice(i, i + SHINGLE).join(" "));
  }
  return out;
}

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

function quote(text: string, at: number): string {
  return `"...${text.slice(Math.max(0, at - 25), at + 25).replace(/\s+/g, " ")}..."`;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

interface RuleResult {
  rule: string;
  problems: string[];
  warnOnly?: boolean;
}

async function checkPage(
  page: UnitStudyPage,
  raw: string,
  others: { name: string; shingles: Set<string> }[],
) {
  const results: RuleResult[] = [];
  const add = (rule: string, problems: string[], warnOnly = false) => results.push({ rule, problems, warnOnly });
  const visible = visibleFields(page);
  const copy = copyFields(page);

  // 1. Placeholders and review dates
  const placeholders = [...raw.matchAll(/\[NATALIE:[^\]]*\]?/gi)].map((m) => m[0]);
  add(
    "placeholders and dates",
    [
      ...placeholders.map((p) => `placeholder still in the file: ${p}`),
      ...(page.natalieReviewedOn ? [] : ['"natalieReviewedOn" is missing (Natalie has not reviewed it)']),
      ...(page.datePublished ? [] : ['"datePublished" is missing']),
    ],
  );

  // 2. Facts
  const openFacts = page.factsToVerify.filter((f) => !f.verified);
  add(
    "facts verified",
    openFacts.map((f) => `unverified: "${f.claim}"${f.source ? ` (source: ${f.source})` : " (no source yet)"}`),
  );

  // 3. Dashes
  const dashProblems: string[] = [];
  for (const f of copy) {
    for (const m of f.text.matchAll(/[—–]| - /g)) {
      const kind = m[0] === "—" ? "em dash" : m[0] === "–" ? "en dash" : "spaced hyphen";
      dashProblems.push(`${f.label}: ${kind} ${quote(f.text, m.index!)}`);
    }
  }
  add("no dashes", dashProblems);

  // 4. Lengths
  const lengthProblems: string[] = [];
  if (page.meta.title.length > 60) lengthProblems.push(`meta.title is ${page.meta.title.length} characters (max 60)`);
  if (page.meta.description.length > 155) lengthProblems.push(`meta.description is ${page.meta.description.length} characters (max 155)`);
  if (!page.meta.description.trim().endsWith("Free to start.")) lengthProblems.push('meta.description must end with "Free to start."');
  const capsuleWords = words(page.answerCapsule).length;
  if (capsuleWords < CAPSULE_WORDS.min || capsuleWords > CAPSULE_WORDS.max) {
    lengthProblems.push(`answerCapsule is ${capsuleWords} words (needs ${CAPSULE_WORDS.min} to ${CAPSULE_WORDS.max})`);
  }
  add("title, description, capsule", lengthProblems);

  // 5. Gallery
  const galleryProblems: string[] = [];
  if (page.gallery.length < MIN_GALLERY) galleryProblems.push(`${page.gallery.length} gallery images (needs at least ${MIN_GALLERY})`);
  for (const [i, g] of page.gallery.entries()) {
    if (!g.alt.trim()) galleryProblems.push(`gallery.${i}: alt text is empty`);
    if (!g.width || !g.height) galleryProblems.push(`gallery.${i}: width and height are required`);
    const src = gallerySrc(page, g);
    const file = path.join(PUBLIC_DIR, src);
    if (!fs.existsSync(file)) {
      galleryProblems.push(`gallery.${i}: public${src} does not exist`);
      continue;
    }
    const meta = await sharp(file).metadata();
    if (meta.width !== g.width || meta.height !== g.height) {
      galleryProblems.push(`gallery.${i}: says ${g.width}x${g.height} but public${src} is ${meta.width}x${meta.height}`);
    }
  }
  add("gallery", galleryProblems);

  // 6. FAQs
  const faqProblems: string[] = [];
  if (page.faqs.length !== 6) faqProblems.push(`${page.faqs.length} FAQs (needs exactly 6)`);
  const aiFaqs = page.faqs.filter((f) => AI_WORD.test(f.q));
  if (aiFaqs.length !== 1) faqProblems.push(`${aiFaqs.length} FAQs ask about AI (needs exactly 1, e.g. "Are these made by AI, and are they any good?")`);
  page.faqs.forEach((f, i) => {
    if (AI_WORD.test(f.q)) return;
    const n = words(f.a).length;
    if (n < FAQ_ANSWER_WORDS.min || n > FAQ_ANSWER_WORDS.max) {
      faqProblems.push(`faqs.${i}.a is ${n} words (needs ${FAQ_ANSWER_WORDS.min} to ${FAQ_ANSWER_WORDS.max})`);
    }
  });
  add("FAQs", faqProblems);

  // 7. Figures
  const figureProblems: string[] = [];
  if (page.sample.pageCount < PAGE_RANGE.min || page.sample.pageCount > PAGE_RANGE.max) {
    figureProblems.push(`sample.pageCount is ${page.sample.pageCount}, outside ${PAGE_RANGE.min} to ${PAGE_RANGE.max}`);
  }
  for (const f of copy) {
    for (const m of f.text.matchAll(/\b(\d+)\s*(?:to|-|–|—)\s*(\d+)[\s-]*(pages?|hours?|hrs?)\b/gi)) {
      const range = /^p/i.test(m[3]) ? PAGE_RANGE : HOURS_RANGE;
      const unit = /^p/i.test(m[3]) ? "pages" : "hours";
      if (Number(m[1]) !== range.min || Number(m[2]) !== range.max) {
        figureProblems.push(`${f.label}: "${m[0]}" does not match figures.ts (${range.min} to ${range.max} ${unit})`);
      }
    }
  }
  add("figures", figureProblems);

  // 8. Related and use case links
  const linkProblems: string[] = [];
  if (page.related.length !== 3) linkProblems.push(`${page.related.length} related slugs (needs exactly 3)`);
  page.related.forEach((slug, i) => {
    if (slug === page.slug) linkProblems.push(`related.${i}: a page cannot list itself`);
    else if (!THEME_SLUGS.has(slug)) linkProblems.push(`related.${i}: "${slug}" is not in lib/unit-studies/themes.ts`);
  });
  page.useCaseLinks.forEach((href, i) => {
    const route = path.join(REPO_ROOT, "app", ...href.split("/").filter(Boolean), "page.tsx");
    if (!fs.existsSync(route)) linkProblems.push(`useCaseLinks.${i}: "${href}" is not a page in app/`);
  });
  add("related and use case links", linkProblems);

  // 9. Style
  const styleProblems: string[] = [];
  const exclamations = visible.reduce((n, f) => n + (f.text.match(/!/g) ?? []).length, 0);
  if (exclamations > 1) styleProblems.push(`${exclamations} exclamation points in visible copy (max 1)`);
  for (const f of copy) {
    const emoji = f.text.match(/\p{Extended_Pictographic}/u);
    if (emoji) styleProblems.push(`${f.label}: emoji "${emoji[0]}"`);
    const lower = f.text.toLowerCase().replace(/[’‘]/g, "'");
    for (const phrase of BANNED) {
      const pattern = new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
      if (pattern.test(lower)) styleProblems.push(`${f.label}: banned phrase "${phrase}"`);
    }
  }
  for (const f of headingFields(page)) {
    if (AI_WORD.test(f.text)) styleProblems.push(`${f.label}: "AI" is not allowed in a heading ("${f.text}")`);
  }
  add("style", styleProblems);

  // 10. Word count
  const wordCount = visible.reduce((n, f) => n + words(f.text).length, 0);
  add(
    "word count",
    wordCount < WORDS.min || wordCount > WORDS.max
      ? [`${wordCount} visible words from the content file (needs ${WORDS.min} to ${WORDS.max})`]
      : [],
    page.status === "draft",
  );

  // 11. Uniqueness
  const mine = shingles(visible.map((f) => f.text).filter((t) => t !== ENTITY_SENTENCE));
  const overlaps = others
    .map((o) => {
      let shared = 0;
      for (const s of mine) if (o.shingles.has(s)) shared++;
      return { name: o.name, share: mine.size ? shared / mine.size : 0 };
    })
    .sort((a, b) => b.share - a.share);
  let uniqueCount = 0;
  for (const s of mine) if (!others.some((o) => o.shingles.has(s))) uniqueCount++;
  const uniquePercent = mine.size ? Math.round((100 * uniqueCount) / mine.size) : 0;
  add(
    "uniqueness",
    overlaps
      .filter((o) => o.share > MAX_OVERLAP)
      .map((o) => `${Math.round(o.share * 100)}% of this page's 5 word phrases also appear in ${o.name} (max ${MAX_OVERLAP * 100}%)`),
  );

  return { results, wordCount, uniquePercent, topOverlap: overlaps[0], openFacts, placeholders };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const dirIndex = args.indexOf("--dir");
  const dir = dirIndex === -1 ? path.join(REPO_ROOT, "content", "unit-studies") : path.resolve(REPO_ROOT, args[dirIndex + 1] ?? "");
  const shownDir = path.relative(REPO_ROOT, dir) || dir;

  let failed = false;
  const failHard = (message: string) => {
    failed = true;
    console.log(`FAIL  ${message}`);
  };

  for (const problem of registryProblems()) failHard(`theme registry: ${problem}`);
  for (const s of SITUATIONS) {
    if (!(s.slug in SITUATION_COPY)) failHard(`situation "${s.slug}" is missing from SITUATION_COPY in scripts/check-unit-studies.ts`);
  }

  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  console.log(`Unit study quality gate: ${files.length} file(s) in ${shownDir}\n`);

  const pages: { file: string; page: UnitStudyPage; raw: string }[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      failHard(`${file}: not valid JSON (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }
    const parsed = unitStudyPageSchema.safeParse(json);
    if (!parsed.success) {
      failHard(`${file}: doesn't match the schema, so the build would fail too`);
      for (const issue of parsed.error.issues) console.log(`        field "${issue.path.join(".") || "(root)"}": ${issue.message}`);
      continue;
    }
    pages.push({ file, page: parsed.data, raw });
  }

  const outside: { name: string; shingles: Set<string> }[] = [
    ...Object.entries(SITUATION_COPY).map(([slug, mod]) => ({ name: `situation page /${slug}`, shingles: shingles(allStrings(mod)) })),
    ...getAllPosts().map((post) => ({
      name: `blog post /blog/${post.slug}`,
      shingles: shingles([post.title, post.content, ...post.faqs.flatMap((f) => [f.question, f.answer])]),
    })),
  ];
  const unitDocs = pages.map((p) => ({ slug: p.page.slug, name: `unit study ${p.file}`, shingles: shingles(visibleFields(p.page).map((f) => f.text)) }));

  let liveCount = 0;
  for (const { file, page, raw } of pages) {
    const others = [...outside, ...unitDocs.filter((d) => d.slug !== page.slug)];
    const report = await checkPage(page, raw, others);
    const isLive = page.status === "live";
    if (isLive) liveCount++;
    const failing = report.results.filter((r) => r.problems.length > 0 && !r.warnOnly);
    const pageFails = isLive && failing.length > 0;
    if (pageFails) failed = true;

    const verdict = !isLive ? "DRAFT (report only)" : pageFails ? "LIVE, FAILS" : "LIVE, passes";
    console.log(`── ${file}  [${verdict}]`);
    console.log(
      `   words ${report.wordCount}  ·  unique ${report.uniquePercent}%` +
        (report.topOverlap ? `  ·  closest match ${Math.round(report.topOverlap.share * 100)}% (${report.topOverlap.name})` : ""),
    );
    for (const r of report.results) {
      const mark = r.problems.length === 0 ? "pass" : r.warnOnly ? "warn" : isLive ? "FAIL" : "fail";
      console.log(`   ${mark.padEnd(4)}  ${r.rule}`);
      for (const p of r.problems) console.log(`           ${p}`);
    }
    console.log(`   open factsToVerify: ${report.openFacts.length}  ·  placeholders: ${report.placeholders.length}\n`);
  }

  console.log(
    failed
      ? "Quality gate FAILED. Fix the problems above (a live page must pass every rule)."
      : `Quality gate passed (${liveCount} live, ${pages.length - liveCount} draft).`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("Quality gate crashed:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});

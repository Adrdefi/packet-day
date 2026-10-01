/**
 * Renders the puzzle break fixtures to PNGs for review. Local only: no
 * database, no API calls, no images fetched.
 *
 *   npm run render-puzzles
 *   npm run render-puzzles -- --baseline   (old path only, saved as the baseline)
 *
 * Each type and band also renders a "-max" page (every text block at its
 * cap, whole sentences) and an "-overflow" page (every block over its cap:
 * stock intro, no Did You Know, encouragement in place of the joke).
 *
 * Fixtures: scripts/fixtures/puzzle-rotation.json, real model output from
 * scripts/test-packets.ts --matrix (test names only).
 *
 * - Every puzzle type in every grade band: the model's raw puzzle activity
 *   goes through attachPuzzleBreak (the same build step generation runs,
 *   fixed seed), then renders. Each one's puzzle page is saved as
 *   <band>-<type>.png and checked: exactly one page, no text outside the
 *   page's content box, and the punchline drawn upside down.
 * - One old packet (no activity.puzzle) renders every page; its page image
 *   and text hashes are compared with the saved baseline to prove the old
 *   path is unchanged. Run with --baseline first, on code that predates the
 *   change, to record that baseline.
 *
 * Output: tmp-renders/puzzle-rotation/ (gitignored). Exits 1 on any failure.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import type { PacketPDFProps, PDFActivity } from "../components/PacketPDF";
import { renderPacketPdf } from "../lib/packetPdfRender";
import { attachPuzzleBreak } from "../lib/puzzles/attach";
import type { PuzzleType } from "../lib/puzzles/types";
import { PAGE_PADDING } from "../lib/puzzles/pageLayout";
import { PUZZLE_TEXT_CAPS, stockIntro } from "../lib/puzzles/textCaps";
import { bandForGrade } from "../lib/pdf-tokens";
import type { PacketContent } from "../types";
import { loadPdf, type PdfDocument } from "./lib/rasterize-pdf";

const REPO_ROOT = process.cwd();
const OUT_DIR = path.join(REPO_ROOT, "tmp-renders", "puzzle-rotation");
const BASELINE_FILE = path.join(OUT_DIR, "old-packet-baseline.json");
const PNG_WIDTH = 1275; // 150 dpi on letter paper
const CREATED_AT = "2026-10-01T15:00:00.000Z";

interface PuzzleFixture {
  band: string;
  type: PuzzleType;
  gradeLevel: string;
  childName: string;
  theme: string;
  packetTitle: string | null;
  mascotName: string | null;
  activity: Record<string, unknown>;
}
interface Fixtures {
  puzzles: PuzzleFixture[];
  oldPacket: { gradeLevel: string; childName: string; theme: string; content: PacketContent };
}

const failures: string[] = [];
const fail = (msg: string) => failures.push(msg);

function gradeDisplay(g: string) {
  return g === "K" ? "Kindergarten" : `Grade ${g}`;
}

async function mascotDataUri(): Promise<string> {
  const buf = await readFile(path.join(REPO_ROOT, "public", "sample", "orbit.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function propsFor(content: PacketContent, f: { childName: string; gradeLevel: string; theme: string }, mascot: string): PacketPDFProps {
  return {
    childName: f.childName,
    childEmoji: "🌟",
    childGrade: gradeDisplay(f.gradeLevel),
    theme: f.theme,
    title: content.packet_title ?? content.title ?? f.theme,
    activities: content.activities as PDFActivity[],
    createdAt: CREATED_AT,
    mascotImageUrl: mascot,
    coloringImageUrl: null,
    mascotName: content.mascot_name ?? null,
    coloringPage: null,
    greeting: content.greeting ?? null,
    parentNotes: content.parent_notes ?? null,
    dailyReflection: content.daily_reflection ?? null,
    packetMission: content.packet_mission ?? null,
    packetCelebration: content.packet_celebration ?? null,
    packetNumber: content.packet_number ?? null,
    titleStyle: content.title_style ?? null,
  };
}

async function rasterPage(doc: PdfDocument, pageNum: number): Promise<{ png: Buffer; pixelHash: string }> {
  const page = await doc.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: PNG_WIDTH / base.width });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  const raw = await canvas.encode("png");
  const { data } = await sharp(raw).raw().toBuffer({ resolveWithObject: true });
  const png = await sharp(raw).png({ compressionLevel: 9 }).toBuffer();
  return { png, pixelHash: createHash("sha256").update(data).digest("hex") };
}

interface TextItem { str: string; x: number; y: number; a: number; d: number }

async function pageText(doc: PdfDocument, pageNum: number): Promise<{ items: TextItem[]; width: number; height: number }> {
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items: TextItem[] = [];
  for (const it of content.items) {
    if (!("str" in it) || !it.str.trim()) continue;
    const [a, , , d, x, y] = it.transform as number[];
    items.push({ str: it.str, x, y, a, d });
  }
  return { items, width: vp.width, height: vp.height };
}

async function renderOldPacket(fx: Fixtures, mascot: string, baseline: boolean): Promise<number> {
  const content = JSON.parse(JSON.stringify(fx.oldPacket.content)) as PacketContent;
  const buf = await renderPacketPdf(propsFor(content, fx.oldPacket, mascot), "render-puzzles old packet");
  const pdfPath = path.join(OUT_DIR, "old-packet.pdf");
  await writeFile(pdfPath, buf);
  const doc = await loadPdf(pdfPath);
  const pages: { pixelHash: string; textHash: string }[] = [];
  let puzzlePage = -1;
  for (let p = 1; p <= doc.numPages; p++) {
    const { png, pixelHash } = await rasterPage(doc, p);
    const { items } = await pageText(doc, p);
    const text = items.map((i) => `${i.str}@${i.x.toFixed(1)},${i.y.toFixed(1)}`).join("|");
    pages.push({ pixelHash, textHash: createHash("sha256").update(text).digest("hex") });
    if (/FINDTHESEWORDS/i.test(items.map((i) => i.str).join("").replace(/\s+/g, ""))) {
      puzzlePage = p;
      await writeFile(path.join(OUT_DIR, "old-packet-puzzle-page.png"), png);
    }
  }
  if (baseline) {
    await writeFile(BASELINE_FILE, JSON.stringify({ pages }, null, 2));
    console.log(`Baseline saved: old packet, ${pages.length} pages (puzzle on page ${puzzlePage}).`);
    return pages.length;
  }
  let saved: { pages: { pixelHash: string; textHash: string }[] } | null = null;
  try {
    saved = JSON.parse(await readFile(BASELINE_FILE, "utf8"));
  } catch {
    fail("old packet: no baseline saved (run with --baseline on the old code first)");
    return pages.length;
  }
  if (!saved) return pages.length;
  if (saved.pages.length !== pages.length) fail(`old packet: ${pages.length} pages, baseline had ${saved.pages.length}`);
  const changed = pages.map((pg, i) => (saved!.pages[i] && (saved!.pages[i].pixelHash !== pg.pixelHash || saved!.pages[i].textHash !== pg.textHash) ? i + 1 : 0)).filter(Boolean);
  if (changed.length) fail(`old packet: pages ${changed.join(", ")} differ from the baseline`);
  console.log(`Old packet: ${pages.length} pages, ${changed.length === 0 ? "identical to the baseline (pixels and text)" : `CHANGED pages ${changed.join(", ")}`}. Puzzle page: tmp-renders/puzzle-rotation/old-packet-puzzle-page.png`);
  return pages.length;
}

/**
 * Renders the puzzle inside a whole real packet (the old packet fixture with
 * its puzzle break swapped for this one), so the page sits in the same
 * document it will in production. (A tiny document of just the puzzle page
 * loses react-pdf's "N of M" footer entirely; that quirk predates this work.)
 */
const SHEET_TITLE = /Answerkeyandteachingnotes/i;

interface PageCounts {
  /** Pages before the parent sheet. */
  kid: number;
  /** Parent sheet pages. */
  sheet: number;
}

/** Kid pages and parent sheet pages of the old packet rendered at a given grade, cached per grade. */
const oldCounts = new Map<string, PageCounts>();
async function oldPageCountAt(packet: PacketContent, gradeLevel: string, mascot: string): Promise<PageCounts> {
  const cached = oldCounts.get(gradeLevel);
  if (cached !== undefined) return cached;
  const content = JSON.parse(JSON.stringify(packet)) as PacketContent;
  const buf = await renderPacketPdf(propsFor(content, { childName: "Marcus", gradeLevel, theme: "Pirates" }, mascot), `render-puzzles old at ${gradeLevel}`);
  const pdfPath = path.join(OUT_DIR, `old-packet-grade-${gradeLevel}.pdf`);
  await writeFile(pdfPath, buf);
  const doc = await loadPdf(pdfPath);
  const counts = await pageCounts(doc);
  oldCounts.set(gradeLevel, counts);
  return counts;
}

async function pageCounts(doc: PdfDocument): Promise<PageCounts> {
  const start = await findPage(doc, SHEET_TITLE);
  return start === -1 ? { kid: doc.numPages, sheet: 0 } : { kid: start - 1, sheet: doc.numPages - start + 1 };
}

async function findPage(doc: PdfDocument, pattern: RegExp): Promise<number> {
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await pageText(doc, p);
    if (pattern.test(items.map((i) => i.str).join("").replace(/\s+/g, ""))) return p;
  }
  return -1;
}

/** Whole sentences, in order, for as long as they fit in `cap`. */
function sentencesUpTo(cap: number, sentences: string[]): string {
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > cap) break;
    out = next;
  }
  return out;
}

/** The longest line from `options` that fits in `cap`. */
function longestFitting(cap: number, options: string[]): string {
  return options.filter((o) => o.length <= cap).sort((a, b) => b.length - a.length)[0];
}

type Variant = "normal" | "max" | "overflow";

/**
 * "max": every text block as long as its cap allows, in whole sentences, and
 * a two line title. "overflow": every block over its cap, so the page must
 * use the stock intro, leave out the Did You Know, and show the
 * encouragement callout in place of the joke.
 */
function varied(activity: Record<string, unknown>, f: PuzzleFixture, variant: Variant): Record<string, unknown> {
  if (variant === "normal") return activity;
  const caps = PUZZLE_TEXT_CAPS[bandForGrade(f.gradeLevel)];
  const title = "The Extraordinary Expedition Across Mysterious Lands";
  if (variant === "overflow") {
    const tooLong = `${f.childName}, this puzzle is packed with tricky turns and hidden surprises so take your time and check every single corner twice because you have solved much harder and trickier puzzles than this one before today, so there is truly nothing here that you cannot figure out.`;
    return {
      ...activity,
      title,
      puzzle_intro: tooLong,
      fun_fact: "Scientists who study this keep finding surprises, and one of the strangest is that the tiniest details often turn out to explain the very biggest mysteries of all, which is why careful observers notice so much.",
      joke: {
        question: "Why did the very curious young explorer decide to pack a second shiny compass for the long winding trip home?",
        punchline: "Because the first one kept pointing toward the snacks!",
      },
    };
  }
  return {
    ...activity,
    title,
    puzzle_intro: sentencesUpTo(caps.introChars, [
      `${f.childName}, this puzzle is packed with tricky turns.`,
      "Take your time and check every corner twice.",
      "Trust your sharp eyes.",
      "You have solved harder things than this before.",
      "Go slow and enjoy it.",
      "You can do it!",
    ]),
    fun_fact: sentencesUpTo(caps.factChars, [
      "Scientists who study this keep finding surprises.",
      "The tiniest details often explain the biggest mysteries.",
      "Careful observers notice the most.",
      "That is why they keep looking.",
      "Wow!",
    ]),
    joke: {
      question: longestFitting(caps.jokeQuestionChars, [
        "Why did the explorer pack a second compass?",
        "Why did the explorer pack a second compass for the trip?",
        "Why did the curious explorer pack a second compass for the long trip?",
        "Why did the very curious explorer pack a second compass for the long trip home?",
      ]),
      punchline: longestFitting(caps.jokePunchlineChars, [
        "The first one was lost!",
        "The first one kept pointing at snacks!",
        "Because the first one kept pointing at the snacks!",
        "Because the first one kept pointing straight at the snacks!",
      ]),
    },
  };
}

const ENDS_A_SENTENCE = /[.!?]["'”’)\]]*$/;

async function renderPuzzle(f: PuzzleFixture, packet: PacketContent, mascot: string, variant: Variant = "normal"): Promise<string> {
  const content = JSON.parse(JSON.stringify(packet)) as PacketContent;
  const index = content.activities.findIndex((a) => a.content_type === "puzzle_break");
  const raw = varied(JSON.parse(JSON.stringify(f.activity)) as Record<string, unknown>, f, variant);
  content.activities[index] = raw as unknown as PDFActivity;
  content.packet_title = f.packetTitle ?? f.theme;
  content.mascot_name = f.mascotName ?? content.mascot_name;
  const sourceIntro = String(raw.puzzle_intro ?? "");
  const sourceFact = String(raw.fun_fact ?? "");
  const r = attachPuzzleBreak(content, { requestedType: f.type, gradeLevel: f.gradeLevel, childName: f.childName, theme: f.theme, seed: 20261001 });
  const suffix = variant === "normal" ? "" : `-${variant}`;
  const name = `${f.band}-${f.type}${suffix}`;
  const label = `${f.band} ${f.type}${variant === "normal" ? "" : ` (${variant})`}`;
  if (r.builtType !== f.type) fail(`${label}: built ${r.builtType ?? "nothing"}`);

  // Text is only ever whole sentences: the source's own sentences from the
  // start, or the stock intro; never a cut sentence and nothing added.
  const act = content.activities[index] as PDFActivity;
  const intro = act.puzzle?.intro ?? "";
  const stock = Array.from({ length: 4 }, (_, i) => stockIntro(f.childName.split(" ")[0], content.mascot_name, i));
  if (!ENDS_A_SENTENCE.test(intro)) fail(`${label}: intro doesn't end a sentence: "${intro}"`);
  if (!stock.includes(intro) && !sourceIntro.startsWith(intro)) fail(`${label}: intro isn't the model's own opening sentences: "${intro}"`);
  if (act.fun_fact) {
    if (!ENDS_A_SENTENCE.test(act.fun_fact)) fail(`${label}: Did You Know doesn't end a sentence: "${act.fun_fact}"`);
    if (!sourceFact.startsWith(act.fun_fact)) fail(`${label}: Did You Know isn't the model's own opening sentences`);
  }
  if (variant === "overflow") {
    if (!stock.includes(intro)) fail(`${label}: an intro over the cap should become a stock line`);
    if (act.fun_fact) fail(`${label}: a Did You Know over the cap should be left out`);
    if (act.puzzle?.joke) fail(`${label}: a joke over the cap should be dropped`);
    if (!act.encouragement) fail(`${label}: no encouragement in place of the dropped joke`);
  }

  const buf = await renderPacketPdf(propsFor(content, f, mascot), `render-puzzles ${label}`);
  const pdfPath = path.join(OUT_DIR, `${name}.pdf`);
  await writeFile(pdfPath, buf);
  const doc = await loadPdf(pdfPath);
  // Same page count as the same packet with the old one page word search, at
  // the same grade: a puzzle that spilled onto a second page would add one.
  // Same kid page count as the same packet with the old one page word search,
  // at the same grade: a puzzle that spilled onto a second page would add one.
  const old = await oldPageCountAt(packet, f.gradeLevel, mascot);
  const now = await pageCounts(doc);
  if (now.kid !== old.kid) fail(`${label}: ${now.kid} kid pages, expected ${old.kid} (puzzle on exactly one page)`);
  // The parent sheet may flow onto a second page; checkSheet below makes
  // sure the puzzle block never splits and every footer total is right.
  const joke = act.puzzle?.joke ?? null;
  const marker = joke ? /JOKEOFTHEDAY/i : new RegExp((act.encouragement ?? "").replace(/\s+/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 30));
  const PUZZLE_PAGE = await findPage(doc, marker);
  if (PUZZLE_PAGE === -1) {
    fail(`${label}: can't find the puzzle page`);
    return "";
  }
  const { png } = await rasterPage(doc, PUZZLE_PAGE);
  const pngPath = path.join(OUT_DIR, `${name}.png`);
  await writeFile(pngPath, png);

  const { items, width, height } = await pageText(doc, PUZZLE_PAGE);
  if (Math.abs(width - 612) > 0.5 || Math.abs(height - 792) > 0.5) fail(`${label}: page is ${width.toFixed(1)} x ${height.toFixed(1)} pt, not letter (612 x 792)`);
  // Footer sits at 20pt from the bottom; everything else must stay inside the
  // band's page padding (the joke's text sits at least its box padding above it).
  const MARGIN = PAGE_PADDING[bandForGrade(f.gradeLevel)] + 8;
  for (const it of items) {
    const isFooter = /Made with love|^\d+ of \d+$/.test(it.str.trim());
    const minY = isFooter ? 10 : MARGIN;
    if (it.y < minY || it.y > height - 20 || it.x < 20 || it.x > width - 20) {
      fail(`${label}: text "${it.str.slice(0, 30)}" at ${it.x.toFixed(0)},${it.y.toFixed(0)} is outside the page content`);
    }
  }
  void old;
  const pageString = items.map((i) => i.str).join("").replace(/\s+/g, "");
  if (joke) {
    const firstWord = joke.punchline.split(/\s+/)[0];
    const flipped = items.filter((i) => i.a < 0 && i.d < 0);
    if (!flipped.some((i) => i.str.includes(firstWord) || joke.punchline.includes(i.str.trim()))) fail(`${label}: punchline not found drawn upside down`);
    const upright = items.filter((i) => i.a > 0 && i.str.includes(joke.punchline));
    if (upright.length) fail(`${label}: punchline printed right side up on the kid page`);
  } else if (!pageString.includes((act.encouragement ?? "").replace(/\s+/g, ""))) {
    fail(`${label}: no joke and no encouragement callout`);
  }

  await checkFooters(doc, now, label);
  if (variant === "normal") await checkSheet(doc, now, label, joke, `${f.band}-${f.type}`, act.puzzle?.data.type ?? "");
  return path.relative(REPO_ROOT, pngPath);
}

const answerKeyPaths: string[] = [];

/**
 * A packet whose parent sheet must run to two pages: the fixture packet with
 * answer keys added to the activities that had none (copies of its own real
 * keys), and the 6-8 word search. Checks the sheet flows to a second page,
 * the puzzle block stays whole, and every kid footer shows the real total.
 */
async function renderSpillTest(fx: Fixtures, mascot: string): Promise<void> {
  const content = JSON.parse(JSON.stringify(fx.oldPacket.content)) as PacketContent;
  const keys = content.activities.map((a) => a.answer_key).filter((k): k is string => !!k);
  content.activities.forEach((a, i) => {
    if (!a.answer_key && a.content_type !== "puzzle_break") a.answer_key = keys[i % keys.length];
  });
  const f = fx.puzzles.find((p) => p.band === "6-8" && p.type === "word_search")!;
  const index = content.activities.findIndex((a) => a.content_type === "puzzle_break");
  content.activities[index] = JSON.parse(JSON.stringify(f.activity));
  attachPuzzleBreak(content, { requestedType: f.type, gradeLevel: f.gradeLevel, childName: f.childName, theme: f.theme, seed: 20261001 });
  const buf = await renderPacketPdf(propsFor(content, f, mascot), "render-puzzles spill test");
  const pdfPath = path.join(OUT_DIR, "spill-test.pdf");
  await writeFile(pdfPath, buf);
  const doc = await loadPdf(pdfPath);
  const now = await pageCounts(doc);
  if (now.sheet < 2) fail(`spill test: parent sheet is ${now.sheet} page, expected it to flow onto a second`);
  const footers = await checkFooters(doc, now, "spill test");
  const joke = content.activities[index].puzzle?.joke ?? null;
  await checkSheet(doc, now, "spill test", joke, "spill-test", "word_search");
  console.log(`
Spill test: ${doc.numPages} pages (${now.kid} kid pages + ${now.sheet} parent sheet pages). Kid footers: ${footers[0]} ... ${footers[footers.length - 1]}`);
}

const SUMMARY_LABEL: Record<string, string> = { word_search: "Wordsearch:", maze: "Maze:", sudoku: "Sudoku:", crossword: "Crossword:" };

/** Every kid page's footer must read "N of <real kid page count>". Returns the footers seen. */
async function checkFooters(doc: PdfDocument, now: PageCounts, label: string): Promise<string[]> {
  const seen: string[] = [];
  for (let p = 1; p <= now.kid; p++) {
    const { items } = await pageText(doc, p);
    const footer = items.map((i) => i.str.trim()).find((t) => /^\d+ of \d+$/.test(t));
    seen.push(footer ?? "(none)");
    if (footer !== `${p} of ${now.kid}`) fail(`${label}: page ${p} footer reads "${footer ?? "nothing"}", expected "${p} of ${now.kid}"`);
  }
  return seen;
}

/**
 * Saves the parent sheet (answer-keys/<name>.png, or -p1/-p2 when it runs
 * to two pages) and checks the puzzle entry: present, all on one page
 * (label, summary, and punchline together), punchline right side up.
 */
async function checkSheet(doc: PdfDocument, now: PageCounts, label: string, joke: { punchline: string } | null, name: string, type: string): Promise<void> {
  if (now.sheet === 0) {
    fail(`${label}: no parent sheet`);
    return;
  }
  await mkdir(path.join(OUT_DIR, "answer-keys"), { recursive: true });
  let puzzlePage = -1;
  for (let p = now.kid + 1; p <= doc.numPages; p++) {
    const { png } = await rasterPage(doc, p);
    const suffix = now.sheet > 1 ? `-p${p - now.kid}` : "";
    const sheetPath = path.join(OUT_DIR, "answer-keys", `${name}${suffix}.png`);
    await writeFile(sheetPath, png);
    answerKeyPaths.push(path.relative(REPO_ROOT, sheetPath));
    const { items } = await pageText(doc, p);
    const flat = items.map((i) => i.str).join("").replace(/\s+/g, "");
    if (items.some((i) => i.a < 0)) fail(`${label}: something is upside down on the parent sheet`);
    if (/PUZZLEBREAK/i.test(flat)) {
      puzzlePage = p;
      // The block is one unbreakable unit: its summary and joke share the label's page.
      if (!flat.includes(SUMMARY_LABEL[type] ?? "")) fail(`${label}: puzzle answer split across pages (summary not with its label)`);
      if (joke && !flat.includes(joke.punchline.replace(/\s+/g, ""))) fail(`${label}: puzzle answer split across pages (punchline not with its label)`);
    }
  }
  if (puzzlePage === -1) fail(`${label}: no Puzzle Break entry on the parent sheet`);
}

async function main() {
  const baseline = process.argv.includes("--baseline");
  await mkdir(OUT_DIR, { recursive: true });
  const fx = JSON.parse(await readFile(path.join(REPO_ROOT, "scripts", "fixtures", "puzzle-rotation.json"), "utf8")) as Fixtures;
  const mascot = await mascotDataUri();

  const oldPageCount = await renderOldPacket(fx, mascot, baseline);
  if (baseline) return;

  const written: string[] = [];
  void oldPageCount;
  for (const f of fx.puzzles) written.push(await renderPuzzle(f, fx.oldPacket.content, mascot));
  // Worst cases: every text block at its cap ("-max.png"), and every block
  // over its cap ("-overflow.png").
  for (const f of fx.puzzles) written.push(await renderPuzzle(f, fx.oldPacket.content, mascot, "max"));
  for (const f of fx.puzzles) written.push(await renderPuzzle(f, fx.oldPacket.content, mascot, "overflow"));
  await renderSpillTest(fx, mascot);
  console.log("\nPuzzle pages:");
  for (const w of written) console.log(`  ${w}`);
  console.log("\nParent sheets:");
  for (const w of answerKeyPaths) console.log(`  ${w}`);

  if (failures.length) {
    process.stderr.write(`\nPUZZLE RENDER CHECK FAILED (${failures.length}):\n`);
    for (const f of failures) process.stderr.write(`  ${f}\n`);
    process.exit(1);
  }
  console.log(`\nAll ${fx.puzzles.length} puzzle pages and their max and overflow versions: one page each, nothing outside the margins, whole sentences only, punchline upside down or the encouragement callout.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

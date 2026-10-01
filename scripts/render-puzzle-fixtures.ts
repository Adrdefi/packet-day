/**
 * Renders the puzzle break fixtures to PNGs for review. Local only: no
 * database, no API calls, no images fetched.
 *
 *   npm run render-puzzles
 *   npm run render-puzzles -- --baseline   (old path only, saved as the baseline)
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
import { PUZZLE_TEXT_CAPS } from "../lib/puzzles/textCaps";
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
/** Page count of the old packet rendered at a given grade, cached per grade. */
const oldCounts = new Map<string, number>();
async function oldPageCountAt(packet: PacketContent, gradeLevel: string, mascot: string): Promise<number> {
  const cached = oldCounts.get(gradeLevel);
  if (cached !== undefined) return cached;
  const content = JSON.parse(JSON.stringify(packet)) as PacketContent;
  const buf = await renderPacketPdf(propsFor(content, { childName: "Marcus", gradeLevel, theme: "Pirates" }, mascot), `render-puzzles old at ${gradeLevel}`);
  const pdfPath = path.join(OUT_DIR, `old-packet-grade-${gradeLevel}.pdf`);
  await writeFile(pdfPath, buf);
  const n = (await loadPdf(pdfPath)).numPages;
  oldCounts.set(gradeLevel, n);
  return n;
}

async function findPage(doc: PdfDocument, pattern: RegExp): Promise<number> {
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await pageText(doc, p);
    if (pattern.test(items.map((i) => i.str).join("").replace(/\s+/g, ""))) return p;
  }
  return -1;
}

/** Words added one at a time while the line stays within `cap` characters (with `end` appended). */
function fillTo(cap: number, words: string, end: string): string {
  let out = "";
  for (const w of words.split(" ")) {
    const next = out ? `${out} ${w}` : w;
    if (next.length + end.length > cap) break;
    out = next;
  }
  return out + end;
}

/** The worst case the page must still fit: every text block at its cap and a two line title. */
function stressed(activity: Record<string, unknown>, f: PuzzleFixture): Record<string, unknown> {
  const caps = PUZZLE_TEXT_CAPS[bandForGrade(f.gradeLevel)];
  return {
    ...activity,
    title: "The Extraordinary Expedition Across Mysterious Lands",
    puzzle_intro: fillTo(
      caps.introChars,
      `${f.childName}, this puzzle is packed with tricky turns and hidden surprises, so take your time, check every corner twice, and trust your sharp eyes because you have solved harder things than this before today and you will solve this one too`,
      "!"
    ),
    fun_fact: fillTo(
      caps.factChars,
      "Scientists who study this keep finding surprises, and one of the strangest is that the tiniest details often turn out to explain the biggest mysteries of all, which is why careful observers notice so much more than everyone else",
      "."
    ),
    joke: {
      question: fillTo(caps.jokeQuestionChars, "Why did the very curious young explorer pack a second shiny compass for the long winding trip home", "?"),
      punchline: fillTo(caps.jokePunchlineChars, "Because the first one kept pointing straight toward the snack cupboard all day long", "!"),
    },
  };
}

async function renderPuzzle(f: PuzzleFixture, packet: PacketContent, mascot: string, stress = false): Promise<string> {
  const content = JSON.parse(JSON.stringify(packet)) as PacketContent;
  const index = content.activities.findIndex((a) => a.content_type === "puzzle_break");
  const raw = JSON.parse(JSON.stringify(f.activity)) as Record<string, unknown>;
  content.activities[index] = (stress ? stressed(raw, f) : raw) as unknown as PDFActivity;
  content.packet_title = f.packetTitle ?? f.theme;
  content.mascot_name = f.mascotName ?? content.mascot_name;
  const r = attachPuzzleBreak(content, { requestedType: f.type, gradeLevel: f.gradeLevel, childName: f.childName, theme: f.theme, seed: 20261001 });
  const name = `${f.band}-${f.type}${stress ? "-stress" : ""}`;
  const label = `${f.band} ${f.type}${stress ? " (stress)" : ""}`;
  if (r.builtType !== f.type) fail(`${label}: built ${r.builtType ?? "nothing"}`);

  const buf = await renderPacketPdf(propsFor(content, f, mascot), `render-puzzles ${label}`);
  const pdfPath = path.join(OUT_DIR, `${name}.pdf`);
  await writeFile(pdfPath, buf);
  const doc = await loadPdf(pdfPath);
  // Same page count as the same packet with the old one page word search, at
  // the same grade: a puzzle that spilled onto a second page would add one.
  const oldPageCount = await oldPageCountAt(packet, f.gradeLevel, mascot);
  if (doc.numPages !== oldPageCount) fail(`${label}: ${doc.numPages} pages, expected ${oldPageCount} (puzzle on exactly one page)`);
  const PUZZLE_PAGE = await findPage(doc, /JOKEOFTHEDAY/i);
  if (PUZZLE_PAGE === -1) {
    fail(`${label}: no page with the Joke of the Day`);
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
  const kidPages = oldPageCount - 1; // the parent sheet isn't counted
  if (!items.some((it) => it.str.trim() === `${PUZZLE_PAGE} of ${kidPages}`)) fail(`${label}: page number "${PUZZLE_PAGE} of ${kidPages}" missing from the footer`);
  const joke = (content.activities[index] as PDFActivity).puzzle?.joke;
  if (joke) {
    const firstWord = joke.punchline.split(/\s+/)[0];
    const flipped = items.filter((i) => i.a < 0 && i.d < 0);
    if (!flipped.some((i) => i.str.includes(firstWord) || joke.punchline.includes(i.str.trim()))) fail(`${label}: punchline not found drawn upside down`);
    const upright = items.filter((i) => i.a > 0 && i.str.includes(joke.punchline));
    if (upright.length) fail(`${label}: punchline printed right side up on the kid page`);
  } else {
    fail(`${label}: no joke`);
  }
  return path.relative(REPO_ROOT, pngPath);
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
  // Worst case: every text block at its cap. Saved as <band>-<type>-stress.png.
  for (const f of fx.puzzles) written.push(await renderPuzzle(f, fx.oldPacket.content, mascot, true));
  console.log("\nPuzzle pages:");
  for (const w of written) console.log(`  ${w}`);

  if (failures.length) {
    process.stderr.write(`\nPUZZLE RENDER CHECK FAILED (${failures.length}):\n`);
    for (const f of failures) process.stderr.write(`  ${f}\n`);
    process.exit(1);
  }
  console.log(`\nAll ${fx.puzzles.length} puzzle pages and their worst case versions: one page each, nothing outside the margins, punchline upside down.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Fleet-wide packet PDF render sweep.
 *
 * Renders every packet in the DB through the same read-only path as
 * app/api/dev-render-packet/route.ts — service-role client, no writes, no
 * Storage upload, no pdf_url mutation — and reports, per packet: page count,
 * render success/failure, render time, and a blank-page count. It also runs
 * the dropped-leading-character detector (see CLAUDE.md's react-pdf gotchas,
 * "A leading capital R can be silently deleted...") across every question,
 * fun fact, encouragement, and description string, comparing what the DB
 * actually stored against what got painted into the PDF.
 *
 * This is a committed, permanent tool. The 80-packet sweep from chunks 6-9
 * of the PDF rebuild was rebuilt from scratch three times because it only
 * ever lived in an ephemeral scratchpad and was never checked in — this
 * file exists so that stops happening.
 *
 * USAGE
 * -----
 *   npx dotenv -e .env.local -- npx tsx scripts/sweep-packets.ts [--limit N]
 *
 * (Node 24+ can also run it natively via `node scripts/sweep-packets.ts`
 * with the same dotenv prefix, without tsx, if that's ever preferred — see
 * package.json's existing scripts/*.ts files for the established `npx tsx`
 * convention this repo already uses.)
 *
 *   --limit N   Only sweep the first N packets (by id order from the DB).
 *               Useful for a quick smoke-test before committing to a full
 *               fleet run.
 *
 * PREREQUISITES
 * -------------
 * - .env.local must have NEXT_PUBLIC_SUPABASE_URL and
 *   SUPABASE_SERVICE_ROLE_KEY set, same as any other server-side script in
 *   this repo.
 * - No dev server needed. This renders directly in-process via
 *   @react-pdf/renderer, the same way app/api/dev-render-packet/route.ts
 *   does — it does not call that route or need it running.
 * - KNOWN ISSUE, pre-existing and not specific to this file: as of writing,
 *   `npx tsx` on this machine (tsx 4.23.13, Node 24.14.1) fails on ANY
 *   script that imports @react-pdf/renderer — including the already
 *   -committed scripts/test-pdf.ts, not just this one — with
 *   `ERR_PACKAGE_PATH_NOT_EXPORTED` on @react-pdf/hyphenate's `/en-us`
 *   subpath. Plain `node scripts/sweep-packets.ts` fails too, for an
 *   unrelated reason (ESM resolution needs explicit file extensions on
 *   relative imports, which this repo's extensionless-import style doesn't
 *   have). Neither was fixed here — the fix is a tsx-version or Node-version
 *   decision (or pinning tsx as a real devDependency instead of `npx`
 *   fetching latest each time) that's bigger than this script and affects
 *   every file in scripts/, not something to do silently as a side effect of
 *   adding one more script to that directory.
 * - If you're re-running this specifically to chase a dropped-character
 *   report from a previous sweep, see CLAUDE.md's react-pdf gotchas first —
 *   clear .next and Node's own compile cache
 *   (%LOCALAPPDATA%\Temp\node-compile-cache on Windows, present on Node 22+)
 *   before the first trial. A stale compile has previously produced an
 *   unexplained non-reproduction gap on this exact bug class; don't let a
 *   sweep result go stale for the same reason.
 *
 * OUTPUT
 * ------
 * Writes a full JSON report to sweep-output/sweep-<timestamp>.json
 * (gitignored) and prints a summary to stdout. Stdout never carries packet
 * content beyond the single mismatched word needed to identify a flagged
 * finding — full passages, instructions, etc. never get printed. The JSON
 * report is more generous (a short snippet around each finding, not full
 * field text) since it's local-only and gitignored, but it isn't a full
 * content dump either.
 *
 * HOW THE DETECTOR WORKS
 * -----------------------
 * There's no PyMuPDF-equivalent library available in this Node/TypeScript
 * toolchain, and adding one — or shelling out to Python — was deliberately
 * avoided: this needs to keep working for whoever runs it next without
 * undocumented system dependencies. So this file includes a small, hand
 * -rolled PDF content-stream reader (object/stream extraction, FlateDecode
 * via Node's built-in zlib, a ToUnicode CMap parser, and a Tf/Td/Tm/Tj/TJ
 * operator walk) — see the "PDF INTROSPECTION" section below. It is not a
 * general-purpose PDF parser and doesn't try to be; it's scoped to what
 * @react-pdf/renderer (built on pdfkit) actually emits, which this repo's
 * own rendered output was used to validate it against.
 *
 * Detection runs in two tiers, mirroring the pixel-verification discipline
 * from the original investigation (six of eight suspected drops in that
 * investigation turned out to be extraction noise — never trust a text
 * match alone):
 *   1. FLAG — locate each source string's first word in the page's
 *      extracted text via a tail-anchored substring search (skips the
 *      position that would be corrupted, so it still finds the right spot
 *      even when a character truly is missing), then check whether the
 *      character immediately before that anchor matches the source's real
 *      first character. Any mismatch is flagged. This step is deliberately
 *      permissive — false positives are expected and are what step 2 is for.
 *   2. VERIFY — for a flagged candidate, re-check the specific text run's
 *      raw glyph count (the number of 2-byte glyph codes actually emitted
 *      in the Tj/TJ operator, independent of whether ToUnicode decoding
 *      succeeded) against its decoded text length. If they're equal, the
 *      decode for that run is self-consistent and the flag is reported as
 *      CONFIRMED. If they disagree (can happen with ligatures or other
 *      multi-unit mappings, none expected in Nunito/Fraunces Latin text but
 *      not assumed away), it's reported as SUSPECTED — needs a human pixel
 *      check, same as the original investigation's method, before acting
 *      on it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { inflateSync } from "zlib";
import fs from "fs";
import path from "path";
import PacketPDF from "../components/PacketPDF";
import type { PacketPDFProps, PDFActivity, PDFColoringPage } from "../components/PacketPDF";
import type { PacketContent } from "../types";

// ─── Config ─────────────────────────────────────────────────────────────────

const OUT_DIR = path.join(__dirname, "..", "sweep-output");

// ─── CLI args ───────────────────────────────────────────────────────────────

function parseLimit(): number | null {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1) return null;
  const n = parseInt(process.argv[idx + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ─── Supabase (service-role, read-only — same as dev-render-packet) ─────────

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Run via: npx dotenv -e .env.local -- npx tsx scripts/sweep-packets.ts");
    process.exit(1);
  }
  return createClient(url, key);
}

interface PacketRow {
  id: string;
  child_name: string;
  grade_level: string;
  theme: string;
  created_at: string;
  generated_content: PacketContent;
  mascot_image_url: string | null;
  coloring_image_url: string | null;
  children: { avatar_emoji: string; special_notes: string | null } | null;
}

function buildProps(packet: PacketRow): PacketPDFProps {
  const content = packet.generated_content;
  const gradeDisplay = packet.grade_level === "K" ? "Kindergarten" : `Grade ${packet.grade_level}`;
  return {
    childName: packet.child_name,
    childEmoji: packet.children?.avatar_emoji ?? "🌟",
    childGrade: gradeDisplay,
    theme: packet.theme,
    title: content.packet_title ?? content.title ?? packet.theme,
    activities: content.activities as PDFActivity[],
    createdAt: packet.created_at,
    mascotImageUrl: packet.mascot_image_url ?? null,
    coloringImageUrl: packet.coloring_image_url ?? null,
    mascotName: content.mascot_name ?? null,
    coloringPage: content.coloring_page ? (content.coloring_page as PDFColoringPage) : null,
    greeting: content.greeting ?? null,
    parentNotes: content.parent_notes ?? null,
    dailyReflection: content.daily_reflection ?? null,
    packetMission: content.packet_mission ?? null,
    packetCelebration: content.packet_celebration ?? null,
  };
}

// ─── PDF INTROSPECTION ────────────────────────────────────────────────────────
// Scoped to what @react-pdf/renderer (pdfkit) actually emits — not a general
// PDF parser. See the file header for why this exists instead of a library.

interface PdfObject {
  num: number;
  dictText: string;
  streamBytes: Buffer | null;
}

/** Scans the whole buffer for `N G obj ... endobj` — doesn't trust the xref
 * table's offsets, since a lightweight scan is more robust to any xref
 * quirks and this only ever needs to run against our own generator's output. */
function parsePdfObjects(buf: Buffer): Map<number, PdfObject> {
  // latin1 preserves each byte as one char 1:1, so string indices below are
  // valid byte offsets into the original buffer — safe for binary slicing.
  const text = buf.toString("latin1");
  const objects = new Map<number, PdfObject>();
  const objRe = /(\d+)\s+\d+\s+obj\b/g;
  let match: RegExpExecArray | null;
  while ((match = objRe.exec(text))) {
    const num = parseInt(match[1], 10);
    const bodyStart = match.index + match[0].length;
    const endObjIdx = text.indexOf("endobj", bodyStart);
    if (endObjIdx === -1) continue;
    const body = text.slice(bodyStart, endObjIdx);

    const streamKeywordIdx = body.indexOf("stream");
    let dictText = body;
    let streamBytes: Buffer | null = null;
    if (streamKeywordIdx !== -1) {
      dictText = body.slice(0, streamKeywordIdx);
      let dataStart = bodyStart + streamKeywordIdx + "stream".length;
      if (text[dataStart] === "\r") dataStart++;
      if (text[dataStart] === "\n") dataStart++;
      const endStreamIdx = text.indexOf("endstream", dataStart);
      if (endStreamIdx !== -1) {
        streamBytes = buf.subarray(dataStart, endStreamIdx);
      }
    }
    objects.set(num, { num, dictText, streamBytes });
  }
  return objects;
}

function getStreamData(obj: PdfObject): Buffer | null {
  if (!obj.streamBytes) return null;
  if (/\/Filter\s*\/FlateDecode/.test(obj.dictText)) {
    try {
      return inflateSync(obj.streamBytes);
    } catch {
      return null;
    }
  }
  return obj.streamBytes;
}

function findRef(dictText: string, key: string): number | null {
  const m = new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`).exec(dictText);
  return m ? parseInt(m[1], 10) : null;
}

function findRefArray(dictText: string, key: string): number[] {
  const arrM = new RegExp(`/${key}\\s*\\[([^\\]]*)\\]`).exec(dictText);
  if (!arrM) {
    const single = findRef(dictText, key);
    return single !== null ? [single] : [];
  }
  const nums: number[] = [];
  const re = /(\d+)\s+\d+\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(arrM[1]))) nums.push(parseInt(m[1], 10));
  return nums;
}

/** Extracts the `<< ... >>` block following `/key`, tracking nesting depth
 * (needed for e.g. `/Resources << /Font << ... >> >>`). */
function findSubDict(dictText: string, key: string): string | null {
  const idx = dictText.indexOf(`/${key}`);
  if (idx === -1) return null;
  const openIdx = dictText.indexOf("<<", idx);
  if (openIdx === -1) return null;
  let depth = 0;
  for (let i = openIdx; i < dictText.length - 1; i++) {
    if (dictText[i] === "<" && dictText[i + 1] === "<") {
      depth++;
      i++;
    } else if (dictText[i] === ">" && dictText[i + 1] === ">") {
      depth--;
      i++;
      if (depth === 0) return dictText.slice(openIdx + 2, i - 1);
    }
  }
  return null;
}

/** Resolves `/key` to its dictionary text whether it's inline (`/key << ...
 * >>`) or an indirect reference (`/key N G R`) — pdfkit emits Resources as
 * an indirect reference (shared across pages), not inline, so this matters. */
function resolveDictRef(dictText: string, key: string, objects: Map<number, PdfObject>): string | null {
  const refNum = findRef(dictText, key);
  if (refNum !== null) {
    const target = objects.get(refNum);
    return target ? target.dictText : null;
  }
  return findSubDict(dictText, key);
}

function findFontResourceRefs(resourcesDict: string): Map<string, number> {
  const fontDict = findSubDict(resourcesDict, "Font");
  const map = new Map<string, number>();
  if (!fontDict) return map;
  const re = /\/(\w+)\s+(\d+)\s+\d+\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fontDict))) map.set(m[1], parseInt(m[2], 10));
  return map;
}

function hexToUnicodeString(hex: string): string {
  // Strip internal whitespace — a single ToUnicode destination entry can be
  // multiple hex groups separated by spaces (e.g. `<0066 0069>` for the "fi"
  // ligature: two UTF-16 code units, one destination), not just one.
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 4 <= clean.length; i += 4) {
    out += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
  }
  return out;
}

/** Parses a ToUnicode CMap stream's bfchar/bfrange sections into a
 * glyph-code(hex, uppercase) -> decoded-Unicode-string map. */
function parseToUnicodeCMap(cmapText: string): Map<string, string> {
  const map = new Map<string, string>();

  const charBlockRe = /beginbfchar([\s\S]*?)endbfchar/g;
  let block: RegExpExecArray | null;
  while ((block = charBlockRe.exec(cmapText))) {
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f\s]+)>/g;
    let pair: RegExpExecArray | null;
    while ((pair = pairRe.exec(block[1]))) {
      map.set(pair[1].toUpperCase(), hexToUnicodeString(pair[2]));
    }
  }

  const rangeBlockRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((block = rangeBlockRe.exec(cmapText))) {
    const lineRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g;
    let line: RegExpExecArray | null;
    while ((line = lineRe.exec(block[1]))) {
      const width = line[1].length;
      const lo = parseInt(line[1], 16);
      const hi = parseInt(line[2], 16);
      if (line[3]) {
        const dstLo = parseInt(line[3], 16);
        for (let code = lo; code <= hi; code++) {
          const srcHex = code.toString(16).toUpperCase().padStart(width, "0");
          const dstHex = (dstLo + (code - lo)).toString(16).padStart(line[3].length, "0");
          map.set(srcHex, hexToUnicodeString(dstHex));
        }
      } else if (line[4]) {
        const dsts = [...line[4].matchAll(/<([0-9A-Fa-f\s]+)>/g)].map((mm) => mm[1]);
        for (let i = 0; i < dsts.length && lo + i <= hi; i++) {
          const srcHex = (lo + i).toString(16).toUpperCase().padStart(width, "0");
          map.set(srcHex, hexToUnicodeString(dsts[i]));
        }
      }
    }
  }

  return map;
}

interface TextRun {
  text: string;
  glyphCount: number;
  // Raw Tm/Td operands in whatever nested `cm`-transformed coordinate space
  // the run happened to be drawn in. This reader does not compose pdfkit's
  // cm/q/Q transform stack, so these are NOT reliable absolute page
  // coordinates — informational only (included in a Finding for a human to
  // orient themselves), never load-bearing for the detector's own logic,
  // which is text-based throughout. See isBlankPage's comment for why.
  x: number;
  y: number;
}

/** Walks a decoded content stream's Tf/Td/Tm/Tj/TJ operators in order,
 * decoding each shown hex string through the font-resource-name -> CMap
 * table active at that point. Not a general content-stream tokenizer — it
 * pattern-matches these five operators specifically, which is what
 * pdfkit's text-drawing output actually uses. */
function extractTextRuns(contentText: string, fontToUnicode: Map<string, Map<string, string>>): TextRun[] {
  const runs: TextRun[] = [];
  let curFont = "";
  let curX = 0;
  let curY = 0;

  const tokenRe =
    /\/(\w+)\s+[\d.]+\s+Tf|(-?[\d.]+)\s+(-?[\d.]+)\s+Td|-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|<([0-9A-Fa-f]*)>\s*Tj|\[((?:[^[\]]|\[[^[\]]*\])*)\]\s*TJ/g;

  // Each individual <hex> chunk is decoded independently (own 4-char, i.e.
  // 2-byte-per-glyph, alignment) and only the DECODED TEXT is concatenated
  // across chunks — never the raw hex. A TJ array interleaves string chunks
  // with numeric kerning adjustments; joining the raw hex of multiple chunks
  // before splitting into 2-byte glyph codes would silently corrupt
  // alignment for every chunk after the first if any one chunk's own length
  // weren't a clean multiple of 4 (found empirically: it produced a
  // consistent off-by-some-bytes letter substitution across an entire page,
  // not just the known dropped-character bug this tool exists to catch —
  // decoding each chunk on its own avoids that class of bug entirely).
  const pushRun = (hexChunks: string[]) => {
    const map = fontToUnicode.get(curFont);
    let text = "";
    let glyphCount = 0;
    for (const hex of hexChunks) {
      for (let i = 0; i + 4 <= hex.length; i += 4) {
        const code = hex.slice(i, i + 4).toUpperCase();
        glyphCount++;
        text += map?.get(code) ?? "�";
      }
    }
    if (glyphCount > 0) runs.push({ text, glyphCount, x: curX, y: curY });
  };

  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(contentText))) {
    if (m[1] !== undefined) {
      curFont = m[1];
    } else if (m[2] !== undefined) {
      curX = parseFloat(m[2]);
      curY = parseFloat(m[3]);
    } else if (m[4] !== undefined) {
      curX = parseFloat(m[4]);
      curY = parseFloat(m[5]);
    } else if (m[6] !== undefined) {
      pushRun([m[6]]);
    } else if (m[7] !== undefined) {
      const hexParts = [...m[7].matchAll(/<([0-9A-Fa-f]*)>/g)].map((mm) => mm[1]);
      pushRun(hexParts);
    }
  }
  return runs;
}

interface PageData {
  pageNum: number; // 1-indexed
  runs: TextRun[];
}

/** Full per-page text-run extraction for a rendered PDF buffer. Walks the
 * page tree from the document Catalog (not object-number order — pdfkit
 * output likely happens to match, but the page tree is the actually-correct
 * source of visual page order). */
export function introspectPdf(buf: Buffer): { pageCount: number; pages: PageData[] } {
  const objects = parsePdfObjects(buf);

  let catalogNum: number | null = null;
  for (const obj of objects.values()) {
    if (/\/Type\s*\/Catalog\b/.test(obj.dictText)) {
      catalogNum = obj.num;
      break;
    }
  }
  if (catalogNum === null) return { pageCount: 0, pages: [] };
  const catalog = objects.get(catalogNum)!;
  const pagesRootNum = findRef(catalog.dictText, "Pages");
  if (pagesRootNum === null) return { pageCount: 0, pages: [] };

  const pageObjNums: number[] = [];
  const walkPagesNode = (num: number) => {
    const node = objects.get(num);
    if (!node) return;
    if (/\/Type\s*\/Pages\b/.test(node.dictText)) {
      for (const kid of findRefArray(node.dictText, "Kids")) walkPagesNode(kid);
    } else if (/\/Type\s*\/Page\b(?!s)/.test(node.dictText)) {
      pageObjNums.push(num);
    }
  };
  walkPagesNode(pagesRootNum);

  const pages: PageData[] = pageObjNums.map((pageNum, i) => {
    const pageObj = objects.get(pageNum)!;

    const fontToUnicode = new Map<string, Map<string, string>>();
    const resourcesDict = resolveDictRef(pageObj.dictText, "Resources", objects);
    if (resourcesDict) {
      for (const [resName, fontObjNum] of findFontResourceRefs(resourcesDict)) {
        const fontObj = objects.get(fontObjNum);
        if (!fontObj) continue;
        const toUnicodeNum = findRef(fontObj.dictText, "ToUnicode");
        if (toUnicodeNum === null) continue;
        const toUnicodeObj = objects.get(toUnicodeNum);
        if (!toUnicodeObj) continue;
        const cmapBytes = getStreamData(toUnicodeObj);
        if (!cmapBytes) continue;
        fontToUnicode.set(resName, parseToUnicodeCMap(cmapBytes.toString("latin1")));
      }
    }

    const contentRefs = findRefArray(pageObj.dictText, "Contents");
    let contentText = "";
    for (const ref of contentRefs) {
      const contentObj = objects.get(ref);
      if (!contentObj) continue;
      const data = getStreamData(contentObj);
      if (data) contentText += data.toString("latin1") + "\n";
    }

    return { pageNum: i + 1, runs: extractTextRuns(contentText, fontToUnicode) };
  });

  return { pageCount: pages.length, pages };
}

// Fixed footer text that appears on every page — see ChildPageFooter and
// ParentAnswerSheetPage's own footer in components/PacketPDF.tsx. Blank-page
// detection is text-based, not position-based: this file's content-stream
// reader doesn't compose the nested `cm`/`q`/`Q` transform stack pdfkit
// emits (confirmed present — a page's content starts with a Y-flip `cm`,
// then a translate, then a second nested Y-flip for the text group), so raw
// Tm/Td operands read off directly are NOT reliable absolute page
// coordinates. Matching known footer text sidesteps that entirely.
const FOOTER_MARKERS = ["Made with love by Packet Day", "packetday.com", "Parent sheet"];

/** A page counts as blank if, once the fixed footer text is stripped out,
 * nothing else was drawn on it. */
export function isBlankPage(page: PageData): boolean {
  let text = page.runs.map((r) => r.text).join("");
  for (const marker of FOOTER_MARKERS) text = text.split(marker).join("");
  text = text.replace(/\d+\s*of\s*\d+/gi, ""); // the "N of M" page-number render prop
  text = text.replace(/[\s·•�]/g, ""); // whitespace, dot separators, undecoded glyphs
  return text.length === 0;
}

// ─── Dropped-character detector ────────────────────────────────────────────

interface CheckableField {
  field: "instruction" | "fun_fact" | "encouragement" | "description" | "word_search_word";
  activityIndex: number;
  activitySubject: string;
  text: string;
}

export function checkableFields(activities: PDFActivity[]): CheckableField[] {
  const fields: CheckableField[] = [];
  activities.forEach((activity, activityIndex) => {
    const isMathWorksheet =
      activity.content_type === "worksheet" && activity.subject.toLowerCase().includes("math");
    const isPuzzle = activity.content_type === "puzzle_break";

    // instructions[] render close to verbatim EXCEPT Math worksheets, whose
    // instructions get parsed/reformatted by MathSections (see
    // components/PacketPDF.tsx) rather than shown as-is.
    if (!isMathWorksheet && !isPuzzle) {
      for (const instr of activity.instructions) {
        if (instr && instr.trim()) {
          fields.push({ field: "instruction", activityIndex, activitySubject: activity.subject, text: instr });
        }
      }
    }
    // Puzzle-break words render as individual chips in Nunito 700 — a useful
    // extra weight to sweep since the original investigation was 400-only.
    if (isPuzzle) {
      for (const word of activity.instructions) {
        if (word && word.trim()) {
          fields.push({ field: "word_search_word", activityIndex, activitySubject: activity.subject, text: word });
        }
      }
    }
    if (activity.fun_fact) {
      fields.push({ field: "fun_fact", activityIndex, activitySubject: activity.subject, text: activity.fun_fact });
    }
    if (activity.encouragement) {
      fields.push({
        field: "encouragement",
        activityIndex,
        activitySubject: activity.subject,
        text: activity.encouragement,
      });
    }
    if (activity.description) {
      fields.push({
        field: "description",
        activityIndex,
        activitySubject: activity.subject,
        text: activity.description,
      });
    }
  });
  return fields;
}

interface Finding {
  field: CheckableField["field"];
  activityIndex: number;
  activitySubject: string;
  expectedFirstWord: string;
  expectedFirstChar: string;
  pageNum: number;
  snippet: string; // short context around the match, NOT the full field text
  confidence: "CONFIRMED" | "SUSPECTED";
}

// Minimum anchor length (word minus its own first character) to search for.
// 3 was chosen empirically: 4 missed a real, confirmed drop ("Real" from
// Math's fun_fact "Real pirates...", a 4-letter word producing only a
// 3-letter anchor) during validation against a known-real instance. Shorter
// anchors do trade away some specificity, but stage 2's glyph-count check
// plus human review of any CONFIRMED/SUSPECTED finding is exactly the
// safety net for that — missing a real drop silently is the worse failure
// mode for a detector whose whole purpose is fleet-wide discovery.
const MIN_ANCHOR_LEN = 3;

function firstWord(text: string): string {
  return text.trim().split(/\s+/)[0] ?? "";
}

export function detectDroppedCharacters(fields: CheckableField[], pages: PageData[]): Finding[] {
  const findings: Finding[] = [];

  for (const f of fields) {
    const word = firstWord(f.text);
    if (word.length < MIN_ANCHOR_LEN + 1) continue; // too short to anchor safely
    const expectedFirstChar = word[0];
    const anchor = word.slice(1, Math.min(word.length, 1 + 12)); // skip position 0
    if (anchor.length < MIN_ANCHOR_LEN) continue;

    for (const page of pages) {
      // Build a flat char->run index so a match position can be traced back
      // to the specific TextRun it came from (needed for stage 2).
      let pageText = "";
      const charRunIndex: TextRun[] = [];
      for (const run of page.runs) {
        for (const ch of run.text) {
          pageText += ch;
          charRunIndex.push(run);
        }
      }

      const idx = pageText.indexOf(anchor);
      if (idx === -1) continue;

      const actualPrecedingChar = idx > 0 ? pageText[idx - 1] : "";
      if (actualPrecedingChar === expectedFirstChar) continue; // matches — no finding

      // Mismatch — flag it. Verify against the specific run's raw glyph count.
      const run = charRunIndex[idx] ?? null;
      const confidence: Finding["confidence"] =
        run && run.glyphCount === run.text.length ? "CONFIRMED" : "SUSPECTED";

      findings.push({
        field: f.field,
        activityIndex: f.activityIndex,
        activitySubject: f.activitySubject,
        expectedFirstWord: word,
        expectedFirstChar,
        pageNum: page.pageNum,
        snippet: pageText.slice(Math.max(0, idx - 5), idx + anchor.length + 5),
        confidence,
      });
      break; // one finding per field is enough to flag it
    }
  }

  return findings;
}

// ─── Sweep ──────────────────────────────────────────────────────────────────

interface PacketReport {
  packetId: string;
  childGrade: string;
  theme: string;
  renderSuccess: boolean;
  renderError: string | null;
  renderTimeMs: number;
  pageCount: number;
  blankPageCount: number;
  findings: Finding[];
}

async function sweepOnePacket(packet: PacketRow): Promise<PacketReport> {
  const base: Omit<PacketReport, "renderSuccess" | "renderError" | "renderTimeMs" | "pageCount" | "blankPageCount" | "findings"> = {
    packetId: packet.id,
    childGrade: packet.grade_level,
    theme: packet.theme,
  };

  const start = Date.now();
  let buf: Uint8Array;
  try {
    const props = buildProps(packet);
    buf = await renderToBuffer(createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>);
  } catch (err) {
    return {
      ...base,
      renderSuccess: false,
      renderError: err instanceof Error ? err.message : String(err),
      renderTimeMs: Date.now() - start,
      pageCount: 0,
      blankPageCount: 0,
      findings: [],
    };
  }
  const renderTimeMs = Date.now() - start;

  let pageCount = 0;
  let blankPageCount = 0;
  let findings: Finding[] = [];
  try {
    const { pageCount: pc, pages } = introspectPdf(Buffer.from(buf));
    pageCount = pc;
    blankPageCount = pages.filter(isBlankPage).length;
    const content = packet.generated_content;
    const fields = checkableFields(content.activities as PDFActivity[]);
    findings = detectDroppedCharacters(fields, pages);
  } catch (err) {
    // Introspection failure shouldn't fail the whole packet — the render
    // itself succeeded. Report zero findings for this packet and note it.
    console.error(`[sweep] introspection failed for ${packet.id}: ${err instanceof Error ? err.message : err}`);
  }

  return { ...base, renderSuccess: true, renderError: null, renderTimeMs, pageCount, blankPageCount, findings };
}

async function main() {
  const limit = parseLimit();
  const supabase = getServiceClient();

  console.log("=== Packet Day fleet sweep ===");
  if (limit) console.log(`(limited to first ${limit} packets)`);

  const { data: idRows, error: idError } = await supabase.from("packets").select("id");
  if (idError || !idRows) {
    console.error("Failed to list packet ids:", idError?.message ?? "unknown error");
    process.exit(1);
  }
  const ids = (limit ? idRows.slice(0, limit) : idRows).map((r) => r.id as string);
  console.log(`Packets to sweep: ${ids.length}\n`);

  const reports: PacketReport[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const { data: packet, error } = await supabase
      .from("packets")
      .select("*, children(avatar_emoji, special_notes)")
      .eq("id", id)
      .single();

    if (error || !packet) {
      reports.push({
        packetId: id,
        childGrade: "?",
        theme: "?",
        renderSuccess: false,
        renderError: `fetch failed: ${error?.message ?? "not found"}`,
        renderTimeMs: 0,
        pageCount: 0,
        blankPageCount: 0,
        findings: [],
      });
      process.stdout.write("F");
      continue;
    }

    const report = await sweepOnePacket(packet as unknown as PacketRow);
    reports.push(report);
    process.stdout.write(report.renderSuccess ? (report.findings.length ? "!" : ".") : "F");
    if ((i + 1) % 10 === 0) process.stdout.write(` ${i + 1}\n`);
  }
  console.log("\n");

  // ─── Summary ────────────────────────────────────────────────────────────
  const succeeded = reports.filter((r) => r.renderSuccess);
  const failed = reports.filter((r) => !r.renderSuccess);
  const totalFindings = reports.reduce((s, r) => s + r.findings.length, 0);
  const confirmedFindings = reports.reduce(
    (s, r) => s + r.findings.filter((f) => f.confidence === "CONFIRMED").length,
    0
  );
  const withBlankPages = reports.filter((r) => r.blankPageCount > 0);
  const avgRenderMs = succeeded.length
    ? Math.round(succeeded.reduce((s, r) => s + r.renderTimeMs, 0) / succeeded.length)
    : 0;
  const pageCounts = succeeded.map((r) => r.pageCount).filter((n) => n > 0);

  console.log("=== Summary ===");
  console.log(`Rendered:            ${succeeded.length}/${reports.length}`);
  if (failed.length) {
    console.log(`Render failures:     ${failed.length}`);
    for (const r of failed) console.log(`  - ${r.packetId}: ${r.renderError}`);
  }
  console.log(`Avg render time:     ${avgRenderMs}ms`);
  if (pageCounts.length) {
    console.log(`Page count range:    ${Math.min(...pageCounts)}-${Math.max(...pageCounts)}`);
  }
  console.log(`Packets w/ blank pages: ${withBlankPages.length}`);
  console.log(`Dropped-character findings: ${totalFindings} (${confirmedFindings} CONFIRMED, ${totalFindings - confirmedFindings} SUSPECTED)`);
  if (totalFindings) {
    console.log("\nFlagged (packetId, band, field, word, confidence):");
    for (const r of reports) {
      for (const f of r.findings) {
        console.log(
          `  ${r.packetId}  ${r.childGrade}  ${f.field}  "${f.expectedFirstWord}"  ${f.confidence}`
        );
      }
    }
  }

  // ─── Write JSON report ──────────────────────────────────────────────────
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `sweep-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        sweptAt: new Date().toISOString(),
        packetCount: reports.length,
        summary: {
          rendered: succeeded.length,
          failed: failed.length,
          avgRenderMs,
          pageCountRange: pageCounts.length ? [Math.min(...pageCounts), Math.max(...pageCounts)] : null,
          packetsWithBlankPages: withBlankPages.length,
          totalFindings,
          confirmedFindings,
        },
        reports,
      },
      null,
      2
    )
  );
  console.log(`\nFull report: ${outPath}`);
}

// Guarded so this file can be imported (e.g. to unit-test the exported
// introspectPdf/checkableFields/detectDroppedCharacters functions against an
// existing PDF) without triggering a live Supabase connection and a real
// sweep as a side effect of the import.
if (require.main === module) {
  main().catch((err) => {
    console.error("Sweep failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

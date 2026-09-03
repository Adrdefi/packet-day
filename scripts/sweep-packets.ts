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
 *   npm run sweep -- --limit N
 *
 * That runs `dotenv -e .env.local -- node scripts/run-ts.mjs
 * scripts/sweep-packets.ts`, i.e. plain node, not tsx — see run-ts.mjs's own
 * header for why: tsx cannot load this file's @react-pdf/renderer import on
 * this repo's Node version (ERR_PACKAGE_PATH_NOT_EXPORTED on
 * @react-pdf/hyphenate's `/en-us` subpath, confirmed across every tsx
 * release from 4.0.0 through 4.23.13 — not a version-pinning problem).
 * run-ts.mjs compiles this file with esbuild ahead of time and hands the
 * plain-ESM result to node directly, no tsx involved.
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
 *
 * KNOWN FALSE-POSITIVE SHAPES — READ BEFORE ACTING ON A "CONFIRMED" FINDING
 * --------------------------------------------------------------------------
 * A full fleet sweep (82 packets, 2026-09-03) came back with 28 findings (20
 * CONFIRMED) and every single one — verified with a PyMuPDF rawdict
 * cross-check against a rendered copy of one representative packet per
 * distinct snippet shape, not a spot check of one or two — turned out to be
 * a detector artifact, not a real dropped character. Two known shapes to
 * expect and discount on sight, both stemming from the fact that "CONFIRMED"
 * only means the matched run's own glyph-count/decoded-length was
 * self-consistent — it does NOT mean the match happened at the field's true
 * start:
 *   1. Span-boundary adjacency. pageText is built by flatly concatenating
 *      every text run on the page with no separator. When a field is the
 *      first thing drawn in its own box, its opening character can be
 *      immediately preceded — in content-stream order, not visually — by
 *      the last character of a *different*, unrelated span: a "DID YOU
 *      KNOW ?" heading, a numbered-list digit ("2.", "3."), a duration
 *      badge ("8 min"). There is no space glyph there because the visual
 *      gap comes from box padding/margin, not a literal space character.
 *      The flagged character (confirmed via rawdict origin data) is
 *      genuinely present as the first glyph of its own span — nothing was
 *      dropped. This produced the entire "A" cluster in the 2026-09-03
 *      sweep (fun_fact boxes all start with "DID YOU KNOW ?", numbered
 *      instructions all start with a bare digit).
 *   2. Anchor non-uniqueness. The multi-word anchor (see MIN_ANCHOR_LEN /
 *      buildAnchor below) is specific enough to avoid colliding with
 *      generic page furniture like the footer, but it is NOT guaranteed
 *      unique across an entire packet's own generated content. A themed
 *      packet can legitimately reference the same phrase twice — e.g. a
 *      parent note describing "the Dogman book series by Dav Pilkey" and a
 *      Reading fun_fact independently opening with "The Dogman book series
 *      by David Pilkey..." — and the naive first-page-first-match search
 *      can land on the wrong occurrence.
 * Neither shape is fixed here (comment-only change, per explicit
 * instruction — "I would rather it cry wolf than miss something"). Treat
 * any CONFIRMED/SUSPECTED finding as a lead to rawdict-verify, same
 * discipline as the original R-drop investigation, not as a confirmed bug
 * on its own.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { inflateSync } from "zlib";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import PacketPDF, { resolveContentType } from "../components/PacketPDF";
import type { PacketPDFProps, PDFActivity, PDFColoringPage } from "../components/PacketPDF";
import type { PacketContent } from "../types";

// ─── Config ─────────────────────────────────────────────────────────────────

// No __dirname — this file runs compiled to ESM (see the isMainModule
// comment near the bottom of this file for why), where __dirname isn't a
// global. import.meta.url is the ESM-native equivalent.
const __filenameEsm = fileURLToPath(import.meta.url);
const __dirnameEsm = path.dirname(__filenameEsm);
const OUT_DIR = path.join(__dirnameEsm, "..", "sweep-output");

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
    // Real DB rows leave content_type null (confirmed against live data, not
    // just a hypothetical) — resolveContentType's subject-keyword fallback is
    // what actually decides rendering, so this MUST call the same function
    // PacketPDF.tsx uses rather than checking activity.content_type directly,
    // or this exclusion silently never fires and Math's MathSections
    // -reformatted instructions get checked as if they render verbatim
    // (they don't — this produced spurious findings in practice).
    const isMathWorksheet =
      resolveContentType(activity) === "worksheet" && activity.subject.toLowerCase().includes("math");
    const isPuzzle = resolveContentType(activity) === "puzzle_break";

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

// The anchor is built from the field's OWN full text (skipping just its
// first character), spanning multiple words up to ~20 non-space characters —
// NOT just the tail of the first word. An earlier version anchored on the
// first word's tail alone (e.g. "ove" from "Move"), which is a common
// English substring and collided with unrelated text elsewhere on the same
// page — most damagingly the fixed per-page footer ("Made with love by
// Packet Day"), present on every page, which produced a wall of false
// "CONFIRMED" findings against real fleet data (verified via PyMuPDF
// rawdict cross-check: the flagged field was fully intact; the detector had
// matched inside the footer instead). Spanning multiple words from the
// field's actual sentence makes an accidental collision vanishingly
// unlikely while still correctly catching a genuinely dropped first
// character, since the anchor still starts at position 1 (skipping the
// character under test) regardless of how many words it spans.
const ANCHOR_TARGET_LEN = 20; // non-space characters to aim for
const MIN_ANCHOR_LEN = 10; // non-space characters — below this, too short to anchor safely regardless of source

function firstWord(text: string): string {
  return text.trim().split(/\s+/)[0] ?? "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Anchor {
  expectedFirstChar: string;
  // Built with \s* between words rather than a literal-space match: pdfkit
  // does not draw the space glyph at a line-wrap point (the break itself
  // supplies the visual gap), so a multi-word anchor that happens to span a
  // wrapped line would otherwise never match and silently produce a false
  // negative. \s* tolerates that (zero or more) as well as ordinary single
  // -space runs.
  regex: RegExp;
}

/** Builds a match anchor from a checkable field's own text, or null if the
 * field is too short to anchor safely (see MIN_ANCHOR_LEN). */
function buildAnchor(text: string): Anchor | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_ANCHOR_LEN + 1) return null;
  const expectedFirstChar = trimmed[0];
  const words = trimmed.slice(1).split(/\s+/).filter(Boolean);

  const anchorWords: string[] = [];
  let nonSpaceLen = 0;
  for (const w of words) {
    anchorWords.push(w);
    nonSpaceLen += w.length;
    if (nonSpaceLen >= ANCHOR_TARGET_LEN) break;
  }
  if (nonSpaceLen < MIN_ANCHOR_LEN || anchorWords.length === 0) return null;

  return { expectedFirstChar, regex: new RegExp(anchorWords.map(escapeRegExp).join("\\s*")) };
}

export function detectDroppedCharacters(fields: CheckableField[], pages: PageData[]): Finding[] {
  const findings: Finding[] = [];

  for (const f of fields) {
    const anchor = buildAnchor(f.text);
    if (!anchor) continue; // too short to anchor safely

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

      const match = anchor.regex.exec(pageText);
      if (!match) continue;
      const idx = match.index;

      const actualPrecedingChar = idx > 0 ? pageText[idx - 1] : "";
      if (actualPrecedingChar === anchor.expectedFirstChar) continue; // matches — no finding

      // Mismatch — flag it. Verify against the specific run's raw glyph count.
      const run = charRunIndex[idx] ?? null;
      const confidence: Finding["confidence"] =
        run && run.glyphCount === run.text.length ? "CONFIRMED" : "SUSPECTED";

      findings.push({
        field: f.field,
        activityIndex: f.activityIndex,
        activitySubject: f.activitySubject,
        expectedFirstWord: firstWord(f.text),
        expectedFirstChar: anchor.expectedFirstChar,
        pageNum: page.pageNum,
        snippet: pageText.slice(Math.max(0, idx - 5), idx + match[0].length + 5),
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
// sweep as a side effect of the import. ESM-native check (import.meta.url vs
// the invoked script's path), not CJS's `require.main === module` — this
// file runs compiled to ESM (see scripts/run-ts.mjs's header for why:
// tsx's CJS require-hook cannot load @react-pdf/renderer's dependency
// chain on this Node version, but native ESM resolves it correctly), and
// `require`/`module` don't exist as globals in that context.
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main().catch((err) => {
    console.error("Sweep failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

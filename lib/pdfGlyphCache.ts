import { Font } from "@react-pdf/renderer";

// Stale glyph guard for react-pdf's font engine (fontkit). See CLAUDE.md,
// "Stale glyph cache", for the full story.
//
// fontkit keeps one Glyph object per glyph id for the life of the process,
// and records which character it stands for only the FIRST time it is
// created. If anything first asks for a glyph by id alone, that glyph is
// cached as standing for no character, and every later render in the same
// process drops it at the start of a text block (the "ump" for "Jump" bug)
// or scrambles it in the PDF text layer. Warming each font's common
// characters through the correct path before any render makes that first
// bad lookup impossible for them, and the integrity check after each render
// catches anything that still slips through.
//
// This reads react-pdf and fontkit internals: FontSource.data (the fontkit
// font), font._glyphs (the glyph cache) and font._cmapProcessor. They are
// pinned at @react-pdf/renderer 4.8.1 and fontkit 2.0.4. Recheck this file
// on any upgrade of either.

// Every normal keyboard character, plus curly quotes, en and em dashes, the
// ellipsis, bullets, and the combining accent marks (U+0300 to U+036F). Each
// must stand for exactly one character. The accent marks are here because
// the fleet sweep of 2026-09-29 caught the combining acute (U+0301, the
// accent part of "é") going stale on its own: the PDF font subsetter asks
// for the parts of accented letters by id alone.
//
// Never warm a character whose glyph a font can also produce from a
// ligature or a split rule (like "ﬁ" U+FB01, which is also what "f" + "i"
// becomes). Warming it caches the glyph as one character, and every "fi"
// after that throws the text engine off by one. None of the characters
// below are produced that way in any of our fonts (checked with fontTools
// against every GSUB ligature and multiple substitution rule).
const WARM_CODE_POINTS: readonly number[] = [
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i),
  0x2018, 0x2019, 0x201c, 0x201d, // curly quotes
  0x2013, 0x2014, // en and em dashes
  0x2026, // ellipsis
  0x2022, 0x00b7, // bullet and middle dot
  ...Array.from({ length: 0x370 - 0x300 }, (_, i) => 0x300 + i), // combining accent marks
];

interface FontkitGlyph {
  id: number;
  codePoints?: number[];
}

interface FontkitFont {
  _glyphs: Record<number, FontkitGlyph | undefined>;
  _cmapProcessor: { lookup(codePoint: number): number };
  characterSet: number[];
  glyphForCodePoint(codePoint: number): FontkitGlyph;
  hasGlyphForCodePoint(codePoint: number): boolean;
}

interface FontSourceLike {
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  data: unknown;
  load(): Promise<void>;
}

interface StaleGlyph {
  glyphId: number;
  cached: number[];
  expected: number[];
}

function registeredSources(): FontSourceLike[] {
  const families = Font.getRegisteredFonts() as unknown as Record<string, { sources?: FontSourceLike[] }>;
  return Object.values(families).flatMap((family) => family.sources ?? []);
}

function fontLabel(source: FontSourceLike): string {
  return `${source.fontFamily} ${source.fontWeight} ${source.fontStyle}`;
}

function asFontkitFont(data: unknown): FontkitFont | null {
  const font = data as Partial<FontkitFont> | null;
  if (!font || typeof font !== "object") return null;
  if (typeof font._glyphs !== "object" || !font._cmapProcessor) return null;
  if (typeof font.glyphForCodePoint !== "function" || typeof font.hasGlyphForCodePoint !== "function") return null;
  return font as FontkitFont;
}

interface CmapIndex {
  // glyph id to every character the font's own cmap maps to it
  byGlyph: Map<number, number[]>;
  // glyph ids of the warmed characters; these must never stand for more than one character
  warmGlyphIds: Set<number>;
}

const cmapIndexes = new WeakMap<FontkitFont, CmapIndex>();

function cmapIndex(font: FontkitFont): CmapIndex {
  let index = cmapIndexes.get(font);
  if (index) return index;
  const byGlyph = new Map<number, number[]>();
  for (const codePoint of font.characterSet) {
    const glyphId = font._cmapProcessor.lookup(codePoint);
    if (!glyphId) continue;
    const list = byGlyph.get(glyphId);
    if (list) list.push(codePoint);
    else byGlyph.set(glyphId, [codePoint]);
  }
  const warmGlyphIds = new Set<number>();
  for (const codePoint of WARM_CODE_POINTS) {
    const glyphId = font._cmapProcessor.lookup(codePoint);
    if (glyphId) warmGlyphIds.add(glyphId);
  }
  index = { byGlyph, warmGlyphIds };
  cmapIndexes.set(font, index);
  return index;
}

// Only glyphs the font maps directly from a character are checked. Ligatures
// and stylistic alternates have no cmap entry of their own, so there is no
// single correct answer for them. A cached glyph is stale when it stands for
// no character at all, or (for a warmed character) for anything other than
// exactly one of the characters that map to it.
function findStaleGlyphs(font: FontkitFont): StaleGlyph[] {
  const { byGlyph, warmGlyphIds } = cmapIndex(font);
  const stale: StaleGlyph[] = [];
  for (const glyph of Object.values(font._glyphs)) {
    if (!glyph) continue;
    const expected = byGlyph.get(glyph.id);
    if (!expected) continue;
    const cached = glyph.codePoints ?? [];
    const ok =
      cached.length === 1
        ? expected.includes(cached[0])
        : cached.length > 1 && !warmGlyphIds.has(glyph.id);
    if (!ok) stale.push({ glyphId: glyph.id, cached: [...cached], expected });
  }
  return stale;
}

function describeCharacters(codePoints: number[]): string {
  return codePoints
    .map((cp) => `"${String.fromCodePoint(cp)}" U+${cp.toString(16).toUpperCase().padStart(4, "0")}`)
    .join(" or ");
}

function reportAndRepair(font: FontkitFont, source: FontSourceLike, packetId: string, when: string): number {
  const stale = findStaleGlyphs(font);
  for (const glyph of stale) {
    console.error(
      `PDF GLYPH CACHE STALE ${when}: font="${fontLabel(source)}" char=${describeCharacters(glyph.expected)} ` +
        `cachedCodePoints=${JSON.stringify(glyph.cached)} glyphId=${glyph.glyphId} packet=${packetId}`
    );
    // Drop the bad entry and rebuild it with the right character. Renders
    // already in flight keep their own references.
    delete font._glyphs[glyph.glyphId];
    font.glyphForCodePoint(glyph.expected[0]);
  }
  return stale.length;
}

const warmedFonts = new WeakSet<FontkitFont>();

/**
 * Loads and warms every registered font (every weight and style, including
 * the italic entries that point at upright files) before a render. The full
 * warm happens once per font object; the stale check and repair run on every
 * call, so a process that has already rendered other packets is still safe.
 * Never throws: a failure here is logged and the render goes ahead.
 */
export async function prepareFontsForRender(packetId: string): Promise<void> {
  let sources: FontSourceLike[];
  try {
    sources = registeredSources();
  } catch (err) {
    console.error("[pdfGlyphCache] Could not read registered fonts, skipping warm up:", err);
    return;
  }
  for (const source of sources) {
    try {
      await source.load();
      const font = asFontkitFont(source.data);
      if (!font) continue;
      reportAndRepair(font, source, packetId, "before render (repaired)");
      if (!warmedFonts.has(font)) {
        for (const codePoint of WARM_CODE_POINTS) {
          if (font.hasGlyphForCodePoint(codePoint)) font.glyphForCodePoint(codePoint);
        }
        warmedFonts.add(font);
      }
    } catch (err) {
      console.error(`[pdfGlyphCache] Warm up failed for font "${fontLabel(source)}", continuing:`, err);
    }
  }
}

/**
 * Verifies every checkable cached glyph in every registered font after a
 * render. Logs one PDF GLYPH CACHE STALE line per bad glyph plus a stack
 * trace of the render context, repairs the entry, and returns how many it
 * found. Never throws.
 */
export function checkGlyphCacheAfterRender(packetId: string): number {
  let total = 0;
  try {
    for (const source of registeredSources()) {
      const font = asFontkitFont(source.data);
      if (!font) continue;
      total += reportAndRepair(font, source, packetId, "after render");
    }
    if (total > 0) {
      console.error(new Error(`PDF GLYPH CACHE STALE render context for packet=${packetId}`).stack);
    }
  } catch (err) {
    console.error("[pdfGlyphCache] Integrity check failed, continuing:", err);
  }
  return total;
}

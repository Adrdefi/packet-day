import { band as bandTable, type BandKey } from "@/lib/pdf-tokens";
import { GLYPH_WIDTHS } from "./fontMetrics";
import { PUZZLE_TEXT_CAPS, trimToCap } from "./textCaps";
import type { BuiltPuzzle, StoredPuzzle } from "./types";

// Height budget for the rotating puzzle break page (components/PacketPDF.tsx,
// RotatingPuzzleTemplate). react-pdf can't measure text before layout, and an
// <Svg> only sizes itself from the page width, so the page is planned here:
// every fixed block's height is estimated from its text, and the grid gets
// the exact width and height that are left. The page renders with
// wrap={false}, so it is always exactly one page.
//
// Text widths come from each font's real glyph widths (lib/puzzles/
// fontMetrics.ts), word wrapped the way the page will wrap them, with a
// little slack for kerning and line breaking; a safety margin covers the rest.

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

/** Page padding per band: the same cardPad + 24 the other activity pages use. */
export const PAGE_PADDING: Record<BandKey, number> = { "K-2": 38, "3-5": 36, "6-8": 34 };

export const BLOCK_GAP = 12;
const SAFETY = 10;
const WIDTH_SLACK = 1.04;

type FontKey = keyof typeof GLYPH_WIDTHS;

/** Width of `text` in points. `letterSpacing` is in points per character. */
export function textWidth(text: string, size: number, font: FontKey = "regular", letterSpacing = 0): number {
  const table = GLYPH_WIDTHS[font];
  let units = 0;
  for (const ch of text) units += table[ch] ?? 600;
  return (units / 1000) * size + letterSpacing * text.length;
}

/** Lines `text` wraps to at `width` points, breaking between words. */
export function estimateLines(text: string, size: number, width: number, font: FontKey = "regular", letterSpacing = 0): number {
  if (!text) return 0;
  const space = textWidth(" ", size, font, letterSpacing) * WIDTH_SLACK;
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = textWidth(word, size, font, letterSpacing) * WIDTH_SLACK;
    if (used > 0 && used + space + w > width) {
      lines++;
      used = w;
    } else {
      used += (used > 0 ? space : 0) + w;
    }
  }
  return lines;
}

// Fixed type sizes on this page (points).
export const PUZZLE_TYPE = {
  subjectLabel: { size: 10, lineHeight: 1.2 },
  title: { size: 24, lineHeight: 1.05 },
  durationSize: 10,
  introText: { size: 12, lineHeight: 1.5 },
  calloutLabel: { size: 9, lineHeight: 1.2 },
  bankLabel: { size: 10, lineHeight: 1.2 },
  chip: { size: 10, lineHeight: 1.2, padX: 10, padY: 4, gap: 8 },
  jokeQuestion: { size: 12, lineHeight: 1.35 },
  jokePunchline: { size: 12, lineHeight: 1.3 },
  clue: { "K-2": 11.5, "3-5": 10.5, "6-8": 10 } as Record<BandKey, number>,
  clueLineHeight: 1.35,
} as const;

/** Share of the joke row the upside down punchline may take. */
export const PUNCHLINE_SHARE = 0.38;

/** Widest the grid may be, as a share of the content width. */
const GRID_MAX_WIDTH: Record<BuiltPuzzle["type"], Record<BandKey, number>> = {
  word_search: { "K-2": 0.86, "3-5": 0.92, "6-8": 1 },
  maze: { "K-2": 0.8, "3-5": 0.92, "6-8": 1 },
  sudoku: { "K-2": 0.52, "3-5": 0.62, "6-8": 0.74 },
  crossword: { "K-2": 0.7, "3-5": 0.9, "6-8": 1 },
};

/** Smallest a grid cell may get, in points, before the Did You Know is shortened. */
const MIN_CELL: Record<BuiltPuzzle["type"], Record<BandKey, number>> = {
  word_search: { "K-2": 26, "3-5": 22, "6-8": 18 },
  maze: { "K-2": 22, "3-5": 16, "6-8": 13 },
  sudoku: { "K-2": 50, "3-5": 40, "6-8": 34 },
  crossword: { "K-2": 30, "3-5": 22, "6-8": 18 },
};

/** The grid's drawing size in its own units (its SVG viewBox), so the page can scale it to fit. */
export function gridViewBox(p: BuiltPuzzle): { width: number; height: number; cells: number } {
  switch (p.type) {
    case "word_search":
      return { width: p.size * WS_CELL + 2 * WS_MARGIN, height: p.size * WS_CELL + 2 * WS_MARGIN, cells: p.size };
    case "maze":
      return { width: p.width * MAZE_CELL + 2 * MAZE_MARGIN_X, height: p.height * MAZE_CELL + 2 * MAZE_MARGIN_Y, cells: p.width };
    case "sudoku":
      return { width: p.size * SUDOKU_CELL + 2 * SUDOKU_MARGIN, height: p.size * SUDOKU_CELL + 2 * SUDOKU_MARGIN, cells: p.size };
    case "crossword":
      return { width: p.width * CW_CELL + 2 * CW_MARGIN, height: p.height * CW_CELL + 2 * CW_MARGIN, cells: Math.max(p.width, p.height) };
  }
}

// Grid drawing units (shared with the renderer).
export const WS_CELL = 34;
export const WS_MARGIN = 2;
export const MAZE_CELL = 30;
export const MAZE_MARGIN_X = 8;
export const MAZE_MARGIN_Y = 6;
/** START and FINISH rows above and below the maze, in points (outside the scaled grid, so they stay readable). */
export const MAZE_LABEL_ROW = 18;
export const SUDOKU_CELL = 56;
export const SUDOKU_MARGIN = 3;
export const CW_CELL = 40;
export const CW_MARGIN = 2;

export interface PuzzlePagePlan {
  band: BandKey;
  padding: number;
  contentWidth: number;
  /** Height of the page's one unbreakable content block, in points. */
  contentHeight: number;
  /** Did You Know text to print, possibly shortened; null to leave the box out. */
  fact: string | null;
  intro: string;
  /** Exact grid size in points. */
  gridWidth: number;
  gridHeight: number;
  /** True if even without the Did You Know the grid is under its minimum cell size. */
  belowMinimum: boolean;
  /** Estimated heights, for the check script. */
  heights: Record<string, number>;
}

function chipRows(words: readonly string[], width: number): number {
  const c = PUZZLE_TYPE.chip;
  let rows = 1;
  let used = 0;
  for (const w of words) {
    const chipW = textWidth(w.toUpperCase(), c.size, "bold", c.size * 0.06) + 2 * c.padX + 2;
    if (used > 0 && used + c.gap + chipW > width) {
      rows++;
      used = chipW;
    } else {
      used += (used > 0 ? c.gap : 0) + chipW;
    }
  }
  return rows;
}

function bankHeight(words: readonly string[], width: number, withLabel: boolean): number {
  const c = PUZZLE_TYPE.chip;
  const rows = chipRows(words, width);
  const chipH = c.size * c.lineHeight + 2 * c.padY + 2;
  const label = withLabel ? PUZZLE_TYPE.bankLabel.size * PUZZLE_TYPE.bankLabel.lineHeight + 8 : 0;
  return label + rows * chipH + (rows - 1) * c.gap;
}

function cluesHeight(p: Extract<BuiltPuzzle, { type: "crossword" }>, band: BandKey, width: number): number {
  const colW = (width - 24) / 2;
  const size = PUZZLE_TYPE.clue[band];
  const lh = size * PUZZLE_TYPE.clueLineHeight;
  const col = (dir: "across" | "down") =>
    PUZZLE_TYPE.bankLabel.size * PUZZLE_TYPE.bankLabel.lineHeight + 4 +
    p.entries.filter((e) => e.dir === dir).reduce((h, e) => h + estimateLines(`${e.number}. ${e.clue}`, size, colW) * lh + 3, 0);
  return Math.max(col("across"), col("down"));
}

/** Plans the page: text for each block and the grid's exact size. */
export function planPuzzlePage(
  stored: StoredPuzzle,
  title: string,
  rawFact: string | null | undefined,
  band: BandKey,
  minutes: number
): PuzzlePagePlan {
  const pad = PAGE_PADDING[band];
  const contentWidth = PAGE_WIDTH - 2 * pad;
  // One point short of the full content area so rounding can never push the block to a second page.
  const contentHeight = PAGE_HEIGHT - 2 * pad - 1;
  const caps = PUZZLE_TEXT_CAPS[band];
  const p = stored.data;
  const T = PUZZLE_TYPE;

  const intro = trimToCap(stored.intro, caps.introChars);
  const fullFact = rawFact ? trimToCap(rawFact, caps.factChars) : null;

  const minutesWidth = textWidth(`${minutes} min · pencil`, T.durationSize, "bold");
  const titleLines = estimateLines(title, T.title.size, contentWidth - 12 - minutesWidth, "display", -0.02 * T.title.size);
  const header = T.subjectLabel.size * T.subjectLabel.lineHeight + 3 + titleLines * T.title.size * T.title.lineHeight + 12 + 2.25 + 12;

  const mascot = bandTable[band].stripMascot;
  const introTextW = contentWidth - 27 - mascot - 13.5;
  const introCard = 20 + Math.max(mascot, estimateLines(intro, T.introText.size, introTextW) * T.introText.size * T.introText.lineHeight);

  const calloutSize = bandTable[band].calloutBodySize;
  const factHeight = (text: string | null) =>
    text ? 18 + T.calloutLabel.size * T.calloutLabel.lineHeight + 2.25 + estimateLines(text, calloutSize, contentWidth - 27) * calloutSize * 1.45 + BLOCK_GAP : 0;

  let below = 0;
  if (p.type === "word_search") below = bankHeight(p.words.map((w) => w.word), contentWidth, true) + BLOCK_GAP;
  if (p.type === "crossword") {
    below = cluesHeight(p, band, contentWidth) + BLOCK_GAP;
    if (p.wordBank) below += bankHeight(p.wordBank, contentWidth, false) + BLOCK_GAP;
  }
  const shapeKey = p.type === "sudoku" && p.shapes ? 30 + BLOCK_GAP : 0;
  const mazeLabels = p.type === "maze" ? 2 * MAZE_LABEL_ROW : 0;

  const joke = stored.joke;
  let jokeBox = 0;
  if (joke) {
    const inner = contentWidth - 27;
    const pW = inner * PUNCHLINE_SHARE;
    const qW = inner - pW - 13.5;
    const qH = estimateLines(joke.question, T.jokeQuestion.size, qW, "bold") * T.jokeQuestion.size * T.jokeQuestion.lineHeight;
    const pH = estimateLines(joke.punchline, T.jokePunchline.size, pW, "display") * T.jokePunchline.size * T.jokePunchline.lineHeight;
    jokeBox = 21 + T.calloutLabel.size * T.calloutLabel.lineHeight + 4 + Math.max(qH, pH) + BLOCK_GAP;
  }

  const vb = gridViewBox(p);
  const maxW = contentWidth * GRID_MAX_WIDTH[p.type][band];
  const minScale = MIN_CELL[p.type][band] / unitCell(p);

  const fit = (fact: string | null) => {
    const fixed = header + introCard + BLOCK_GAP + factHeight(fact) + shapeKey + mazeLabels + below + jokeBox + BLOCK_GAP + SAFETY;
    const availH = contentHeight - fixed;
    const scale = Math.max(0, Math.min(maxW / vb.width, availH / vb.height));
    return { scale, fixed };
  };

  // Shorten the Did You Know first: down to its first sentence when it has
  // more than one. A single sentence is never cut short (half a fact reads
  // as a mistake); the box is left out instead.
  let fact = fullFact;
  let r = fit(fact);
  if (r.scale < minScale && fact) {
    const firstSentence = fact.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? null;
    if (firstSentence && firstSentence.length < fact.length) {
      fact = firstSentence;
      r = fit(fact);
    }
    if (r.scale < minScale) {
      fact = null;
      r = fit(null);
    }
  }

  return {
    band,
    padding: pad,
    contentWidth,
    contentHeight,
    fact,
    intro,
    gridWidth: Math.floor(vb.width * r.scale),
    gridHeight: Math.floor(vb.height * r.scale),
    belowMinimum: r.scale < minScale,
    heights: { header, introCard, fact: factHeight(fact), shapeKey, below, joke: jokeBox, fixed: r.fixed, contentHeight },
  };
}

/** One grid cell in viewBox units. */
function unitCell(p: BuiltPuzzle): number {
  switch (p.type) {
    case "word_search": return WS_CELL;
    case "maze": return MAZE_CELL;
    case "sudoku": return SUDOKU_CELL;
    case "crossword": return CW_CELL;
  }
}

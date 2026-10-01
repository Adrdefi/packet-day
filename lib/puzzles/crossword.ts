import type { BandKey } from "@/lib/pdf-tokens";
import { seededRng, shuffle, randInt, type Rng } from "./random";
import type { CrosswordEntry, CrosswordPuzzle, PuzzleWordInput } from "./types";
import { cleanWordList } from "./words";

export interface CrosswordBandConfig {
  /** How many words to aim for. The AI's first ones are tried first; the rest are spares. */
  poolSize: number;
  minWords: number;
  maxWordLength: number;
  /** Largest finished grid, in cells, either way. */
  maxDimension: number;
}

export const CROSSWORD_BANDS: Record<BandKey, CrosswordBandConfig> = {
  "K-2": { poolSize: 5, minWords: 4, maxWordLength: 6, maxDimension: 10 },
  "3-5": { poolSize: 11, minWords: 8, maxWordLength: 9, maxDimension: 14 },
  "6-8": { poolSize: 14, minWords: 10, maxWordLength: 10, maxDimension: 16 },
};

/**
 * Layout tries, and a wall clock cap on them; the best layout so far wins.
 * Because of the clock, the same seed can give a different (equally valid)
 * layout on a slower machine. That's fine: the built puzzle is stored, never
 * rebuilt from its seed.
 */
export const CROSSWORD_MAX_TRIES = 1500;
export const CROSSWORD_TIME_CAP_MS = 250;

const BOARD = 24;

type Dir = "across" | "down";
interface Placement { word: string; x: number; y: number; dir: Dir }

const key = (x: number, y: number) => y * BOARD + x;
const step = (dir: Dir) => (dir === "across" ? [1, 0] : [0, 1]);

/** Crossings this placement would make, or -1 if it can't go there. */
function fitScore(cells: Map<number, string>, word: string, x: number, y: number, dir: Dir): number {
  const [dx, dy] = step(dir);
  const [px, py] = dir === "across" ? [0, 1] : [1, 0];
  if (cells.has(key(x - dx, y - dy)) || cells.has(key(x + dx * word.length, y + dy * word.length))) return -1;
  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const cx = x + dx * i, cy = y + dy * i;
    if (cx < 0 || cy < 0 || cx >= BOARD || cy >= BOARD) return -1;
    const existing = cells.get(key(cx, cy));
    if (existing !== undefined) {
      if (existing !== word[i]) return -1;
      crossings++;
    } else if (cells.has(key(cx + px, cy + py)) || cells.has(key(cx - px, cy - py))) {
      return -1;
    }
  }
  return crossings;
}

/**
 * One greedy layout. Places the main words longest first, each crossing
 * something already down; then, while short of the main word count, tries
 * the spare words in the AI's order to fill the gaps.
 */
function layoutOnce(words: string[], spares: string[], rng: Rng): Placement[] {
  const order = shuffle(rng, [...words]).sort((a, b) => b.length - a.length);
  const cells = new Map<number, string>();
  const placed: Placement[] = [];
  const put = (p: Placement) => {
    const [dx, dy] = step(p.dir);
    for (let i = 0; i < p.word.length; i++) cells.set(key(p.x + dx * i, p.y + dy * i), p.word[i]);
    placed.push(p);
  };
  const tryPut = (word: string): boolean => {
    const options: { score: number; p: Placement }[] = [];
    for (const [k, letter] of cells) {
      const gx = k % BOARD, gy = Math.floor(k / BOARD);
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== letter) continue;
        for (const dir of ["across", "down"] as const) {
          const [dx, dy] = step(dir);
          const x = gx - dx * i, y = gy - dy * i;
          const score = fitScore(cells, word, x, y, dir);
          if (score > 0) options.push({ score, p: { word, x, y, dir } });
        }
      }
    }
    if (options.length === 0) return false;
    // Shuffle first so ties don't always resolve to the same spot.
    shuffle(rng, options).sort((a, b) => b.score - a.score);
    put(options[randInt(rng, Math.min(3, options.length))].p);
    return true;
  };

  const first = order[0];
  put({ word: first, x: Math.floor((BOARD - first.length) / 2), y: Math.floor(BOARD / 2), dir: "across" });

  const rest = order.slice(1);
  let stuck = 0;
  while (rest.length > 0 && stuck < rest.length) {
    const word = rest.shift()!;
    if (tryPut(word)) stuck = 0;
    else { rest.push(word); stuck++; }
  }
  for (const spare of spares) {
    if (placed.length >= words.length) break;
    tryPut(spare);
  }
  return placed;
}

function bounds(placed: Placement[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed) {
    const [dx, dy] = step(p.dir);
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + dx * (p.word.length - 1)); maxY = Math.max(maxY, p.y + dy * (p.word.length - 1));
  }
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function crossingCount(placed: Placement[]): number {
  const hits = new Map<number, number>();
  for (const p of placed) {
    const [dx, dy] = step(p.dir);
    for (let i = 0; i < p.word.length; i++) {
      const k = key(p.x + dx * i, p.y + dy * i);
      hits.set(k, (hits.get(k) ?? 0) + 1);
    }
  }
  return [...hits.values()].filter((n) => n > 1).length;
}

/** Numbers each entry the usual way: start cells in reading order. */
function numberEntries(placed: Placement[], clues: Map<string, string>): CrosswordEntry[] {
  const starts = [...new Set(placed.map((p) => key(p.x, p.y)))].sort((a, b) => a - b);
  const numberOf = new Map(starts.map((k, i) => [k, i + 1]));
  return placed
    .map((p) => ({ number: numberOf.get(key(p.x, p.y))!, dir: p.dir, x: p.x, y: p.y, answer: p.word, clue: clues.get(p.word) ?? "" }))
    .sort((a, b) => (a.dir === b.dir ? a.number - b.number : a.dir === "across" ? -1 : 1));
}

/**
 * Builds a crossword from the AI's words and clues, or null if fewer than the
 * band minimum fit. Words without a clue are dropped, and so is any word that
 * won't fit; its clue goes with it. Tries many layouts and keeps the
 * tightest one with the most words, within the band's size limit.
 */
export function buildCrossword(
  input: readonly PuzzleWordInput[],
  band: BandKey,
  seed: number,
  opts: { timeCapMs?: number; maxTries?: number } = {}
): CrosswordPuzzle | null {
  const cfg = CROSSWORD_BANDS[band];
  const usable = cleanWordList(input, { minLength: 3, maxLength: cfg.maxWordLength, dropContained: false })
    .filter((w) => w.clue);
  if (usable.length < cfg.minWords) return null;
  const clues = new Map(usable.map((w) => [w.word, w.clue as string]));
  const words = usable.slice(0, cfg.poolSize).map((w) => w.word);
  const spares = usable.slice(cfg.poolSize).map((w) => w.word);

  const rng = seededRng(seed);
  const deadline = Date.now() + (opts.timeCapMs ?? CROSSWORD_TIME_CAP_MS);
  const maxTries = opts.maxTries ?? CROSSWORD_MAX_TRIES;
  let best: { score: number; placed: Placement[] } | null = null;
  for (let t = 0; t < maxTries; t++) {
    // Always finish a few tries, then respect the clock.
    if (t >= 20 && Date.now() > deadline) break;
    const placed = layoutOnce(words, spares, rng);
    if (placed.length < cfg.minWords) continue;
    const b = bounds(placed);
    if (b.width > cfg.maxDimension || b.height > cfg.maxDimension) continue;
    const score = (words.length - placed.length) * 1000 + b.width * b.height - crossingCount(placed) * 6 + Math.abs(b.width - b.height) * 4;
    if (!best || score < best.score) best = { score, placed };
  }
  if (!best) return null;

  const b = bounds(best.placed);
  const shifted = best.placed.map((p) => ({ ...p, x: p.x - b.minX, y: p.y - b.minY }));
  const entries = numberEntries(shifted, clues);
  const puzzle: CrosswordPuzzle = {
    type: "crossword",
    band,
    width: b.width,
    height: b.height,
    entries,
    wordBank: band === "K-2" ? entries.map((e) => e.answer).sort() : null,
  };
  return validateCrossword(puzzle) === null ? puzzle : null;
}

/**
 * Why a stored crossword is unusable, or null if it's good. Rebuilds the
 * grid from the entries and checks: no clashing letters, every run of two or
 * more letters is exactly one entry (no accidental words), every entry has a
 * clue, the grid is one connected piece, numbering is in reading order, and
 * the size and word count suit the band.
 */
export function validateCrossword(p: CrosswordPuzzle): string | null {
  const cfg = CROSSWORD_BANDS[p.band];
  if (!cfg) return `unknown band ${p.band}`;
  if (p.entries.length < cfg.minWords) return `only ${p.entries.length} words`;
  if (p.width > cfg.maxDimension || p.height > cfg.maxDimension) return "grid too big";
  const grid: (string | null)[][] = Array.from({ length: p.height }, () => Array<string | null>(p.width).fill(null));
  const answers = new Set<string>();
  for (const e of p.entries) {
    if (!/^[A-Z]{2,}$/.test(e.answer)) return `bad answer ${e.answer}`;
    if (!e.clue.trim()) return `${e.answer} has no clue`;
    if (answers.has(e.answer)) return `${e.answer} used twice`;
    answers.add(e.answer);
    const [dx, dy] = step(e.dir);
    for (let i = 0; i < e.answer.length; i++) {
      const x = e.x + dx * i, y = e.y + dy * i;
      if (x < 0 || y < 0 || x >= p.width || y >= p.height) return `${e.answer} runs off the grid`;
      if (grid[y][x] !== null && grid[y][x] !== e.answer[i]) return `${e.answer} clashes at ${x},${y}`;
      grid[y][x] = e.answer[i];
    }
  }
  // Every run of 2+ letters must be exactly one entry.
  const runs: { dir: Dir; x: number; y: number; text: string }[] = [];
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      if (!grid[y][x]) continue;
      if ((x === 0 || !grid[y][x - 1]) && x + 1 < p.width && grid[y][x + 1]) {
        let text = "";
        for (let i = x; i < p.width && grid[y][i]; i++) text += grid[y][i];
        runs.push({ dir: "across", x, y, text });
      }
      if ((y === 0 || !grid[y - 1][x]) && y + 1 < p.height && grid[y + 1][x]) {
        let text = "";
        for (let i = y; i < p.height && grid[i][x]; i++) text += grid[i][x];
        runs.push({ dir: "down", x, y, text });
      }
    }
  }
  if (runs.length !== p.entries.length) return `${runs.length} words in the grid, ${p.entries.length} entries`;
  for (const r of runs) {
    if (!p.entries.some((e) => e.dir === r.dir && e.x === r.x && e.y === r.y && e.answer === r.text)) return `stray word ${r.text}`;
  }
  // Bounding box is tight: some letter on every edge.
  if (!grid[0].some(Boolean) || !grid[p.height - 1].some(Boolean) || !grid.some((row) => row[0]) || !grid.some((row) => row[p.width - 1])) {
    return "grid has an empty edge";
  }
  // One connected piece.
  const filled: [number, number][] = [];
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) filled.push([x, y]); }));
  const seen = new Set<string>([`${filled[0][0]},${filled[0][1]}`]);
  const queue = [filled[0]];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= p.width || ny >= p.height || !grid[ny][nx] || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  if (seen.size !== filled.length) return "grid is in more than one piece";
  // Numbering: start cells in reading order, 1..n.
  const starts = [...new Set(p.entries.map((e) => e.y * 1000 + e.x))].sort((a, b) => a - b);
  for (const e of p.entries) {
    if (e.number !== starts.indexOf(e.y * 1000 + e.x) + 1) return `${e.answer} has the wrong number`;
  }
  const wantBank = p.band === "K-2" ? p.entries.map((e) => e.answer).sort() : null;
  if (JSON.stringify(wantBank) !== JSON.stringify(p.wordBank)) return "word bank doesn't match the answers";
  return null;
}

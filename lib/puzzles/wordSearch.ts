import type { BandKey } from "@/lib/pdf-tokens";
import { pick, seededRng, shuffle, type Rng } from "./random";
import { WORD_DIRECTIONS, type PlacedWord, type PuzzleWordInput, type WordDirection, type WordSearchPuzzle } from "./types";
import { cleanWordList } from "./words";

export interface WordSearchBandConfig {
  size: number;
  directions: readonly WordDirection[];
  /** "decoy" draws filler letters from the word list itself. */
  filler: "plain" | "decoy";
  targetWords: number;
  minWords: number;
}

export const WORD_SEARCH_BANDS: Record<BandKey, WordSearchBandConfig> = {
  "K-2": { size: 11, directions: ["E", "S"], filler: "plain", targetWords: 12, minWords: 10 },
  "3-5": { size: 14, directions: ["E", "S", "SE", "NE"], filler: "plain", targetWords: 14, minWords: 12 },
  "6-8": { size: 16, directions: ["E", "S", "SE", "NE", "W", "N", "NW", "SW"], filler: "decoy", targetWords: 15, minWords: 12 },
};

/** No Q, X or Z: they read as noise to young kids. Same pool as the reference generator. */
const PLAIN_FILLER = "ABCDEFGHIJKLMNOPRSTUVWY";

const ATTEMPTS_PER_WORD_SET = 120;
const MAX_TOTAL_ATTEMPTS = 500;

/** How many times `word` reads in the grid, counting all 8 directions. */
export function countOccurrences(grid: readonly string[], word: string): number {
  const n = grid.length;
  let count = 0;
  for (const [dx, dy] of Object.values(WORD_DIRECTIONS)) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const ex = x + dx * (word.length - 1);
        const ey = y + dy * (word.length - 1);
        if (ex < 0 || ex >= n || ey < 0 || ey >= n) continue;
        let match = true;
        for (let i = 0; i < word.length; i++) {
          if (grid[y + dy * i][x + dx * i] !== word[i]) { match = false; break; }
        }
        if (match) count++;
      }
    }
  }
  return count;
}

function tryPlace(words: string[], cfg: WordSearchBandConfig, rng: Rng): { grid: string[]; placed: PlacedWord[] } | null {
  const n = cfg.size;
  const cells: string[][] = Array.from({ length: n }, () => Array<string>(n).fill(""));
  const placed: PlacedWord[] = [];

  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    const options: { overlap: number; x: number; y: number; dir: WordDirection }[] = [];
    for (const dir of cfg.directions) {
      const [dx, dy] = WORD_DIRECTIONS[dir];
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const ex = x + dx * (word.length - 1);
          const ey = y + dy * (word.length - 1);
          if (ex < 0 || ex >= n || ey < 0 || ey >= n) continue;
          let overlap = 0;
          let ok = true;
          for (let i = 0; i < word.length; i++) {
            const c = cells[y + dy * i][x + dx * i];
            if (c && c !== word[i]) { ok = false; break; }
            if (c) overlap++;
          }
          if (ok) options.push({ overlap, x, y, dir });
        }
      }
    }
    if (options.length === 0) return null;
    shuffle(rng, options);
    options.sort((a, b) => b.overlap - a.overlap);
    // Mostly favor crossings (tighter, harder grids), sometimes anywhere.
    const choice = rng() < 0.6 ? pick(rng, options.slice(0, Math.max(1, Math.floor(options.length / 6)))) : pick(rng, options);
    const [dx, dy] = WORD_DIRECTIONS[choice.dir];
    for (let i = 0; i < word.length; i++) cells[choice.y + dy * i][choice.x + dx * i] = word[i];
    placed.push({ word, x: choice.x, y: choice.y, dir: choice.dir });
  }

  const pool = cfg.filler === "decoy" ? words.join("") : PLAIN_FILLER;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!cells[y][x]) cells[y][x] = pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)];
    }
  }
  const grid = cells.map((row) => row.join(""));
  if (!words.every((w) => countOccurrences(grid, w) === 1)) return null;
  return { grid, placed };
}

/**
 * Builds a word search from the AI's candidate words, or null if fewer than
 * the band minimum can be placed with every word appearing exactly once.
 * Starts with the first `targetWords` usable words and drops the longest one
 * after repeated failures, never going below the minimum.
 */
export function buildWordSearch(input: readonly PuzzleWordInput[], band: BandKey, seed: number): WordSearchPuzzle | null {
  const cfg = WORD_SEARCH_BANDS[band];
  const rng = seededRng(seed);
  const usable = cleanWordList(input, { minLength: 3, maxLength: cfg.size, dropContained: true }).map((w) => w.word);
  let words = usable.slice(0, cfg.targetWords);
  if (words.length < cfg.minWords) return null;

  let attempts = 0;
  while (attempts < MAX_TOTAL_ATTEMPTS) {
    for (let i = 0; i < ATTEMPTS_PER_WORD_SET && attempts < MAX_TOTAL_ATTEMPTS; i++, attempts++) {
      const result = tryPlace(words, cfg, rng);
      if (result) {
        const puzzle: WordSearchPuzzle = {
          type: "word_search",
          band,
          size: cfg.size,
          grid: result.grid,
          words: [...result.placed].sort((a, b) => a.word.localeCompare(b.word)),
        };
        return validateWordSearch(puzzle) === null ? puzzle : null;
      }
    }
    if (words.length <= cfg.minWords) return null;
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
    words = words.filter((w) => w !== longest);
  }
  return null;
}

/** Why a stored word search is unusable, or null if it's good. */
export function validateWordSearch(p: WordSearchPuzzle): string | null {
  const cfg = WORD_SEARCH_BANDS[p.band];
  if (!cfg) return `unknown band ${p.band}`;
  if (p.size !== cfg.size || p.grid.length !== cfg.size) return "wrong grid size";
  if (!p.grid.every((row) => /^[A-Z]+$/.test(row) && row.length === cfg.size)) return "bad grid row";
  if (p.words.length < cfg.minWords || p.words.length > cfg.targetWords) return `word count ${p.words.length} out of range`;
  if (new Set(p.words.map((w) => w.word)).size !== p.words.length) return "duplicate word";
  for (const w of p.words) {
    if (!cfg.directions.includes(w.dir)) return `${w.word} runs ${w.dir}, not allowed for ${p.band}`;
    const [dx, dy] = WORD_DIRECTIONS[w.dir];
    for (let i = 0; i < w.word.length; i++) {
      const x = w.x + dx * i;
      const y = w.y + dy * i;
      if (x < 0 || y < 0 || x >= p.size || y >= p.size || p.grid[y][x] !== w.word[i]) return `${w.word} not at its stored position`;
    }
    const count = countOccurrences(p.grid, w.word);
    if (count !== 1) return `${w.word} appears ${count} times`;
  }
  return null;
}

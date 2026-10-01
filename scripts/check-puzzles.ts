/**
 * Checks the puzzle break generators (lib/puzzles).
 *
 *   npm run check-puzzles
 *   npm run check-puzzles -- --runs 500 --seed 12345
 *
 * For every puzzle type and grade band, builds about 200 puzzles from random
 * seeds and real theme word lists (scripts/lib/puzzle-word-lists.ts) through
 * buildPuzzle, the same entry point packet generation will use, then:
 *
 * - re-validates every stored result independently (validatePuzzle),
 * - reports how often the chosen type failed, how often that fell back to
 *   the word search and how often to no puzzle at all,
 * - reports build time (average and max) per type and band,
 * - checks the same seed rebuilds the same puzzle (all but the crossword,
 *   whose layout search is capped by the clock),
 * - runs the deliberately messy word lists and checks the cleanup.
 *
 * No API calls and no env vars. Exits 1 if any puzzle fails validation, any
 * check fails, or the chosen type fails more than 2% of the time.
 */

import { bandForGrade, type BandKey } from "../lib/pdf-tokens";
import { buildPuzzle, validatePuzzle, PUZZLE_TYPES, type BuiltPuzzle, type PuzzleType } from "../lib/puzzles";
import { seededRng } from "../lib/puzzles/random";
import { cleanWordList, isPalindrome } from "../lib/puzzles/words";
import { WORD_SEARCH_BANDS, countOccurrences } from "../lib/puzzles/wordSearch";
import { CROSSWORD_BANDS } from "../lib/puzzles/crossword";
import { sudokuConfig } from "../lib/puzzles/sudoku";
import { MESSY_WORD_LISTS, THEME_WORD_LISTS } from "./lib/puzzle-word-lists";

const args = process.argv.slice(2);
const argValue = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const RUNS = Number(argValue("--runs") ?? 200);
const MASTER_SEED = Number(argValue("--seed") ?? Math.floor(Math.random() * 1e9));
const MAX_FAILURE_RATE = 0.02;

const BANDS: BandKey[] = ["K-2", "3-5", "6-8"];
/** Grades cycled through per band, so 6-8 sudoku covers both the grade 6 and the grade 7-8 puzzle. */
const GRADES: Record<BandKey, string[]> = { "K-2": ["K", "1", "2"], "3-5": ["3", "4", "5"], "6-8": ["6", "7", "8"] };

const failures: string[] = [];
let passed = 0;
function expect(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

interface Row {
  type: PuzzleType;
  band: BandKey;
  runs: number;
  failed: number;
  toWordSearch: number;
  toNothing: number;
  times: number[];
  sizeNote: string;
}

function describe(p: BuiltPuzzle, notes: Map<string, number[]>) {
  const add = (k: string, v: number) => notes.set(k, [...(notes.get(k) ?? []), v]);
  if (p.type === "word_search") add("words", p.words.length);
  if (p.type === "maze") add("route", p.solution.length + 1);
  if (p.type === "sudoku") add(`givens ${p.size}x${p.size}`, [...p.givens].filter((c) => c !== "0").length);
  if (p.type === "crossword") { add("words", p.entries.length); add("cells", Math.max(p.width, p.height)); }
}

function summarize(notes: Map<string, number[]>): string {
  return [...notes.entries()]
    .map(([k, v]) => `${k} ${Math.min(...v)}-${Math.max(...v)} (avg ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)})`)
    .join(", ");
}

const rows: Row[] = [];
const seedRng = seededRng(MASTER_SEED);

// Warm up the JIT so the first band's timings aren't skewed.
for (const type of PUZZLE_TYPES) buildPuzzle({ type, gradeLevel: "4", words: THEME_WORD_LISTS["3-5"][0].words, seed: 1 });

for (const type of PUZZLE_TYPES) {
  for (const band of BANDS) {
    const row: Row = { type, band, runs: RUNS, failed: 0, toWordSearch: 0, toNothing: 0, times: [], sizeNote: "" };
    const notes = new Map<string, number[]>();
    const lists = THEME_WORD_LISTS[band];
    for (let i = 0; i < RUNS; i++) {
      const seed = Math.floor(seedRng() * 4294967296) >>> 0;
      const gradeLevel = GRADES[band][i % GRADES[band].length];
      const words = lists[i % lists.length].words;
      const t0 = performance.now();
      const result = buildPuzzle({ type, gradeLevel, words, seed });
      row.times.push(performance.now() - t0);

      if (result.fellBack) {
        row.failed++;
        if (result.puzzle) row.toWordSearch++;
        else row.toNothing++;
      }
      if (result.puzzle) {
        const problem = validatePuzzle(result.puzzle, gradeLevel);
        expect(`${type} ${band} seed ${seed} validates`, problem === null, problem ?? "");
        expect(`${type} ${band} seed ${seed} band`, result.puzzle.band === bandForGrade(gradeLevel));
        if (!result.fellBack) {
          expect(`${type} ${band} seed ${seed} type`, result.puzzle.type === type, `got ${result.puzzle.type}`);
          describe(result.puzzle, notes);
        }
        // Same seed, same puzzle. The crossword's search is capped by the clock, so it may differ.
        if (type !== "crossword" && i < 10) {
          const again = buildPuzzle({ type, gradeLevel, words, seed });
          expect(`${type} ${band} seed ${seed} rebuilds identically`, JSON.stringify(again.puzzle) === JSON.stringify(result.puzzle));
        }
        if (result.puzzle.type === "sudoku" && !result.fellBack) {
          const cfg = sudokuConfig(band, gradeLevel);
          const givens = [...result.puzzle.givens].filter((c) => c !== "0").length;
          expect(`sudoku grade ${gradeLevel} givens near ${cfg.targetGivens}`, givens >= cfg.targetGivens && givens <= cfg.targetGivens + 2, `${givens}`);
        }
      }
    }
    row.sizeNote = summarize(notes);
    rows.push(row);
  }
}

// ─── Word cleanup ──────────────────────────────────────────────────────────

const cleaned = cleanWordList(
  ["Pig!", "pig", "MOM", "BARN", "BARNYARD", "STAR", "RATS", "TOGA", "AGOT", "ARTS", "x"].map((word) => ({ word })),
  { minLength: 3, maxLength: 12, dropContained: true }
).map((w) => w.word);
expect("cleanup: uppercases and strips punctuation", cleaned.includes("PIG"));
expect("cleanup: drops duplicates", cleaned.filter((w) => w === "PIG").length === 1);
expect("cleanup: drops palindromes", !cleaned.includes("MOM"));
expect("cleanup: drops a word inside another", !cleaned.includes("BARN") && cleaned.includes("BARNYARD"));
expect("cleanup: keeps the first of a reversed pair", cleaned.includes("STAR") && !cleaned.includes("RATS"));
expect("cleanup: keeps the first of TOGA/AGOT", cleaned.includes("TOGA") && !cleaned.includes("AGOT"));
expect("cleanup: keeps unrelated same-length words", cleaned.includes("ARTS"), cleaned.join(","));
expect("cleanup: drops too-short words", !cleaned.includes("X"));

const messyRows: string[] = [];
for (const band of BANDS) {
  const messy = MESSY_WORD_LISTS[band];
  for (const type of ["word_search", "crossword"] as const) {
    let ok = 0;
    for (let i = 0; i < 50; i++) {
      const gradeLevel = GRADES[band][i % 3];
      const result = buildPuzzle({ type, gradeLevel, words: messy.words, seed: 1000 + i });
      if (!result.puzzle) continue;
      ok++;
      expect(`messy ${type} ${band} validates`, validatePuzzle(result.puzzle, gradeLevel) === null);
      const answers = result.puzzle.type === "word_search" ? result.puzzle.words.map((w) => w.word)
        : result.puzzle.type === "crossword" ? result.puzzle.entries.map((e) => e.answer) : [];
      expect(`messy ${type} ${band}: all uppercase letters`, answers.every((w) => /^[A-Z]+$/.test(w)));
      if (result.puzzle.type === "word_search") {
        expect(`messy word search ${band}: no palindromes`, !answers.some(isPalindrome));
        expect(`messy word search ${band}: each word exactly once`, answers.every((w) => countOccurrences((result.puzzle as { grid: string[] }).grid, w) === 1));
      }
    }
    messyRows.push(`  ${type.padEnd(11)} ${band.padEnd(4)} built ${ok}/50`);
  }
}

// ─── Fallback when the AI gives too few words ──────────────────────────────

for (const band of BANDS) {
  const few = THEME_WORD_LISTS[band][0].words.slice(0, CROSSWORD_BANDS[band].minWords - 1);
  const r = buildPuzzle({ type: "crossword", gradeLevel: GRADES[band][0], words: few, seed: 7 });
  expect(`too few crossword words in ${band} falls back`, r.fellBack, JSON.stringify(r.puzzle?.type));
  const tooFewForSearch = THEME_WORD_LISTS[band][0].words.slice(0, WORD_SEARCH_BANDS[band].minWords - 1);
  const r2 = buildPuzzle({ type: "maze", gradeLevel: GRADES[band][0], words: tooFewForSearch, seed: 7 });
  expect(`maze ignores the word list in ${band}`, r2.puzzle?.type === "maze");
  const r3 = buildPuzzle({ type: "word_search", gradeLevel: GRADES[band][0], words: tooFewForSearch, seed: 7 });
  expect(`too few words for a word search in ${band} gives no puzzle`, r3.puzzle === null && r3.fellBack);
}
const garbage = buildPuzzle({ type: "crossword", gradeLevel: "4", words: [{ word: 42 as unknown as string }, null as unknown as { word: string }], seed: 1 });
expect("garbage input never throws and gives no puzzle", garbage.puzzle === null && garbage.fellBack);

// ─── Report ────────────────────────────────────────────────────────────────

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
const lines: string[] = [];
lines.push(`Puzzle check: ${RUNS} runs per type and band, master seed ${MASTER_SEED}`);
lines.push("");
lines.push("  type        band  failed  -> word search  -> none   avg ms   max ms   result sizes");
let worstTotalMs = 0;
for (const r of rows) {
  const avg = r.times.reduce((a, b) => a + b, 0) / r.times.length;
  const max = Math.max(...r.times);
  worstTotalMs = Math.max(worstTotalMs, max);
  lines.push(
    `  ${r.type.padEnd(11)} ${r.band.padEnd(4)}  ${pct(r.failed, r.runs).padStart(6)}  ${pct(r.toWordSearch, r.runs).padStart(13)}  ${pct(r.toNothing, r.runs).padStart(6)}  ${avg.toFixed(1).padStart(7)}  ${max.toFixed(1).padStart(7)}   ${r.sizeNote}`
  );
  expect(`${r.type} ${r.band} failure rate under ${MAX_FAILURE_RATE * 100}%`, r.failed / r.runs <= MAX_FAILURE_RATE, pct(r.failed, r.runs));
}
lines.push("");
lines.push(`Slowest single build, fallback included: ${worstTotalMs.toFixed(1)} ms (target under 1000 ms)`);
expect("slowest build under 1 second", worstTotalMs < 1000, `${worstTotalMs.toFixed(1)} ms`);
lines.push("");
lines.push("Messy word lists:");
lines.push(...messyRows);
process.stdout.write(lines.join("\n") + "\n");

if (failures.length > 0) {
  process.stderr.write(`\nPUZZLE CHECK FAILED (${failures.length} problem${failures.length === 1 ? "" : "s"}):\n\n`);
  for (const f of failures.slice(0, 40)) process.stderr.write(`  ${f}\n`);
  if (failures.length > 40) process.stderr.write(`  ...and ${failures.length - 40} more\n`);
  process.exit(1);
}
process.stdout.write(`\nPuzzle check passed: ${passed} checks.\n`);

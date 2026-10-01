import type { BandKey } from "@/lib/pdf-tokens";
import { deriveSeed, seededRng, shuffle, type Rng } from "./random";
import type { SudokuPuzzle } from "./types";

export interface SudokuConfig {
  size: number;
  boxRows: number;
  boxCols: number;
  shapes: boolean;
  /** Starting clues to aim for. */
  targetGivens: number;
}

/** Accept a puzzle with up to this many givens over the target. */
export const SUDOKU_GIVENS_TOLERANCE = 2;
const SUDOKU_TRIES = 8;

/**
 * K-2 is a 4x4 of shapes, 3-5 a 6x6, 6-8 a 9x9. Grade 6 gets a few more
 * starting clues (32) than grades 7 and 8 (27). A missing or unreadable grade
 * in the 6-8 band gets the easier grade 6 puzzle.
 */
export function sudokuConfig(band: BandKey, gradeLevel: string | number | null | undefined): SudokuConfig {
  if (band === "K-2") return { size: 4, boxRows: 2, boxCols: 2, shapes: true, targetGivens: 6 };
  if (band === "3-5") return { size: 6, boxRows: 2, boxCols: 3, shapes: false, targetGivens: 13 };
  const grade = typeof gradeLevel === "number" ? gradeLevel : parseInt(String(gradeLevel ?? "").match(/\d+/)?.[0] ?? "", 10);
  const upper = grade === 7 || grade === 8;
  return { size: 9, boxRows: 3, boxCols: 3, shapes: false, targetGivens: upper ? 27 : 32 };
}

function candidates(grid: number[], cell: number, cfg: SudokuConfig): number[] {
  const { size: n, boxRows: br, boxCols: bc } = cfg;
  const r = Math.floor(cell / n), c = cell % n;
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    used.add(grid[r * n + i]);
    used.add(grid[i * n + c]);
  }
  const r0 = r - (r % br), c0 = c - (c % bc);
  for (let i = r0; i < r0 + br; i++) for (let j = c0; j < c0 + bc; j++) used.add(grid[i * n + j]);
  const out: number[] = [];
  for (let v = 1; v <= n; v++) if (!used.has(v)) out.push(v);
  return out;
}

/** Number of solutions, stopping once it reaches `limit`. Fills the most constrained blank first. */
export function countSolutions(grid: number[], cfg: SudokuConfig, limit = 2): number {
  let best = -1;
  let bestOptions: number[] | null = null;
  for (let cell = 0; cell < grid.length; cell++) {
    if (grid[cell] !== 0) continue;
    const options = candidates(grid, cell, cfg);
    if (options.length === 0) return 0;
    if (!bestOptions || options.length < bestOptions.length) {
      best = cell;
      bestOptions = options;
      if (options.length === 1) break;
    }
  }
  if (!bestOptions) return 1;
  let total = 0;
  for (const v of bestOptions) {
    grid[best] = v;
    total += countSolutions(grid, cfg, limit - total);
    grid[best] = 0;
    if (total >= limit) break;
  }
  return total;
}

function fullGrid(cfg: SudokuConfig, rng: Rng): number[] {
  const { size: n, boxRows: br, boxCols: bc } = cfg;
  const digits = shuffle(rng, Array.from({ length: n }, (_, i) => i + 1));
  // Rows: shuffle the bands of boxRows rows, then rows inside each band.
  const rows = shuffle(rng, Array.from({ length: n / br }, (_, b) => b)).flatMap((b) =>
    shuffle(rng, Array.from({ length: br }, (_, i) => b * br + i))
  );
  const cols = shuffle(rng, Array.from({ length: n / bc }, (_, b) => b)).flatMap((b) =>
    shuffle(rng, Array.from({ length: bc }, (_, i) => b * bc + i))
  );
  const base = (r: number, c: number) => (bc * (r % br) + Math.floor(r / br) + c) % n;
  const out: number[] = [];
  for (const r of rows) for (const c of cols) out.push(digits[base(r, c)]);
  return out;
}

function tryBuild(cfg: SudokuConfig, rng: Rng): { givens: number[]; solution: number[] } {
  const solution = fullGrid(cfg, rng);
  const givens = [...solution];
  const toRemove = cfg.size * cfg.size - cfg.targetGivens;
  let removed = 0;
  for (const cell of shuffle(rng, Array.from({ length: givens.length }, (_, i) => i))) {
    if (removed >= toRemove) break;
    const keep = givens[cell];
    givens[cell] = 0;
    if (countSolutions([...givens], cfg) !== 1) givens[cell] = keep;
    else removed++;
  }
  return { givens, solution };
}

export function buildSudoku(band: BandKey, gradeLevel: string | number | null | undefined, seed: number): SudokuPuzzle | null {
  const cfg = sudokuConfig(band, gradeLevel);
  let best: { givens: number[]; solution: number[]; count: number } | null = null;
  for (let t = 0; t < SUDOKU_TRIES; t++) {
    const built = tryBuild(cfg, seededRng(deriveSeed(seed, `sudoku-${t}`)));
    const count = built.givens.filter((v) => v !== 0).length;
    if (!best || count < best.count) best = { ...built, count };
    if (count <= cfg.targetGivens) break;
  }
  if (!best) return null;
  const puzzle: SudokuPuzzle = {
    type: "sudoku",
    band,
    size: cfg.size,
    boxRows: cfg.boxRows,
    boxCols: cfg.boxCols,
    shapes: cfg.shapes,
    givens: best.givens.join(""),
    solution: best.solution.join(""),
  };
  return validateSudoku(puzzle, gradeLevel) === null ? puzzle : null;
}

/** Why a stored sudoku is unusable, or null if it's good. */
export function validateSudoku(p: SudokuPuzzle, gradeLevel: string | number | null | undefined): string | null {
  const cfg = sudokuConfig(p.band, gradeLevel);
  const n = cfg.size;
  if (p.size !== n || p.boxRows !== cfg.boxRows || p.boxCols !== cfg.boxCols || p.shapes !== cfg.shapes) return "wrong shape for band";
  const digitRe = new RegExp(`^[0-${n}]{${n * n}}$`);
  if (!digitRe.test(p.givens) || !new RegExp(`^[1-${n}]{${n * n}}$`).test(p.solution)) return "bad digits";
  const givens = [...p.givens].map(Number);
  const solution = [...p.solution].map(Number);
  for (let i = 0; i < givens.length; i++) {
    if (givens[i] !== 0 && givens[i] !== solution[i]) return "a given disagrees with the solution";
  }
  // The solution itself must be a valid filled grid.
  for (let cell = 0; cell < solution.length; cell++) {
    const v = solution[cell];
    const probe = [...solution];
    probe[cell] = 0;
    const options = candidates(probe, cell, cfg);
    if (options.length !== 1 || options[0] !== v) return "solution breaks a row, column, or box";
  }
  const count = givens.filter((v) => v !== 0).length;
  if (count > cfg.targetGivens + SUDOKU_GIVENS_TOLERANCE) return `${count} givens, want about ${cfg.targetGivens}`;
  if (countSolutions([...givens], cfg) !== 1) return "not exactly one solution";
  return null;
}

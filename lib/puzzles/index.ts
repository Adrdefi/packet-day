import { bandForGrade, type BandKey } from "@/lib/pdf-tokens";
import { buildCrossword, validateCrossword } from "./crossword";
import { buildMaze, validateMaze } from "./maze";
import { deriveSeed } from "./random";
import { buildSudoku, validateSudoku } from "./sudoku";
import { buildWordSearch, validateWordSearch } from "./wordSearch";
import type { BuiltPuzzle, PuzzleType, PuzzleWordInput } from "./types";

export * from "./types";

export interface BuildPuzzleInput {
  type: PuzzleType;
  gradeLevel: string | number | null | undefined;
  /** The AI's candidate words (about 18), with clues when the type is crossword. */
  words: readonly PuzzleWordInput[];
  seed: number;
}

export interface BuildPuzzleResult {
  /** null means no puzzle data: the page renders exactly as it did before puzzle rotation. */
  puzzle: BuiltPuzzle | null;
  requestedType: PuzzleType;
  /** True when the requested type failed and the new style word search (or nothing) was used. */
  fellBack: boolean;
  durationMs: number;
}

function buildOne(type: PuzzleType, band: BandKey, input: BuildPuzzleInput): BuiltPuzzle | null {
  const seed = deriveSeed(input.seed, type);
  try {
    switch (type) {
      case "word_search": return buildWordSearch(input.words, band, seed);
      case "maze": return buildMaze(band, seed);
      case "sudoku": return buildSudoku(band, input.gradeLevel, seed);
      case "crossword": return buildCrossword(input.words, band, seed);
    }
  } catch {
    // A generator bug must never fail a packet; treat it as a failed build.
    return null;
  }
}

/**
 * Builds the puzzle break. If the chosen type fails, falls back to the new
 * style word search; if that fails too, returns no puzzle so the page renders
 * exactly as it always has. Never throws.
 */
export function buildPuzzle(input: BuildPuzzleInput): BuildPuzzleResult {
  const start = Date.now();
  const band = bandForGrade(input.gradeLevel);
  let puzzle = buildOne(input.type, band, input);
  let fellBack = false;
  if (!puzzle && input.type !== "word_search") {
    fellBack = true;
    puzzle = buildOne("word_search", band, input);
  } else if (!puzzle) {
    fellBack = true;
  }
  return { puzzle, requestedType: input.type, fellBack, durationMs: Date.now() - start };
}

/** Why a stored puzzle is unusable, or null if it's good. */
export function validatePuzzle(p: BuiltPuzzle, gradeLevel: string | number | null | undefined): string | null {
  switch (p.type) {
    case "word_search": return validateWordSearch(p);
    case "maze": return validateMaze(p);
    case "sudoku": return validateSudoku(p, gradeLevel);
    case "crossword": return validateCrossword(p);
  }
}

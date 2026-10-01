import type { BandKey } from "@/lib/pdf-tokens";
import { PUZZLE_TYPES, type PuzzleType } from "./types";

// Rotating puzzle break. The server picks a type for each full day packet,
// never the child's previous one (same pattern as lib/titleStyles.ts).
//
// "Previous" means the child's last FULL DAY packet; half day packets have no
// puzzle break and are ignored. A full day packet with no puzzle_type (every
// packet made before rotation, plus any whose puzzle fell back to nothing)
// had the old word search, so a missing value counts as "word_search".

export function isPuzzleType(value: unknown): value is PuzzleType {
  return typeof value === "string" && (PUZZLE_TYPES as readonly string[]).includes(value);
}

/** A stored puzzle type, with a missing or unknown one treated as "word_search". */
export function normalizePuzzleType(value: unknown): PuzzleType {
  return isPuzzleType(value) ? value : "word_search";
}

/** Random type, never equal to the previous one. */
export function pickPuzzleType(previousType: unknown, random: () => number = Math.random): PuzzleType {
  const previous = normalizePuzzleType(previousType);
  const options = PUZZLE_TYPES.filter((t) => t !== previous);
  const index = Math.min(Math.floor(random() * options.length), options.length - 1);
  return options[Math.max(index, 0)];
}

/** Printed minutes for the puzzle break, set in code, never by the AI. */
export const PUZZLE_MINUTES: Record<PuzzleType, Record<BandKey, number>> = {
  word_search: { "K-2": 10, "3-5": 15, "6-8": 20 },
  maze: { "K-2": 10, "3-5": 15, "6-8": 20 },
  sudoku: { "K-2": 10, "3-5": 15, "6-8": 25 },
  crossword: { "K-2": 10, "3-5": 15, "6-8": 20 },
};

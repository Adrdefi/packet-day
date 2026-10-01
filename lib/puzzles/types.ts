import type { BandKey } from "@/lib/pdf-tokens";

// The four puzzle break types. Packets made before puzzle rotation have no
// puzzle data at all; every one of them had a word search.
export const PUZZLE_TYPES = ["word_search", "maze", "sudoku", "crossword"] as const;
export type PuzzleType = (typeof PUZZLE_TYPES)[number];

/** Bump when a generator changes in a way that would build a different grid from the same seed. */
export const PUZZLE_GENERATOR_VERSION = 1;

/** Eight compass directions, as [dx, dy] with y growing downward. */
export const WORD_DIRECTIONS = {
  E: [1, 0],
  S: [0, 1],
  SE: [1, 1],
  NE: [1, -1],
  W: [-1, 0],
  N: [0, -1],
  NW: [-1, -1],
  SW: [-1, 1],
} as const;
export type WordDirection = keyof typeof WORD_DIRECTIONS;

export interface PlacedWord {
  word: string;
  /** Column of the first letter. */
  x: number;
  /** Row of the first letter. */
  y: number;
  dir: WordDirection;
}

export interface WordSearchPuzzle {
  type: "word_search";
  band: BandKey;
  size: number;
  /** One string per row, `size` letters each. */
  grid: string[];
  /** Placed words in the order of the word bank (alphabetical). */
  words: PlacedWord[];
}

export interface MazePuzzle {
  type: "maze";
  band: BandKey;
  width: number;
  height: number;
  /**
   * One hex digit per cell, row by row. Bits are walls that are present:
   * 1 = north, 2 = east, 4 = south, 8 = west. The entrance is the north side
   * of the top left cell and the exit is the south side of the bottom right
   * cell; both are open in this data.
   */
  walls: string;
  /** The solution from the top left cell to the bottom right one, as steps "N" | "E" | "S" | "W". */
  solution: string;
}

export interface SudokuPuzzle {
  type: "sudoku";
  band: BandKey;
  size: number;
  boxRows: number;
  boxCols: number;
  /** K-2 prints shapes (1 circle, 2 square, 3 triangle, 4 star) instead of digits. */
  shapes: boolean;
  /** size*size digits row by row, "0" for a blank. */
  givens: string;
  /** size*size digits row by row, fully filled. */
  solution: string;
}

export interface CrosswordEntry {
  number: number;
  dir: "across" | "down";
  x: number;
  y: number;
  answer: string;
  clue: string;
}

export interface CrosswordPuzzle {
  type: "crossword";
  band: BandKey;
  width: number;
  height: number;
  /** Across entries by number, then down entries by number. */
  entries: CrosswordEntry[];
  /** K-2 only: the answers, alphabetical, printed as a word bank. */
  wordBank: string[] | null;
}

export type BuiltPuzzle = WordSearchPuzzle | MazePuzzle | SudokuPuzzle | CrosswordPuzzle;

/** What the AI writes for the puzzle break. Clues only matter for a crossword. */
export interface PuzzleWordInput {
  word: string;
  clue?: string | null;
}

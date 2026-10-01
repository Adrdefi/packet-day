import type { PuzzleWordInput } from "./types";

/** Uppercase A-Z only. "Sea-horse!" -> "SEAHORSE". */
export function normalizeWord(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

export function isPalindrome(word: string): boolean {
  return word.length > 1 && word === [...word].reverse().join("");
}

export interface CleanWordOptions {
  minLength: number;
  maxLength: number;
  /**
   * Drop palindromes and any word found inside another word, forwards or
   * backwards. A word search needs this: such a word can never appear exactly
   * once when every direction is counted.
   */
  dropContained: boolean;
}

/**
 * Normalizes the AI's word list and drops anything a grid can't use:
 * empties, duplicates, wrong lengths, and (for a word search) palindromes and
 * contained words. Keeps the AI's order, and keeps each word's clue.
 */
export function cleanWordList(input: readonly PuzzleWordInput[], opts: CleanWordOptions): PuzzleWordInput[] {
  const seen = new Set<string>();
  const out: PuzzleWordInput[] = [];
  for (const item of input) {
    const word = normalizeWord(item?.word);
    if (word.length < opts.minLength || word.length > opts.maxLength) continue;
    if (seen.has(word)) continue;
    if (opts.dropContained && isPalindrome(word)) continue;
    seen.add(word);
    const clue = typeof item?.clue === "string" ? item.clue.trim() : null;
    out.push({ word, clue });
  }
  if (!opts.dropContained) return out;

  // Drop the shorter word whenever one sits inside another, either way round.
  // Two same-length words that are each other's reverse (STAR, RATS) keep
  // the first one.
  return out.filter(({ word }, i) =>
    !out.some((other, j) => {
      if (j === i || other.word.length < word.length) return false;
      if (other.word.length === word.length && j > i) return false;
      const reversed = [...other.word].reverse().join("");
      return other.word.includes(word) || reversed.includes(word);
    })
  );
}

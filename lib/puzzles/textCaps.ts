import type { BandKey } from "@/lib/pdf-tokens";

// Length caps for the puzzle break page's text, so the page always fits on
// one printed page with room for the grid (see the height budget in
// components/PacketPDF.tsx). The prompt asks for these in words, a little
// under the character caps, so trimming in code is rare.

export interface PuzzleTextCaps {
  /** Mascot intro card. */
  introChars: number;
  introWords: number;
  /** Did You Know box. */
  factChars: number;
  factWords: number;
  /** Joke of the Day lines. A joke over its cap is dropped, never cut: half a punchline isn't a joke. */
  jokeQuestionChars: number;
  jokePunchlineChars: number;
  jokeQuestionWords: number;
  jokePunchlineWords: number;
}

export const PUZZLE_TEXT_CAPS: Record<BandKey, PuzzleTextCaps> = {
  "K-2": { introChars: 175, introWords: 28, factChars: 140, factWords: 22, jokeQuestionChars: 65, jokePunchlineChars: 50, jokeQuestionWords: 10, jokePunchlineWords: 8 },
  "3-5": { introChars: 200, introWords: 32, factChars: 165, factWords: 26, jokeQuestionChars: 75, jokePunchlineChars: 58, jokeQuestionWords: 12, jokePunchlineWords: 9 },
  "6-8": { introChars: 225, introWords: 36, factChars: 190, factWords: 30, jokeQuestionChars: 85, jokePunchlineChars: 65, jokeQuestionWords: 13, jokePunchlineWords: 10 },
};

/**
 * Text at most `cap` characters, cut cleanly: at the last full sentence that
 * fits if that keeps a fair share of the text, otherwise at the last whole
 * word with an ellipsis. Never mid word.
 */
export function trimToCap(text: string, cap: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= cap) return clean;
  const window = clean.slice(0, cap + 1);
  let sentenceEnd = -1;
  for (const m of window.matchAll(/[.!?](?=\s|$)/g)) {
    if (m.index !== undefined && m.index < cap) sentenceEnd = m.index;
  }
  if (sentenceEnd >= cap * 0.4) return clean.slice(0, sentenceEnd + 1);
  const lastSpace = clean.lastIndexOf(" ", cap - 1);
  const cut = lastSpace > 0 ? clean.slice(0, lastSpace) : clean.slice(0, cap - 1);
  return `${cut.replace(/[\s,;:.!?]+$/, "")}…`;
}

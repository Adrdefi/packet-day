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

/** Short words that end with a period without ending a sentence. */
const ABBREVIATIONS = new Set(["mr", "mrs", "ms", "dr", "st", "mt", "vs", "jr", "sr", "no", "etc", "approx"]);

/** Splits text into whole sentences, keeping each one's own punctuation. */
export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    // Swallow runs like "?!" and a closing quote or bracket.
    let end = i + 1;
    while (end < clean.length && /[.!?"'”’)\]]/.test(clean[end])) end++;
    if (end < clean.length && clean[end] !== " ") continue;
    if (ch === ".") {
      const word = clean.slice(start, i).split(" ").pop() ?? "";
      // "T. rex", "Dr. Reyes", "Mt. Fuji": a period after a single letter or a known abbreviation.
      if (/^[A-Za-z]$/.test(word) || ABBREVIATIONS.has(word.toLowerCase())) continue;
      // "3.5" never gets here (no space after the dot).
    }
    out.push(clean.slice(start, end).trim());
    start = end + 1;
    i = end;
  }
  const rest = clean.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/**
 * As many whole sentences as fit in `cap` characters, from the start, or
 * null if even the first sentence is too long. Never cuts a sentence and
 * never adds punctuation.
 */
export function wholeSentences(text: string, cap: number): string | null {
  let out = "";
  for (const sentence of splitSentences(text)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > cap) break;
    out = next;
  }
  return out || null;
}

/** Stock mascot intros, used when the model's first sentence is over the cap. All fit the smallest cap. */
const STOCK_INTROS = [
  (name: string, mascot: string) => `${name}, ${mascot} made this puzzle just for you. Take your time and have fun with it!`,
  (name: string, mascot: string) => `Ready, ${name}? ${mascot} picked this puzzle for today. Go slow, look closely, and enjoy it.`,
  (name: string, mascot: string) => `${name}, here is today's puzzle from ${mascot}. One careful step at a time is the best way to solve it.`,
  (name: string, mascot: string) => `${mascot} saved this puzzle for you, ${name}. Use your sharp eyes and take it one step at a time.`,
];

export function stockIntro(childFirstName: string, mascotName: string | null | undefined, seed: number): string {
  const mascot = mascotName?.trim() || "Your puzzle buddy";
  const line = STOCK_INTROS[Math.abs(seed) % STOCK_INTROS.length](childFirstName, mascot);
  // "Your puzzle buddy" reads oddly mid sentence; keep it capitalized only at the start.
  return mascotName?.trim() ? line : line.replace(/(?<!^)Your puzzle buddy/, "your puzzle buddy");
}

/** Stock encouragement for the old callout, shown when the joke had to be dropped. */
const STOCK_ENCOURAGEMENT = [
  (name: string) => `${name}, every puzzle you finish makes your brain a little stronger. Nice work!`,
  (name: string) => `Way to stick with it, ${name}! Puzzles like this build sharp eyes and a patient mind.`,
  (name: string) => `${name}, you worked through it one step at a time. That is exactly how real puzzlers do it!`,
];

export function stockEncouragement(childFirstName: string, seed: number): string {
  return STOCK_ENCOURAGEMENT[Math.abs(seed) % STOCK_ENCOURAGEMENT.length](childFirstName);
}

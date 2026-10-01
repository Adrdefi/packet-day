// Joke of the Day for the puzzle break page: a question and a punchline.

export interface PuzzleJoke {
  question: string;
  punchline: string;
}

/** Longest each line may be before the joke is dropped; the prompt asks for much shorter. */
export const JOKE_MAX_CHARS = 110;

/** Em dash, en dash, and the other dash characters, plus a spaced hyphen used as punctuation. */
const DASHES = /\s*[‒–—―−]\s*|\s+-+\s+|\s*--+\s*/g;

function cleanLine(raw: unknown, maxChars: number): string | null {
  if (typeof raw !== "string") return null;
  // The brand never uses dashes as punctuation; swap any for a comma.
  const text = raw.replace(DASHES, ", ").replace(/\s+/g, " ").trim();
  if (!text || text.length > maxChars) return null;
  return text;
}

/**
 * The model's joke, cleaned, or null if it's missing or unusable. With
 * `caps` (the band's line limits), a line over its cap drops the whole joke:
 * a joke can't be trimmed without breaking it.
 */
export function normalizeJoke(raw: unknown, caps?: { question: number; punchline: number }): PuzzleJoke | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const question = cleanLine(r.question, Math.min(caps?.question ?? JOKE_MAX_CHARS, JOKE_MAX_CHARS));
  const punchline = cleanLine(r.punchline, Math.min(caps?.punchline ?? JOKE_MAX_CHARS, JOKE_MAX_CHARS));
  if (!question || !punchline) return null;
  return { question, punchline };
}

/** The "never repeat these" list for the prompt, newest first. */
export function formatRecentJokes(jokes: readonly PuzzleJoke[]): string {
  if (jokes.length === 0) return "- (none yet)";
  return jokes.map((j) => `- ${j.question} / ${j.punchline}`).join("\n");
}

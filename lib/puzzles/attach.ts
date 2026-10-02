import { bandForGrade, type BandKey } from "@/lib/pdf-tokens";
import { childFirstName } from "@/lib/titleStyles";
import type { PacketContent } from "@/types";
import { buildPuzzle } from "./index";
import { normalizeJoke } from "./jokes";
import { PUZZLE_MINUTES } from "./rotation";
import { PUZZLE_TEXT_CAPS, stockEncouragement, stockIntro, wholeSentences } from "./textCaps";
import { PUZZLE_GENERATOR_VERSION, type PuzzleType, type PuzzleWordInput, type StoredPuzzle } from "./types";
import { normalizeWord } from "./words";

export interface AttachPuzzleResult {
  /** False when the packet has no puzzle break activity (the model left it out). */
  found: boolean;
  requestedType: PuzzleType;
  /** The type actually stored, or null for no puzzle (the old word search renders). */
  builtType: PuzzleType | null;
  fellBack: boolean;
  candidateCount: number;
  /** Words or answers in the built grid; null for a maze or sudoku. */
  wordsUsed: number | null;
  hasJoke: boolean;
  durationMs: number;
}

/** The old 10x10 renderer's word list: up to 10 words of 3 to 10 letters, like every packet before rotation. */
const LEGACY_WORD_COUNT = 10;
const LEGACY_MAX_LENGTH = 10;

function titleCase(text: string): string {
  return text.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Title and intro written in code, for when the puzzle the model wrote for isn't the one that got built. */
function fallbackCopy(band: BandKey, name: string, theme: string): { title: string; intro: string } {
  const how =
    band === "K-2" ? "They go across and down." : band === "3-5" ? "They go across, down, and on a slant." : "They run in all eight directions, backwards too.";
  return {
    title: `${titleCase(theme)} Word Search`,
    intro: `${name}, can you find every hidden ${theme.trim().toLowerCase()} word? ${how} Circle each one and check it off the list.`,
  };
}

function findPuzzleActivityIndex(content: PacketContent): number {
  const activities = Array.isArray(content.activities) ? content.activities : [];
  const byType = activities.findIndex((a) => a?.content_type === "puzzle_break");
  if (byType !== -1) return byType;
  return activities.findIndex((a) => typeof a?.subject === "string" && a.subject.toLowerCase().includes("puzzle"));
}

/**
 * Builds the puzzle break for a freshly parsed packet and stores it, in place:
 * activity.puzzle (the grid plus intro, joke, and seed), top level
 * puzzle_type and joke for cheap history lookups, minutes from code, and an
 * old style word list in activity.instructions so the current renderer still
 * draws a normal word search. Never throws: any failure leaves no puzzle
 * data and the page renders exactly as it did before rotation.
 */
export function attachPuzzleBreak(
  content: PacketContent,
  opts: { requestedType: PuzzleType; gradeLevel: string; childName: string; theme: string; seed: number }
): AttachPuzzleResult {
  const start = Date.now();
  const result: AttachPuzzleResult = {
    found: false,
    requestedType: opts.requestedType,
    builtType: null,
    fellBack: false,
    candidateCount: 0,
    wordsUsed: null,
    hasJoke: false,
    durationMs: 0,
  };
  try {
    const index = findPuzzleActivityIndex(content);
    if (index === -1) return result;
    result.found = true;

    const activity = content.activities[index];
    const raw = activity as unknown as Record<string, unknown>;
    const band = bandForGrade(opts.gradeLevel);
    const name = childFirstName(opts.childName);

    const rawWords = Array.isArray(activity.instructions) ? activity.instructions : [];
    const rawClues = raw.clues && typeof raw.clues === "object" ? (raw.clues as Record<string, unknown>) : {};
    const clueFor = new Map<string, string>();
    for (const [k, v] of Object.entries(rawClues)) {
      if (typeof v === "string" && v.trim()) clueFor.set(normalizeWord(k), v.trim());
    }
    const candidates: PuzzleWordInput[] = rawWords
      .filter((w): w is string => typeof w === "string")
      .map((w) => {
        const clue = clueFor.get(normalizeWord(w));
        return clue ? { word: w, clue } : { word: w };
      });
    result.candidateCount = candidates.length;

    const caps = PUZZLE_TEXT_CAPS[band];
    const joke = normalizeJoke(raw.joke, { question: caps.jokeQuestionChars, punchline: caps.jokePunchlineChars });
    result.hasJoke = joke !== null;
    if (joke) content.joke = joke;

    const built = buildPuzzle({ type: opts.requestedType, gradeLevel: opts.gradeLevel, words: candidates, seed: opts.seed });
    result.fellBack = built.fellBack;

    let intro = typeof raw.puzzle_intro === "string" ? raw.puzzle_intro.trim() : "";
    if (built.fellBack || !intro) {
      const copy = fallbackCopy(band, name, opts.theme);
      intro = copy.intro;
      if (built.fellBack) {
        activity.title = copy.title;
        activity.description = copy.intro;
      }
    }

    // Caps keep the page to one printed page; trimming is rare because the
    // prompt asks for these lengths in words. Only whole sentences are ever
    // kept, and nothing is added to them.
    // - Intro: if even its first sentence is too long, a stock line.
    // - Did You Know: if its first sentence is too long, no box.
    // - Joke: never cut. One over its cap was already dropped above; the old
    //   encouragement callout then takes its place, never an empty box.
    intro = wholeSentences(intro, caps.introChars) ?? stockIntro(name, content.mascot_name, opts.seed);
    if (typeof activity.fun_fact === "string") activity.fun_fact = wholeSentences(activity.fun_fact, caps.factChars);
    if (!joke) {
      const own = typeof raw.encouragement === "string" ? wholeSentences(raw.encouragement, caps.introChars) : null;
      activity.encouragement = own ?? stockEncouragement(name, opts.seed);
    }

    // Old style word list for the current renderer.
    const legacy: string[] = [];
    for (const w of candidates) {
      const word = normalizeWord(w.word);
      if (word.length >= 3 && word.length <= LEGACY_MAX_LENGTH && !legacy.includes(word)) legacy.push(word);
      if (legacy.length >= LEGACY_WORD_COUNT) break;
    }
    activity.instructions = legacy;
    activity.estimated_minutes = PUZZLE_MINUTES[built.puzzle?.type ?? "word_search"][band];
    activity.answer_key = null;
    delete raw.puzzle_intro;
    delete raw.joke;
    delete raw.clues;

    if (built.puzzle) {
      const stored: StoredPuzzle = {
        version: PUZZLE_GENERATOR_VERSION,
        seed: opts.seed,
        requested_type: opts.requestedType,
        intro,
        joke,
        candidate_words: candidates,
        data: built.puzzle,
      };
      activity.puzzle = stored;
      content.puzzle_type = built.puzzle.type;
      result.builtType = built.puzzle.type;
      result.wordsUsed =
        built.puzzle.type === "word_search" ? built.puzzle.words.length : built.puzzle.type === "crossword" ? built.puzzle.entries.length : null;
    }
  } catch {
    // Never fail a packet over its puzzle; whatever was set stays, and with no
    // activity.puzzle the old word search renders.
  }
  result.durationMs = Date.now() - start;
  return result;
}

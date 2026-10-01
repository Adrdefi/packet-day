/**
 * Checks the puzzle break rotation and storage (no AI calls).
 *
 *   npm run check-puzzle-rotation
 *
 * - pickPuzzleType never returns the previous type, treats a missing or
 *   unknown one as word search, and can reach every other type.
 * - normalizeJoke cleans dashes, rejects missing or overlong lines.
 * - buildPuzzleBrief asks for clues only for a crossword, passes recent
 *   jokes, and never mentions a page number.
 * - attachPuzzleBreak stores activity.puzzle plus top level puzzle_type and
 *   joke, sets minutes from code, keeps an old style word list for the
 *   current renderer, removes the model's raw puzzle fields, and falls back
 *   correctly (new word search, then no puzzle data).
 *
 * Exits 1 on any failure.
 */

import type { PacketActivity, PacketContent } from "../types";
import type { BandKey } from "../lib/pdf-tokens";
import { attachPuzzleBreak } from "../lib/puzzles/attach";
import { buildPuzzleBrief } from "../lib/puzzles/brief";
import { normalizeJoke } from "../lib/puzzles/jokes";
import { PUZZLE_TEXT_CAPS, trimToCap } from "../lib/puzzles/textCaps";
import { PUZZLE_MINUTES, normalizePuzzleType, pickPuzzleType } from "../lib/puzzles/rotation";
import { PUZZLE_TYPES, type PuzzleType } from "../lib/puzzles/types";
import { validatePuzzle } from "../lib/puzzles";
import { THEME_WORD_LISTS } from "./lib/puzzle-word-lists";

const failures: string[] = [];
let passed = 0;
function expect(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

// ─── Picker ────────────────────────────────────────────────────────────────

const RANDOM_VALUES = [0, 0.0001, 0.2, 0.34, 0.5, 0.67, 0.8, 0.9999, 0.999999999];
const previousValues: unknown[] = [...PUZZLE_TYPES, null, undefined, "", "riddle", 7];
for (const previous of previousValues) {
  const expected = normalizePuzzleType(previous);
  const seen = new Set<PuzzleType>();
  for (const r of RANDOM_VALUES) {
    const picked = pickPuzzleType(previous, () => r);
    seen.add(picked);
    expect(`pick after ${JSON.stringify(previous)} with ${r}`, picked !== expected && PUZZLE_TYPES.includes(picked), picked);
  }
  const missing = PUZZLE_TYPES.filter((t) => t !== expected && !seen.has(t));
  expect(`every type reachable after ${JSON.stringify(previous)}`, missing.length === 0, missing.join(","));
}
for (let i = 0; i < 2000; i++) {
  expect("missing previous never picks word search", pickPuzzleType(undefined) !== "word_search");
}

// ─── Jokes ─────────────────────────────────────────────────────────────────

expect("joke: plain joke kept", JSON.stringify(normalizeJoke({ question: "Why did the comet blush?", punchline: "It saw the Milky Way!" })) === JSON.stringify({ question: "Why did the comet blush?", punchline: "It saw the Milky Way!" }));
expect("joke: em dash becomes a comma", normalizeJoke({ question: "What do you call a sleepy dino — a dino snore?", punchline: "Yes!" })?.question === "What do you call a sleepy dino, a dino snore?");
expect("joke: spaced hyphen becomes a comma", normalizeJoke({ question: "Knock knock - who is there?", punchline: "Lettuce." })?.question === "Knock knock, who is there?");
expect("joke: word hyphen kept", normalizeJoke({ question: "What is a T-rex's favorite number?", punchline: "Eight!" })?.question === "What is a T-rex's favorite number?");
expect("joke: missing punchline rejected", normalizeJoke({ question: "Why?" }) === null);
expect("joke: not an object rejected", normalizeJoke("Why? Because.") === null);
expect("joke: overlong rejected", normalizeJoke({ question: "x".repeat(200), punchline: "y" }) === null);

// ─── Length caps ───────────────────────────────────────────────────────────

expect("trim: short text untouched", trimToCap("Find the bugs, Lily!", 50) === "Find the bugs, Lily!");
expect("trim: cuts at a sentence end", trimToCap("Jordan, start at the top. Trust your sharp eyes and take it one letter at a time.", 40) === "Jordan, start at the top.");
{
  const t = trimToCap("Jordan, the lava tubes twist in every direction so start at the top and find the one path", 40);
  expect("trim: falls back to a word boundary with an ellipsis", t === "Jordan, the lava tubes twist in every…", t);
  expect("trim: never longer than the cap", t.length <= 40);
}
{
  // Every cut lands where the original has a space: never mid word.
  const source = "Supercalifragilistic words everywhere around the volcano rim tonight";
  for (let cap = 22; cap < source.length; cap++) {
    const t = trimToCap(source, cap);
    const kept = t.endsWith("…") ? t.slice(0, -1) : t;
    expect(`trim at ${cap}: whole words only`, source.startsWith(kept) && (source[kept.length] === " " || kept.length === source.length), t);
  }
}
for (const band of ["K-2", "3-5", "6-8"] as BandKey[]) {
  const caps = PUZZLE_TEXT_CAPS[band];
  const c = { question: caps.jokeQuestionChars, punchline: caps.jokePunchlineChars };
  expect(`joke caps ${band}: short joke kept`, normalizeJoke({ question: "Why are fish so smart?", punchline: "They live in schools!" }, c) !== null);
  expect(`joke caps ${band}: long question dropped`, normalizeJoke({ question: "Why ".repeat(30), punchline: "Ha!" }, c) === null);
  expect(`joke caps ${band}: long punchline dropped`, normalizeJoke({ question: "Why?", punchline: "Because ".repeat(15) }, c) === null);
  expect(`caps ${band}: prompt words fit under the character caps`, caps.introWords * 5 < caps.introChars && caps.factWords * 5 < caps.factChars);
}

// ─── Brief ─────────────────────────────────────────────────────────────────

for (const type of PUZZLE_TYPES) {
  for (const band of ["K-2", "3-5", "6-8"] as BandKey[]) {
    const brief = buildPuzzleBrief({ type, band, childFirstName: "Kai", theme: "Outer Space", recentJokes: [{ question: "Q1?", punchline: "P1!" }] });
    expect(`brief ${type} ${band}: names the type`, brief.includes(`Puzzle type for the puzzle_break activity: ${type}`));
    expect(`brief ${type} ${band}: clues only for crossword`, brief.includes("- clues:") === (type === "crossword"));
    expect(`brief ${type} ${band}: passes recent jokes`, brief.includes("- Q1? / P1!"));
    expect(`brief ${type} ${band}: no page numbers`, !/page \d/i.test(brief));
    expect(`brief ${type} ${band}: addresses the child`, brief.includes("speaking to Kai by name"));
    expect(`brief ${type} ${band}: no em dashes`, !/[–—]/.test(brief));
    expect(`brief ${type} ${band}: states the intro word cap`, brief.includes(`${PUZZLE_TEXT_CAPS[band].introWords} words at most`));
    if (type === "crossword") expect(`brief crossword ${band}: vocabulary answers only`, brief.includes("never a plot detail"));
  }
}
expect("brief with no history", buildPuzzleBrief({ type: "maze", band: "3-5", childFirstName: "Kai", theme: "Pirates", recentJokes: [] }).includes("- (none yet)"));

// ─── Attach ────────────────────────────────────────────────────────────────

function packet(words: string[], extra: Record<string, unknown> = {}): PacketContent {
  const puzzleActivity = {
    subject: "Puzzle Break",
    content_type: "puzzle_break",
    title: "Lost in the Galaxy",
    description: "A space puzzle.",
    instructions: words,
    estimated_minutes: 99,
    answer_key: "Words to find: lots",
    fun_fact: "A day on Venus is longer than its year.",
    puzzle_intro: "Kai, the stars are hiding words. You can do this!",
    joke: { question: "How do you throw a party in space?", punchline: "You planet!" },
    ...extra,
  } as unknown as PacketActivity;
  const other = { subject: "Math", content_type: "worksheet", title: "M", description: "d", instructions: ["a"], estimated_minutes: 20 } as PacketActivity;
  return { packet_title: "Kai's Space Day", activities: [other, other, other, puzzleActivity, other, other] };
}

const GRADES: Record<BandKey, string> = { "K-2": "1", "3-5": "4", "6-8": "7" };
for (const band of ["K-2", "3-5", "6-8"] as BandKey[]) {
  for (const type of PUZZLE_TYPES) {
    const list = THEME_WORD_LISTS[band][0].words;
    const clues = Object.fromEntries(list.map((w) => [w.word, w.clue]));
    const content = packet(list.map((w) => w.word), type === "crossword" ? { clues } : {});
    const r = attachPuzzleBreak(content, { requestedType: type, gradeLevel: GRADES[band], childName: "Kai Lopez", theme: "Outer Space", seed: 42 });
    const act = content.activities[3];
    const raw = act as unknown as Record<string, unknown>;
    const label = `attach ${type} ${band}`;
    expect(`${label}: found and built`, r.found && r.builtType === type && !r.fellBack, JSON.stringify(r));
    expect(`${label}: activity.puzzle stored and valid`, !!act.puzzle && validatePuzzle(act.puzzle.data, GRADES[band]) === null);
    expect(`${label}: top level puzzle_type`, content.puzzle_type === type);
    expect(`${label}: top level joke`, content.joke?.punchline === "You planet!");
    expect(`${label}: stored joke`, act.puzzle?.joke?.question === "How do you throw a party in space?");
    expect(`${label}: intro from the model`, act.puzzle?.intro === "Kai, the stars are hiding words. You can do this!");
    expect(`${label}: minutes from code`, act.estimated_minutes === PUZZLE_MINUTES[type][band], String(act.estimated_minutes));
    expect(`${label}: raw model fields removed`, !("puzzle_intro" in raw) && !("joke" in raw) && !("clues" in raw));
    expect(`${label}: answer key cleared`, act.answer_key === null);
    expect(`${label}: legacy word list for the old renderer`, act.instructions.length === 10 && act.instructions.every((w) => /^[A-Z]{3,10}$/.test(w)), act.instructions.join(","));
    expect(`${label}: title kept`, act.title === "Lost in the Galaxy");
    expect(`${label}: seed stored`, act.puzzle?.seed === 42);
    expect(`${label}: other activities untouched`, content.activities[0].estimated_minutes === 20);
    if (type === "crossword") {
      expect(`${label}: clues reach the grid`, act.puzzle?.data.type === "crossword" && act.puzzle.data.entries.every((e) => e.clue === clues[e.answer]));
    }
  }
}

// Crossword with no clues falls back to the new word search, with code written copy.
{
  const content = packet(THEME_WORD_LISTS["3-5"][0].words.map((w) => w.word));
  const r = attachPuzzleBreak(content, { requestedType: "crossword", gradeLevel: "4", childName: "Kai", theme: "outer space", seed: 1 });
  const act = content.activities[3];
  expect("no clues: falls back to word search", r.fellBack && r.builtType === "word_search" && content.puzzle_type === "word_search");
  expect("no clues: code written title", act.title === "Outer Space Word Search", act.title);
  expect("no clues: code written intro", act.puzzle?.intro.startsWith("Kai, can you find every hidden outer space word?") === true, act.puzzle?.intro);
  expect("no clues: intro has no dashes", !/[–—-]/.test(act.puzzle?.intro ?? ""));
  expect("no clues: word search minutes", act.estimated_minutes === PUZZLE_MINUTES.word_search["3-5"]);
}

// Too few words for anything: no puzzle data, old renderer fields intact.
{
  const content = packet(["SUN", "MOON", "STAR"]);
  const r = attachPuzzleBreak(content, { requestedType: "maze", gradeLevel: "4", childName: "Kai", theme: "Space", seed: 1 });
  const act = content.activities[3];
  expect("maze with few words still builds a maze", r.builtType === "maze" && !r.fellBack);
  const content2 = packet(["SUN", "MOON", "STAR"]);
  const r2 = attachPuzzleBreak(content2, { requestedType: "word_search", gradeLevel: "4", childName: "Kai", theme: "Space", seed: 1 });
  const act2 = content2.activities[3];
  expect("word search with few words: no puzzle", r2.builtType === null && r2.fellBack && act2.puzzle === undefined && content2.puzzle_type === undefined);
  expect("no puzzle: joke still saved for history", content2.joke?.punchline === "You planet!");
  expect("no puzzle: old renderer still has words", act2.instructions.join(",") === "SUN,MOON,STAR");
  expect("no puzzle: minutes from code", act2.estimated_minutes === PUZZLE_MINUTES.word_search["3-5"]);
  void act;
}

// No puzzle break activity (half day): nothing changes.
{
  const content: PacketContent = { packet_title: "Kai", activities: [{ subject: "Math", title: "M", description: "d", instructions: [], estimated_minutes: 20 }] };
  const before = JSON.stringify(content);
  const r = attachPuzzleBreak(content, { requestedType: "maze", gradeLevel: "4", childName: "Kai", theme: "Space", seed: 1 });
  expect("no puzzle activity: not found, untouched", !r.found && JSON.stringify(content) === before);
}

// Garbage model output never throws.
{
  const content = packet(null as unknown as string[], { joke: "ha", clues: 5, puzzle_intro: 12 });
  const r = attachPuzzleBreak(content, { requestedType: "crossword", gradeLevel: "7", childName: "Kai", theme: "Space", seed: 1 });
  expect("garbage: no throw, no puzzle", r.found && r.builtType === null && content.activities[3].puzzle === undefined);
}

if (failures.length > 0) {
  process.stderr.write(`\nPUZZLE ROTATION CHECK FAILED (${failures.length} problem${failures.length === 1 ? "" : "s"}):\n\n`);
  for (const f of failures.slice(0, 40)) process.stderr.write(`  ${f}\n`);
  process.exit(1);
}
process.stdout.write(`Puzzle rotation check passed: ${passed} checks.\n`);

import type { BandKey } from "@/lib/pdf-tokens";
import { CROSSWORD_BANDS } from "./crossword";
import { formatRecentJokes, type PuzzleJoke } from "./jokes";
import { PUZZLE_TEXT_CAPS } from "./textCaps";
import type { PuzzleType } from "./types";

// The <puzzle_brief> block for the user prompt. The server has already picked
// the puzzle type; the model writes only words, clues, and copy. Code builds
// every grid.

/** How many candidate words to ask for. Code drops any that don't fit. */
export const CANDIDATE_WORD_COUNT = 18;

/** Longest word to ask for, by band. Matches the K-2 and 3-5 crossword limits; 6-8 also fits every grid. */
export function maxWordLength(band: BandKey): number {
  return CROSSWORD_BANDS[band].maxWordLength;
}

const WHAT_THE_CHILD_SEES: Record<PuzzleType, Record<BandKey, string>> = {
  word_search: {
    "K-2": "A word search. Words go across and down only. A word bank of the words to find sits under the grid.",
    "3-5": "A word search. Words go across, down, and on a slant, never backwards. A word bank sits under the grid.",
    "6-8": "A hard word search. Words run in all eight directions, backwards too, and the extra letters are chosen to fool the eye. A word bank sits under the grid.",
  },
  maze: {
    "K-2": "A maze. The child starts at START at the top and finds the one path to FINISH at the bottom.",
    "3-5": "A big maze with long dead ends. The child starts at START at the top and finds the one path to FINISH at the bottom.",
    "6-8": "A very large maze with deep dead ends. The child starts at START at the top and finds the one path to FINISH at the bottom.",
  },
  sudoku: {
    "K-2": "A 4 by 4 shape sudoku. Every row, column, and 2 by 2 box gets one circle, one square, one triangle, and one star. The child draws the missing shapes.",
    "3-5": "A 6 by 6 sudoku. Every row, column, and 2 by 3 box gets the numbers 1 to 6 once.",
    "6-8": "A classic 9 by 9 sudoku. Every row, column, and 3 by 3 box gets the numbers 1 to 9 once.",
  },
  crossword: {
    "K-2": "A mini crossword of about 5 short words. A grown up reads each clue out loud, and the child picks the answer from a word bank and writes one letter in each box.",
    "3-5": "A crossword of about 11 words, with Across and Down clues.",
    "6-8": "A crossword of about 14 words. Some clues connect to today's reading and the rest to the theme.",
  },
};

const CLUE_RULES: Record<BandKey, string> = {
  "K-2":
    "Clues are read out loud by a grown up: simple definitions of 4 to 8 concrete words, like \"A baby dino hatches from this.\" No story references at all.",
  "3-5":
    "Clues are definitions of 5 to 12 words at a grade 3 to 5 reading level. At most 2 clues may mention the child or the mascot.",
  "6-8":
    "Clues are definitions or concept clues of 5 to 14 words. At most 3 clues may use a detail from today's reading, and only to clue a real vocabulary word. No riddles, no mystery or \"suspect\" style clues.",
};

export interface PuzzleBriefInput {
  type: PuzzleType;
  band: BandKey;
  childFirstName: string;
  theme: string;
  recentJokes: readonly PuzzleJoke[];
}

export function buildPuzzleBrief(input: PuzzleBriefInput): string {
  const { type, band, childFirstName: name, theme } = input;
  const maxLen = maxWordLength(band);
  const caps = PUZZLE_TEXT_CAPS[band];
  const crossword = type === "crossword";
  const wordUse = crossword
    ? "These are the crossword answers. Every answer is a real theme vocabulary word a kid would learn from (like TRANSIT, NEBULA, THORAX), never a plot detail or a generic story word (like DOME, GRAPH, PATTERN, MIRROR, SHADOW). Put the best ones first; code fits as many as it can and drops the rest."
    : type === "word_search"
      ? "These are the words to find. Put the best ones first; code fits as many as it can and drops the rest."
      : "The puzzle itself doesn't use these words. Code keeps them as a backup word search, so write them as carefully as for a real one.";

  return `<puzzle_brief>
Puzzle type for the puzzle_break activity: ${type} (chosen by the app, do not change it)
What ${name} will see: ${WHAT_THE_CHILD_SEES[type][band]}
Code builds and checks the grid. You write only the words${crossword ? ", clues," : ""} and the copy below.

For the puzzle_break activity:
- title: a fun puzzle title for this ${type.replace("_", " ")}, tied to the theme. 6 words or fewer. No dashes, no emoji.
- puzzle_intro: 1 or 2 short sentences, ${caps.introWords} words at most, in the mascot's voice, speaking to ${name} by name. Say what to do in this puzzle and end with a warm, specific nudge of encouragement. Never say how many words or answers there are. Never mention a page number; say "today's reading" if you need to point to the story. Never claim every answer or clue is in today's reading; you may say the clues connect to the reading or the theme.
- fun_fact: a Did You Know fact about ${theme}, one sentence of ${caps.factWords} words at most, surprising and specific. It is about the theme, not about puzzles, word searches, or language.
- instructions: exactly ${CANDIDATE_WORD_COUNT} theme words, uppercase letters only, 3 to ${maxLen} letters each, no spaces or punctuation. Every word different, no word hidden inside another word (not SUN and SUNSET), no word that reads the same backwards (like NOON). Words ${name} knows or meets in today's reading. ${wordUse}${crossword ? `
- clues: an object with one clue for every word in instructions, keyed by the word exactly as written there. ${CLUE_RULES[band]} A clue never contains its own answer. Never write "the reading's" as a possessive; refer to the story naturally, like "found in the tomb from today's story". No page numbers, no dashes.` : ""}
- joke: a Joke of the Day as {"question": "...", "punchline": "..."}. Tied to ${theme}. Right for grades ${band}: ${band === "K-2" ? "simple, silly, easy to get" : band === "3-5" ? "puns and wordplay a 9 year old gets" : "clever wordplay a middle schooler would groan at"}. Two short lines: the question ${caps.jokeQuestionWords} words at most, the punchline ${caps.jokePunchlineWords} words at most. Kind: no meanness, no put downs, no gross out or potty humor. No dashes.
- Leave out encouragement for the puzzle_break; it lives at the end of puzzle_intro.
- answer_key: null. The answer key is built automatically.

Recent jokes for ${name}, newest first. Never repeat one or reuse its punchline:
${formatRecentJokes(input.recentJokes)}
</puzzle_brief>`;
}

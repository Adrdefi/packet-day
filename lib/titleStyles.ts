import { bandForGrade, type BandKey } from "@/lib/pdf-tokens";
import { possessive } from "@/lib/possessive";

// Rotating packet titles. The server picks a style for each packet (never
// the child's previous one), the model writes the title in the same call as
// the packet, and the style it actually used is saved in generated_content.
//
// Packets made before this existed have no title_style. Every one of them is
// "[Name]'s [Theme] Adventure Day", so a missing style counts as "classic".

export const TITLE_STYLES = ["quest", "mystery", "versus", "expedition", "episode", "classic"] as const;
export type TitleStyle = (typeof TITLE_STYLES)[number];

/** Hard limits the prompt asks for. */
export const TITLE_MAX_WORDS = 6;
export const TITLE_MAX_CHARS = 40;
/** The code safety net is looser than the prompt, so a near miss still ships. */
export const TITLE_SAFETY_MAX_CHARS = 50;

export function isTitleStyle(value: unknown): value is TitleStyle {
  return typeof value === "string" && (TITLE_STYLES as readonly string[]).includes(value);
}

/** A stored style, with a missing or unknown one treated as "classic". */
export function normalizeTitleStyle(value: unknown): TitleStyle {
  return isTitleStyle(value) ? value : "classic";
}

/**
 * Random style, never equal to the previous one. A missing or unknown
 * previous style counts as "classic".
 */
export function pickTitleStyle(previousStyle: unknown, random: () => number = Math.random): TitleStyle {
  const previous = normalizeTitleStyle(previousStyle);
  const options = TITLE_STYLES.filter((s) => s !== previous);
  const index = Math.min(Math.floor(random() * options.length), options.length - 1);
  return options[Math.max(index, 0)];
}

interface StyleGuide {
  guide: string;
  examples: string;
  bands: Record<BandKey, string>;
}

const STYLE_GUIDES: Record<TitleStyle, StyleGuide> = {
  quest: {
    guide: "A quest: the child is on a journey to find, reach, or win something tied to the theme.",
    examples: `"Kai's Great Planet Quest"`,
    bands: {
      "K-2": "Playful and big: simple words, a treasure or a goal a little kid can picture.",
      "3-5": "Adventurous: a real goal with a little danger or daring in it.",
      "6-8": "Cool and understated: a mission, not a fairy tale. No exclamation points.",
    },
  },
  mystery: {
    guide: "A mystery: the child uncovers a secret, a clue, or a puzzle about the theme.",
    examples: `"Kai and the Secret of the Rings", or for grades 6-8 "Case File: Kai and the Pale Blue Dot"`,
    bands: {
      "K-2": "Playful: a friendly secret or a hidden surprise, never spooky.",
      "3-5": "Adventurous: a real puzzle to crack, a hint of suspense.",
      "6-8": "Cool and understated: a case file or an unsolved question. No exclamation points. The child's name still appears.",
    },
  },
  versus: {
    guide: "A versus: the child takes on a big idea, force, or challenge from the theme.",
    examples: `"Jonah vs. Gravity"`,
    bands: {
      "K-2": "Playful: a silly, friendly match up, like a race or a contest.",
      "3-5": "Adventurous: a real challenge the child can win.",
      "6-8": "Cool and understated: short and confident. No exclamation points.",
    },
  },
  expedition: {
    guide: "An expedition: the child explores the theme like a field trip into new territory.",
    examples: `"Andy's Adventures in Website Building"`,
    bands: {
      "K-2": "Playful: a trip somewhere fun and bright.",
      "3-5": "Adventurous: exploring, mapping, discovering.",
      "6-8": "Cool and understated: a field study or expedition, a little dry. No exclamation points.",
    },
  },
  episode: {
    guide: "An episode: today is one episode in the ongoing series starring the mascot and the child. Use the real packet number given below.",
    examples: `"Orbit and Kai, Episode 5"`,
    bands: {
      "K-2": "Playful: like a favorite cartoon.",
      "3-5": "Adventurous: like the next chapter of a series.",
      "6-8": "Cool and understated: like a show's episode title. No exclamation points.",
    },
  },
  classic: {
    guide: `The classic Packet Day title, exactly this pattern: "[Possessive] [Theme] Adventure Day". Shorten the theme to its key words if it would break the length limit.`,
    examples: `"Kai's Outer Space Adventure Day"`,
    bands: {
      "K-2": "Keep the pattern exactly.",
      "3-5": "Keep the pattern exactly.",
      "6-8": "Keep the pattern exactly.",
    },
  },
};

/** One line of guidance for a style at a grade band. */
export function titleStyleGuide(style: TitleStyle, band: BandKey): string {
  const g = STYLE_GUIDES[style];
  return `${g.guide} Voice: ${g.bands[band]} Tone examples (for other kids, never copy them): ${g.examples}.`;
}

export interface TitleBriefInput {
  childName: string;
  gradeLevel: string | null | undefined;
  theme: string;
  style: TitleStyle;
  /** This packet's number for this child, counting this one. Null if unknown. */
  packetNumber: number | null;
  /** The child's recent titles, newest first. */
  recentTitles: string[];
}

/** The child's first name, as typed. */
export function childFirstName(childName: string): string {
  return childName.trim().split(/\s+/)[0] ?? childName.trim();
}

/** The <title_brief> block for the user prompt. */
export function buildTitleBrief(input: TitleBriefInput): string {
  const band = bandForGrade(input.gradeLevel);
  const firstName = childFirstName(input.childName);
  const owner = possessive(firstName);
  const otherStyles = TITLE_STYLES.filter((s) => s !== input.style)
    .map((s) => `- ${s}: ${titleStyleGuide(s, band)}`)
    .join("\n");
  const recent =
    input.recentTitles.length > 0
      ? input.recentTitles.map((t) => `- ${t}`).join("\n")
      : "- (none yet, this is the first packet)";
  const numberLine =
    input.packetNumber !== null
      ? `Packet number: ${input.packetNumber} (this is ${firstName}'s packet number ${input.packetNumber})`
      : `Packet number: unknown (do not use the episode style)`;

  return `<title_brief>
Chosen style: ${input.style}
${titleStyleGuide(input.style, band)}
Child's first name: ${firstName}
Possessive form: ${owner} (use exactly this, character for character, whenever the title uses the possessive)
${numberLine}

Recent titles for ${firstName}, newest first. Never repeat one, and do not reuse their key words or shape:
${recent}

Title rules:
- ${firstName} must appear in the title.
- ${TITLE_MAX_WORDS} words or fewer, ${TITLE_MAX_CHARS} characters max.
- No trademarked names, brands, or characters.
- No emoji. No dashes or hyphens of any kind.
- Plain text, title case.

If the chosen style fits the theme badly, you may switch to a better one of these, then report the style you used in title_style:
${otherStyles}
</title_brief>`;
}

/** "Outer space" -> "Outer Space". Keeps the rest of each word as typed. */
function titleCaseWords(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** The classic title, built in code: "Anders' Bicycle Adventure Day". */
export function buildClassicTitle(childName: string, theme: string): string {
  return `${possessive(childFirstName(childName))} ${titleCaseWords(theme)} Adventure Day`;
}

/**
 * Why a model-written title must be replaced, or null if it's fine. The code
 * safety net only catches what would visibly break: a missing title, one
 * without the child's name, or one too long for the cover.
 */
export function titleRejectionReason(title: unknown, childName: string): string | null {
  if (typeof title !== "string" || !title.trim()) return "missing";
  const firstName = childFirstName(childName);
  if (!title.toLowerCase().includes(firstName.toLowerCase())) return "missing the child's first name";
  if (title.trim().length > TITLE_SAFETY_MAX_CHARS) return `longer than ${TITLE_SAFETY_MAX_CHARS} characters`;
  return null;
}

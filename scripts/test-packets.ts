/**
 * Packet generation quality test script.
 *
 * Generates full (or, with --length half, half) day packets with the REAL packet writer prompt
 * (lib/packetPrompt.ts, the same one app/api/generate-packet/route.ts uses)
 * and validates: no emoji in text fields, division renders correctly,
 * passage in its own field, content_type present, math uses || separator,
 * the title rules, and the puzzle break (words, clues, joke, intro). Then it
 * feeds the real word lists through the puzzle generators (lib/puzzles) and
 * reports what got built. Text only: no images, no PDF, no database.
 *
 * Usage (requires ANTHROPIC_API_KEY in env):
 *   npx tsx scripts/test-packets.ts
 *   npx tsx scripts/test-packets.ts --theme "Rainforest" --grade K --puzzle-type maze
 *   npx tsx scripts/test-packets.ts --matrix --concurrency 4 --out <folder outside the repo>
 *
 *   --matrix         12 packets: each puzzle type in each grade band, varied themes
 *   --puzzle-type    force one type (word_search | maze | sudoku | crossword); default random
 *   --length         half | full (default full). Half expects 4 activities, puzzle_break last, no movement break
 *   --out DIR        save each raw model response as JSON (carries test names; keep it outside the repo)
 */

import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MODEL, MODELS_WITH_TEMPERATURE, THINKING_MODEL_MAX_TOKENS } from "../lib/config";
import { SYSTEM_PROMPT, buildUserPrompt } from "../lib/packetPrompt";
import { bandForGrade, type BandKey } from "../lib/pdf-tokens";
import { attachPuzzleBreak } from "../lib/puzzles/attach";
import { buildPuzzleBrief } from "../lib/puzzles/brief";
import { normalizeJoke } from "../lib/puzzles/jokes";
import { isPuzzleType, pickPuzzleType } from "../lib/puzzles/rotation";
import type { PuzzleType } from "../lib/puzzles/types";
import { normalizeWord } from "../lib/puzzles/words";
import type { Child, PacketContent } from "../types";
import {
  TITLE_MAX_CHARS,
  TITLE_MAX_WORDS,
  buildTitleBrief,
  childFirstName,
  isTitleStyle,
  pickTitleStyle,
  titleRejectionReason,
} from "../lib/titleStyles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCase {
  gradeBand: BandKey;
  gradeLevel: string;
  gradeDisplay: string;
  childName: string;
  theme: string;
  puzzleType: PuzzleType;
  packetLength: "half" | "full";
}

interface ValidationResult {
  pass: boolean;
  failures: string[];
  warnings: string[];
}

// ─── Emoji detection ──────────────────────────────────────────────────────────

const EMOJI_REGEX =
  /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|[\uFE00-\uFE0F]|[\u200B-\u200D\uFEFF]|\u20E3/g;

function hasEmoji(text: string): boolean {
  return EMOJI_REGEX.test(text);
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePacket(parsed: Record<string, unknown>, gradeBand: BandKey): ValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  // ── Top-level text fields must be emoji-free ────────────────────────────────
  const topFields = ["packet_title", "greeting", "packet_mission", "packet_celebration", "daily_reflection", "parent_notes"] as const;
  for (const field of topFields) {
    const val = parsed[field];
    if (typeof val === "string" && hasEmoji(val)) {
      failures.push(`EMOJI in "${field}": ${val.slice(0, 80)}`);
    }
  }

  // ── mascot_emoji_cluster is the ONLY allowed emoji field ────────────────────
  if (typeof parsed.mascot_emoji_cluster !== "string") {
    warnings.push("mascot_emoji_cluster missing or not a string");
  }

  // ── Activities ──────────────────────────────────────────────────────────────
  if (!Array.isArray(parsed.activities)) {
    failures.push("activities is not an array");
    return { pass: false, failures, warnings };
  }

  const activities = parsed.activities as Record<string, unknown>[];

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const label = `activities[${i}] (${act.subject ?? "?"})`;

    // content_type present
    if (!act.content_type) {
      failures.push(`${label}: missing content_type`);
    }

    // No emoji in text fields
    const actFields = ["title", "description", "encouragement", "answer_key"] as const;
    for (const f of actFields) {
      const val = act[f];
      if (typeof val === "string" && hasEmoji(val)) {
        failures.push(`EMOJI in ${label}.${f}: ${String(val).slice(0, 80)}`);
      }
    }

    // Instructions must be strings and emoji-free
    if (!Array.isArray(act.instructions)) {
      failures.push(`${label}: instructions is not an array`);
    } else {
      (act.instructions as string[]).forEach((step, j) => {
        if (hasEmoji(step)) {
          failures.push(`EMOJI in ${label}.instructions[${j}]: ${step.slice(0, 80)}`);
        }
      });
    }

    // Reading passages must use the passage field, not embed in instructions
    if (act.content_type === "reading_passage") {
      if (!act.passage || typeof act.passage !== "string" || act.passage.trim().length < 20) {
        failures.push(`${label}: reading_passage activity missing "passage" field`);
      } else {
        // Check word count matches grade band
        const wordCount = act.passage.trim().split(/\s+/).length;
        const [min, max] =
          gradeBand === "K-2" ? [80, 150] :
          gradeBand === "3-5" ? [200, 350] : [400, 600];
        if (wordCount < min || wordCount > max) {
          warnings.push(
            `${label}: passage word count ${wordCount} outside expected ${min}-${max} for ${gradeBand}`
          );
        }

        // Check that the passage is NOT in instructions
        const instrText = Array.isArray(act.instructions)
          ? (act.instructions as string[]).join(" ")
          : "";
        if (instrText.length > 300) {
          warnings.push(
            `${label}: instructions text is very long (${instrText.length} chars) — passage may be embedded in instructions instead of "passage" field`
          );
        }
      }
    }

    // Non-reading activities must have passage: null
    if (act.content_type !== "reading_passage" && act.passage) {
      warnings.push(`${label}: passage field should be null for content_type "${act.content_type as string}"`);
    }

    // Math: check for || separator and no ÷ × chars
    if (
      (act.subject as string)?.toLowerCase().includes("math") &&
      Array.isArray(act.instructions) &&
      act.instructions.length > 0
    ) {
      const quickCalcLine = (act.instructions as string[])[0] ?? "";
      if (quickCalcLine.includes("QUICK CALCULATIONS")) {
        if (!quickCalcLine.includes("||")) {
          failures.push(`${label}: Quick Calculations does not use || separator — old / separator risks splitting division problems`);
        }
        if (quickCalcLine.includes("÷") || quickCalcLine.includes("×")) {
          failures.push(`${label}: Math uses ÷ or × — these may not render in Nunito; use "x" / "divided by" instead`);
        }
        if (quickCalcLine.includes(" / ") && !quickCalcLine.includes("||")) {
          failures.push(`${label}: Quick Calculations uses ' / ' as separator — will split '56 / 8' problems incorrectly`);
        }
      }
    }
  }

  // ── Coloring page ───────────────────────────────────────────────────────────
  const cp = parsed.coloring_page as Record<string, unknown> | undefined;
  if (cp) {
    if (typeof cp.title === "string" && hasEmoji(cp.title)) {
      failures.push(`EMOJI in coloring_page.title: ${cp.title.slice(0, 80)}`);
    }
    if (typeof cp.instructions === "string" && hasEmoji(cp.instructions)) {
      failures.push(`EMOJI in coloring_page.instructions`);
    }
    // coloring_scene must be present (single source of truth for image generation)
    if (!cp.coloring_scene || typeof cp.coloring_scene !== "string" || cp.coloring_scene.trim().length < 20) {
      failures.push(`coloring_page.coloring_scene missing or too short`);
    }
    // Warn if old field name was used instead
    if ((cp as Record<string, unknown>).scene_description && !cp.coloring_scene) {
      failures.push(`coloring_page uses legacy "scene_description" field — must be "coloring_scene"`);
    }
  } else {
    warnings.push("coloring_page missing from packet");
  }

  return { pass: failures.length === 0, failures, warnings };
}

// ─── Generation ───────────────────────────────────────────────────────────────

// Title checks: the code safety net's rules are failures, the prompt's
// tighter length rules are warnings.
function validateTitle(parsed: Record<string, unknown>, childName: string): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];
  const title = parsed.packet_title;
  const rejection = titleRejectionReason(title, childName);
  if (rejection) failures.push(`packet_title ${rejection} (would fall back to classic): ${String(title ?? "")}`);
  if (!isTitleStyle(parsed.title_style)) failures.push(`title_style not one of the six: ${String(parsed.title_style ?? "missing")}`);
  if (typeof title === "string") {
    if (title.length > TITLE_MAX_CHARS) warnings.push(`packet_title is ${title.length} characters (prompt asks for ${TITLE_MAX_CHARS} max)`);
    if (title.trim().split(/\s+/).length > TITLE_MAX_WORDS) warnings.push(`packet_title is over ${TITLE_MAX_WORDS} words`);
    if (/[-‐-―]/.test(title)) failures.push(`packet_title has a dash: ${title}`);
  }
  return { failures, warnings };
}


// ─── Puzzle break checks ──────────────────────────────────────────────────────

const PAGE_NUMBER = /\bpages?\s*\d/i;
const DASH = /[‒–—―]|\s-+\s/;

function findPuzzleActivity(parsed: Record<string, unknown>): Record<string, unknown> | null {
  const acts = Array.isArray(parsed.activities) ? (parsed.activities as Record<string, unknown>[]) : [];
  return acts.find((a) => a.content_type === "puzzle_break") ?? null;
}

function validatePuzzleActivity(parsed: Record<string, unknown>, tc: TestCase): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];
  const act = findPuzzleActivity(parsed);
  if (!act) return { failures: ["no puzzle_break activity"], warnings };
  const acts = parsed.activities as Record<string, unknown>[];
  if (tc.packetLength === "half") {
    if (acts.length !== 4) failures.push(`half day packet has ${acts.length} activities, not 4`);
    if (acts.indexOf(act) !== 3 || acts.indexOf(act) !== acts.length - 1) {
      failures.push(`puzzle_break is activity ${acts.indexOf(act) + 1} of ${acts.length}, not the 4th and last`);
    }
    if (acts.some((a) => a.content_type === "movement_activity")) failures.push("half day packet has a movement_activity");
  } else if (acts.indexOf(act) !== 3) warnings.push(`puzzle_break is activity ${acts.indexOf(act) + 1}, not 4`);

  const words = Array.isArray(act.instructions) ? (act.instructions as unknown[]) : [];
  if (words.length < 10) failures.push(`only ${words.length} puzzle words`);
  else if (words.length < 16 || words.length > 20) warnings.push(`${words.length} puzzle words (asked for 18)`);
  const badFormat = words.filter((w) => typeof w !== "string" || !/^[A-Z]{3,}$/.test(w));
  if (badFormat.length) warnings.push(`words not uppercase A-Z: ${badFormat.join(", ")}`);

  const name = childFirstName(tc.childName);
  const intro = typeof act.puzzle_intro === "string" ? act.puzzle_intro : "";
  if (!intro) failures.push("puzzle_intro missing");
  else if (!intro.includes(name)) failures.push(`puzzle_intro doesn't name ${name}`);
  if (typeof act.encouragement === "string" && act.encouragement.trim()) warnings.push("puzzle_break still has a separate encouragement");
  if (typeof act.fun_fact === "string" && /word search|crossword|sudoku|maze|language/i.test(act.fun_fact)) {
    warnings.push(`fun_fact may be about puzzles, not the theme: ${act.fun_fact}`);
  }

  const joke = normalizeJoke(act.joke);
  const rawJoke = act.joke as Record<string, unknown> | undefined;
  if (!joke) failures.push(`joke missing or unusable: ${JSON.stringify(act.joke)}`);
  if (rawJoke && DASH.test(`${rawJoke.question ?? ""} ${rawJoke.punchline ?? ""}`)) warnings.push("joke had a dash (code swaps it for a comma)");
  if (joke) {
    for (const line of [joke.question, joke.punchline]) {
      if (line.split(/\s+/).length > 12) warnings.push(`joke line over 12 words: ${line}`);
    }
  }

  const texts: [string, unknown][] = [["title", act.title], ["puzzle_intro", act.puzzle_intro], ["fun_fact", act.fun_fact]];
  if (tc.puzzleType === "crossword") {
    const clues = act.clues && typeof act.clues === "object" ? (act.clues as Record<string, unknown>) : null;
    if (!clues) failures.push("crossword with no clues object");
    else {
      const clueFor = new Map(Object.entries(clues).map(([k, v]) => [normalizeWord(k), v]));
      const missing = words.filter((w) => typeof w === "string" && typeof clueFor.get(normalizeWord(w)) !== "string");
      if (missing.length) warnings.push(`${missing.length} words have no clue: ${missing.join(", ")}`);
      for (const [word, clue] of clueFor) {
        texts.push([`clue ${word}`, clue]);
        if (typeof clue === "string" && clue.toUpperCase().includes(word)) warnings.push(`clue for ${word} contains the answer`);
      }
    }
  } else if (act.clues) {
    warnings.push("clues written for a non-crossword");
  }
  for (const [label, text] of texts) {
    if (typeof text !== "string") continue;
    if (PAGE_NUMBER.test(text)) failures.push(`${label} mentions a page number: ${text}`);
    if (DASH.test(text)) warnings.push(`${label} has a dash: ${text}`);
  }
  if (typeof act.title === "string" && /[-‐-―]/.test(act.title)) failures.push(`puzzle title has a dash: ${act.title}`);
  return { failures, warnings };
}

// ─── Generation ───────────────────────────────────────────────────────────────

interface GenerationResult {
  parsed: Record<string, unknown>;
  usage: { input: number; output: number };
  seconds: number;
  meta: CallMeta;
}

/** What was sent and how the model stopped, logged for every packet. */
interface CallMeta {
  model: string;
  maxTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

const describeMeta = (m: CallMeta) =>
  `model ${m.model}, max_tokens ${m.maxTokens}, ${m.outputTokens} output tokens, stop_reason ${m.stopReason ?? "none"}`;

async function generateTestPacket(tc: TestCase): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const child = {
    name: tc.childName,
    grade_level: tc.gradeLevel,
    learning_style: "visual",
    favorite_subjects: [],
    special_notes: null,
  } as unknown as Child;

  const userPrompt = buildUserPrompt(
    child,
    tc.theme,
    tc.packetLength,
    undefined,
    undefined,
    buildTitleBrief({
      childName: tc.childName,
      gradeLevel: tc.gradeLevel,
      theme: tc.theme,
      style: pickTitleStyle(null),
      packetNumber: 1,
      recentTitles: [],
    }),
    buildPuzzleBrief({
      type: tc.puzzleType,
      band: tc.gradeBand,
      childFirstName: childFirstName(tc.childName),
      theme: tc.theme,
      recentJokes: [],
    })
  );

  const started = Date.now();
  const legacyModel = MODELS_WITH_TEMPERATURE.has(MODEL);
  // Same cap the real route sends (callClaude in generate-packet/route.ts).
  const maxTokens = legacyModel ? (tc.packetLength === "half" ? 5000 : 8500) : THINKING_MODEL_MAX_TOKENS;
  // Streamed, like the real route, so a long thinking response can't time out.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    ...(legacyModel ? { temperature: 0.7 } : {}),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const response = await stream.finalMessage();
  const meta: CallMeta = {
    model: response.model,
    maxTokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason,
  };
  try {
    return { ...parseResponse(response), usage: { input: response.usage.input_tokens, output: response.usage.output_tokens }, seconds: (Date.now() - started) / 1000, meta };
  } catch (err) {
    // A cut off response usually fails to parse; say how the model stopped.
    throw new Error(`${err instanceof Error ? err.message : String(err)} (${describeMeta(meta)})`);
  }
}

function parseResponse(response: Anthropic.Message): { parsed: Record<string, unknown> } {

  // Thinking models put a thinking block first; the JSON is in the text block.
  const content = response.content.find((b) => b.type === "text");
  if (!content || content.type !== "text") throw new Error("Non-text response from Claude");

  const raw = content.text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");

  // balanced-brace extract
  let depth = 0, inStr = false, escaped = false;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
  }
  if (end === -1) throw new Error("Unterminated JSON");

  return { parsed: JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown> };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const GRADE_DISPLAY = (g: string) => (g === "K" ? "Kindergarten" : `Grade ${g}`);
const NAMES: Record<BandKey, string> = { "K-2": "Lily", "3-5": "Marcus", "6-8": "Jordan" };

/** Each puzzle type in each band, with varied themes. */
const MATRIX: [BandKey, string, PuzzleType, string][] = [
  ["K-2", "K", "word_search", "Bugs"],
  ["K-2", "1", "maze", "Farm Animals"],
  ["K-2", "2", "sudoku", "Dinosaurs"],
  ["K-2", "1", "crossword", "Ocean"],
  ["3-5", "3", "word_search", "Outer Space"],
  ["3-5", "4", "maze", "Pirates"],
  ["3-5", "5", "sudoku", "Rainforest"],
  ["3-5", "4", "crossword", "Bugs"],
  ["6-8", "6", "word_search", "Ancient Rome"],
  ["6-8", "7", "maze", "Volcanoes"],
  ["6-8", "8", "sudoku", "Ancient Egypt"],
  ["6-8", "7", "crossword", "Outer Space"],
];

interface Outcome {
  tc: TestCase;
  ok: boolean;
  error?: string;
  usage?: { input: number; output: number };
  attach?: ReturnType<typeof attachPuzzleBreak>;
  content?: PacketContent;
}

async function runCase(tc: TestCase, outDir: string | null): Promise<Outcome> {
  const tag = `${tc.packetLength === "half" ? "half " : ""}${tc.gradeBand} ${tc.puzzleType} (${tc.theme}, ${GRADE_DISPLAY(tc.gradeLevel)})`;
  // Full day files keep their old names; half day files are prefixed.
  const fileBase = `${tc.packetLength === "half" ? "half-" : ""}${tc.gradeBand}-${tc.puzzleType}`;
  try {
    const gen = await generateTestPacket(tc);
    const parsed = gen.parsed;
    if (outDir) writeFileSync(join(outDir, `${fileBase}.json`), JSON.stringify(parsed, null, 2));

    const result = validatePacket(parsed, tc.gradeBand);
    const titleResult = validateTitle(parsed, tc.childName);
    const puzzleResult = validatePuzzleActivity(parsed, tc);
    result.failures.push(...titleResult.failures, ...puzzleResult.failures);
    result.warnings.push(...titleResult.warnings, ...puzzleResult.warnings);
    if (gen.meta.stopReason === "max_tokens") result.failures.push(`stop_reason is max_tokens: the response hit the ${gen.meta.maxTokens} token cap`);
    result.pass = result.failures.length === 0;

    // The same build step the route runs after parsing.
    const content = parsed as unknown as PacketContent;
    const attach = attachPuzzleBreak(content, {
      requestedType: tc.puzzleType,
      gradeLevel: tc.gradeLevel,
      childName: tc.childName,
      theme: tc.theme,
      seed: Math.floor(Math.random() * 4294967296) >>> 0,
    });
    if (outDir) writeFileSync(join(outDir, `${fileBase}.built.json`), JSON.stringify(content, null, 2));

    const lines = [`\n[${result.pass ? "PASS" : "FAIL"}] ${tag}  ${gen.seconds.toFixed(0)}s, ${gen.usage.input} in / ${gen.usage.output} out tokens`];
    lines.push(`  Call: ${describeMeta(gen.meta)}`);
    lines.push(`  Title: ${String(parsed.packet_title ?? "")} (${String(parsed.title_style ?? "no style")})`);
    lines.push(
      `  Puzzle: asked ${attach.requestedType}, built ${attach.builtType ?? "nothing (old word search)"}${attach.fellBack ? " (FELL BACK)" : ""}, ` +
        `${attach.candidateCount} words in, ${attach.wordsUsed ?? "n/a"} used, ${attach.durationMs} ms`
    );
    result.failures.forEach((f) => lines.push(`  FAIL: ${f}`));
    result.warnings.forEach((w) => lines.push(`  warn: ${w}`));
    console.log(lines.join("\n"));
    return { tc, ok: result.pass, usage: gen.usage, attach, content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`\n[ERROR] ${tag}: ${message}`);
    return { tc, ok: false, error: message };
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY not set in environment");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const arg = (name: string) => {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };
  const theme = arg("--theme") ?? "Space Exploration";
  const singleGrade = arg("--grade");
  const forcedType = arg("--puzzle-type");
  if (forcedType && !isPuzzleType(forcedType)) {
    console.error("--puzzle-type must be one of word_search, maze, sudoku, crossword");
    process.exit(1);
  }
  const packetLength = arg("--length") ?? "full";
  if (packetLength !== "half" && packetLength !== "full") {
    console.error("--length must be half or full");
    process.exit(1);
  }
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 1));
  const outDir = arg("--out");
  if (outDir) mkdirSync(outDir, { recursive: true });

  let cases: TestCase[];
  if (args.includes("--matrix")) {
    cases = MATRIX.map(([band, grade, type, t]) => ({
      gradeBand: band, gradeLevel: grade, gradeDisplay: GRADE_DISPLAY(grade), childName: NAMES[band], theme: t, puzzleType: type, packetLength,
    }));
  } else {
    cases = (["K", "4", "7"] as const).map((grade) => {
      const band = bandForGrade(grade);
      return {
        gradeBand: band, gradeLevel: grade, gradeDisplay: GRADE_DISPLAY(grade), childName: NAMES[band], theme,
        puzzleType: (forcedType as PuzzleType | null) ?? pickPuzzleType(null),
        packetLength,
      };
    });
    if (singleGrade) cases = cases.filter((c) => c.gradeLevel === singleGrade || c.gradeBand === singleGrade);
  }

  console.log("\nPacket Day — Generation Quality Test");
  console.log(`Model: ${MODEL}  |  ${cases.length} ${packetLength} day packet${cases.length === 1 ? "" : "s"}, ${concurrency} at a time`);
  console.log("=".repeat(60));

  const outcomes: Outcome[] = [];
  for (let i = 0; i < cases.length; i += concurrency) {
    outcomes.push(...(await Promise.all(cases.slice(i, i + concurrency).map((tc) => runCase(tc, outDir)))));
  }

  console.log("\n" + "=".repeat(60));
  console.log("Puzzle fit (real model words through the generators):");
  for (const o of outcomes) {
    if (!o.attach) {
      console.log(`  ${o.tc.gradeBand} ${o.tc.puzzleType.padEnd(11)} ERROR ${o.error ?? ""}`);
      continue;
    }
    const a = o.attach;
    console.log(
      `  ${o.tc.gradeBand} ${o.tc.puzzleType.padEnd(11)} built ${String(a.builtType ?? "none").padEnd(11)} ` +
        `${a.fellBack ? "FELL BACK " : "          "}words in ${String(a.candidateCount).padStart(2)}, used ${a.wordsUsed ?? "n/a"}`
    );
  }

  console.log("\nJokes:");
  for (const o of outcomes) {
    const j = o.content?.joke;
    console.log(`  ${o.tc.gradeBand} ${o.tc.theme}: ${j ? `${j.question} / ${j.punchline}` : "(none)"}`);
  }

  console.log("\nCrossword clues:");
  for (const o of outcomes) {
    const data = o.content?.activities?.find((a) => a.puzzle)?.puzzle?.data;
    if (o.tc.puzzleType !== "crossword" || !data || data.type !== "crossword") continue;
    console.log(`  ${o.tc.gradeBand} ${o.tc.theme} (${data.entries.length} answers, ${data.width}x${data.height}):`);
    for (const e of data.entries) console.log(`    ${String(e.number).padStart(2)} ${e.dir.padEnd(6)} ${e.answer.padEnd(11)} ${e.clue}`);
  }

  const used = outcomes.filter((o) => o.usage);
  if (used.length) {
    const avg = (k: "input" | "output") => Math.round(used.reduce((s, o) => s + o.usage![k], 0) / used.length);
    console.log(`\nTokens: average ${avg("input")} in / ${avg("output")} out per packet (output includes thinking)`);
  }

  const passed = outcomes.filter((o) => o.ok).length;
  console.log(`\nResult: ${passed} passed, ${outcomes.length - passed} failed out of ${outcomes.length} packets`);
  process.exit(passed === outcomes.length ? 0 : 1);
}

main();

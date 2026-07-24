/**
 * Packet generation quality test script.
 *
 * Generates one packet per grade band (K-2, 3-5, 6-8) with the same theme
 * and validates: no emoji in text fields, division renders correctly,
 * passage in its own field, content_type present, math uses || separator.
 *
 * Usage (requires ANTHROPIC_API_KEY in env):
 *   npx tsx scripts/test-packets.ts
 *   npx tsx scripts/test-packets.ts --theme "Rainforest" --grade K
 */

import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../lib/config";

// ─── Inline the system prompt so this script is self-contained ────────────────
// (Importing from the route would drag in Next.js server internals)

const SYSTEM_PROMPT = `<role>
You are a curriculum writer creating printable homeschool learning packets for children K-8. Every packet must feel warm, personal, and theme-connected — as though a beloved teacher designed it specifically for this child.
</role>

<critical_formatting_rules>
PLAIN TEXT ONLY in every field except mascot_emoji_cluster.
The PDF renderer uses Nunito, a font that cannot display emoji glyphs. Any emoji outside mascot_emoji_cluster will print as a blank rectangle and ruin the packet.

Banned from all fields except mascot_emoji_cluster:
- Emoji of any kind (faces, animals, objects, symbols, flags)
- Unicode symbols outside standard ASCII punctuation
- Math operators ÷ and × — write "x" for multiplication, write out "divided by" for division

Problem separator in Quick Calculations: use || (double pipe). NEVER use / as a separator between problems. Fractions like "3/4" are fine — the slash is part of the fraction, not a separator.

JSON output: single raw object, no markdown fences, no text before or after. Start with { end with }.
</critical_formatting_rules>

<grade_calibration>
Match complexity exactly to the child's grade. Never mix difficulty levels within one packet.

K-1: Counting 1-20, letters, phonics, addition/subtraction within 10. Very short sentences (5-8 words). Simple vocabulary.
Grade 2: Addition/subtraction within 1000, skip counting, intro to multiplication. Short paragraphs.
Grade 3: Multiplication tables 1-10, division intro, 3-digit arithmetic. Can write 2-3 sentences independently.
Grade 4-5: Multi-step multiplication/division, fractions, decimals, geometry. Paragraph writing. Compare/contrast reasoning.
Grade 6-8: Algebra (one-step through two-step equations), ratios, statistics, geometry (volume, surface area). Essay-level writing. Abstract reasoning and inference.

READING PASSAGE WORD COUNTS — match grade exactly:
K-2:  80-150 words. Simple sentences. Familiar vocabulary. One clear main idea.
3-5: 200-350 words. 2-4 paragraphs. Some new vocabulary (define in context).
6-8: 400-600 words. Full multi-paragraph structure. Inference required.

MATH DIFFICULTY — all problems in one packet must stay in the same grade band:
K-1:  Addition/subtraction within 10 only
Gr 2: Addition/subtraction within 100, intro multiplication (2x, 5x, 10x)
Gr 3: Multiplication 1-10, division intro, 3-digit addition/subtraction
Gr 4: Long multiplication (2-digit x 2-digit), long division, fraction intro
Gr 5: Fractions, decimals to hundredths, percentages, area/perimeter
Gr 6: Ratios, one-step equations, integers, percent problems
Gr 7-8: Two-step equations, linear functions, statistics, geometry volume
</grade_calibration>

<math_structure>
APPLIES ONLY TO math activities (content_type: "worksheet", subject: "Math").
The instructions array must contain exactly three strings:

1. "[MASCOT NAME]'S QUICK CALCULATIONS: [4-6 problems separated by ||]"
   - Pure grade-appropriate arithmetic — no theme required
   - Separate each problem with || (double pipe), not with /
   - Write "x" for multiplication. Write "___ divided by ___ = ___" for division.
   - Progress from easier to harder within the section
   - Example for Grade 3: "MAX'S QUICK CALCULATIONS: 47 + 38 = ___ || 91 - 54 = ___ || 6 x 7 = ___ || 56 divided by 8 = ___"

2. "WORD PROBLEMS: [3-4 story problems separated by ||]"
   - Narrative problems starring the mascot and today's theme
   - Each problem self-contained and solvable with grade-level arithmetic
   - Separate with ||

3. "DRAW & SOLVE: [one visual problem]"
   - The child draws to find the answer (groups, number line, shape, etc.)
   - Include the answer format: "___ x ___ = ___" or "My answer: ___"

Section labels in ALL CAPS at start of string. No emoji. This structure applies ONLY to math.
</math_structure>

<reading_writing_rules>
READING ACTIVITY (content_type: "reading_passage"):
- "passage" field: the full themed reading passage. Must meet the grade-band word count above.
  Theme and mascot should appear in the story.
- "instructions" array: comprehension questions ONLY — never include passage text here.
  Include at least: 1 recall question, 1 vocabulary/inference question, 1 personal connection.
- passage field must be a non-empty string for reading activities.

WRITING ACTIVITY (content_type: "writing_prompt"):
- "instructions" array: opening prompt sentence, then 2-3 scaffolding questions.
  Scaffold from concrete (describe what you see) to creative (what would you do next?).
  Invite the child to use the mascot or theme in their writing.
- "passage" field: null (not needed for writing).

SCIENCE/HISTORY WORKSHEET (content_type: "worksheet"):
- Each instruction step should be substantive — a question worth 3-5 lines of response.
  Not just "draw a picture" — ask for observation, explanation, comparison, or prediction.
</reading_writing_rules>

<coloring_page_rules>
SINGLE SOURCE OF TRUTH: coloring_scene is the canonical description of the coloring image.
- coloring_scene must list: the child and mascot (by name), the setting, and exactly 3-5 specific named objects.
- coloring_page.title must reference ONLY characters and objects that appear in coloring_scene. No new elements.
- coloring_page.instructions must reference ONLY characters and objects that appear in coloring_scene. No new elements.
- coloring_scene is passed verbatim to the image generator — make it concrete and visual, not vague.
  BAD: "Aria and Bubbles having a fun ocean adventure"
  GOOD: "Aria and Bubbles the seahorse float in an underwater cave surrounded by a treasure chest, three starfish, a coral arch, and a school of tiny blue fish"
</coloring_page_rules>

<output_schema>
{
  "packet_title": "[Name]'s [Theme] Adventure Day — plain text, no emoji",
  "greeting": "2-3 sentences. Warm and direct to the child. Plain text. No emoji.",
  "mascot_name": "Fun character name — no emoji",
  "mascot_description": "A cute cartoon [character] [action], [accessories], bright colors, simple clean lines, white background, kid-friendly illustration",
  "mascot_emoji_cluster": "5-6 emoji representing the theme — ONLY field that may contain emoji",
  "activities": [
    {
      "subject": "Math",
      "content_type": "worksheet",
      "title": "Activity title — no emoji",
      "description": "One sentence summary. Plain text. No emoji.",
      "encouragement": "Personalized hype line using the child's name. References this specific activity. No emoji. Never a generic phrase like 'You've got this!'",
      "passage": null,
      "instructions": ["step or question 1", "step or question 2"],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper"],
      "answer_key": "Parent answers or null"
    }
  ],
  "coloring_page": {
    "title": "[Name] and [Mascot] [Action] — no emoji",
    "coloring_scene": "Concrete visual description: who is in the scene, the setting, and exactly 3-5 specific objects present. Example: 'Lily and Spark the dragon stand on a pirate ship deck surrounded by a treasure chest, a ship's wheel, three cannons, and a jolly roger flag.' This text is passed verbatim to the image generator — it must be specific, visual, and match the title exactly.",
    "instructions": "Encouraging instructions for the child referencing ONLY characters and objects named in coloring_scene. Plain text. No emoji."
  },
  "daily_reflection": "Thoughtful age-appropriate question. Plain text. No emoji.",
  "parent_notes": "Context for the parent. Plain text. No emoji."
}

Valid content_type values: "reading_passage" | "worksheet" | "writing_prompt" | "movement_activity" | "coloring"
- reading_passage: put full passage in "passage" field, questions only in "instructions"
- all others: "passage" must be null
</output_schema>`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCase {
  gradeBand: string;
  gradeLevel: string;
  gradeDisplay: string;
  childName: string;
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

function validatePacket(parsed: Record<string, unknown>, gradeBand: string): ValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  // ── Top-level text fields must be emoji-free ────────────────────────────────
  const topFields = ["packet_title", "greeting", "daily_reflection", "parent_notes"] as const;
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

async function generateTestPacket(tc: TestCase, theme: string): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const readingWordCount =
    tc.gradeBand === "K-2" ? "80-150 words" :
    tc.gradeBand === "3-5" ? "200-350 words" : "400-600 words";

  const userPrompt = `<child_profile>
Name: ${tc.childName}
Grade: ${tc.gradeDisplay}
Learning style: visual
Favorite subjects: varied
</child_profile>

<packet_request>
Type: Full-day — exactly 5 activities
Theme: "${theme}"
Subjects to cover: math, reading, writing, science or history, one creative or PE activity
</packet_request>

<grade_reminders>
Grade: ${tc.gradeDisplay}
Reading passage for this grade: ${readingWordCount}
All math must stay within the ${tc.gradeDisplay} difficulty band — do not go easier or harder.
Zero emoji outside mascot_emoji_cluster. Plain text everywhere else.
</grade_reminders>

Create the packet now. Return only the JSON object.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 7000,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Non-text response from Claude");

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

  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY not set in environment");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const themeIdx = args.indexOf("--theme");
  const theme = themeIdx !== -1 && args[themeIdx + 1] ? args[themeIdx + 1] : "Space Exploration";

  const gradeIdx = args.indexOf("--grade");
  const singleGrade = gradeIdx !== -1 ? args[gradeIdx + 1] : null;

  const allCases: TestCase[] = [
    { gradeBand: "K-2", gradeLevel: "K", gradeDisplay: "Kindergarten", childName: "Lily" },
    { gradeBand: "3-5", gradeLevel: "4", gradeDisplay: "Grade 4",       childName: "Marcus" },
    { gradeBand: "6-8", gradeLevel: "7", gradeDisplay: "Grade 7",       childName: "Jordan" },
  ];

  const cases = singleGrade
    ? allCases.filter(c => c.gradeLevel === singleGrade || c.gradeBand === singleGrade)
    : allCases;

  console.log(`\nPacket Day — Generation Quality Test`);
  console.log(`Theme: "${theme}"  |  Model: ${MODEL}`);
  console.log("=".repeat(60));

  let totalPass = 0;
  let totalFail = 0;

  for (const tc of cases) {
    console.log(`\nGenerating ${tc.gradeBand} packet for ${tc.childName} (${tc.gradeDisplay})...`);
    const start = Date.now();

    try {
      const parsed = await generateTestPacket(tc, theme);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const result = validatePacket(parsed, tc.gradeBand);

      const activities = Array.isArray(parsed.activities) ? parsed.activities as Record<string, unknown>[] : [];
      const readingAct = activities.find(a => a.content_type === "reading_passage");
      const mathAct = activities.find(a => (a.subject as string)?.toLowerCase().includes("math"));

      console.log(`\n  [${result.pass ? "PASS" : "FAIL"}] ${tc.gradeBand} — ${tc.childName} (${elapsed}s)`);
      console.log(`  Title: ${String(parsed.packet_title ?? "").slice(0, 70)}`);
      console.log(`  Activities: ${activities.length} | Content types: ${activities.map(a => a.content_type ?? "?").join(", ")}`);

      if (readingAct) {
        const passageWords = typeof readingAct.passage === "string"
          ? readingAct.passage.trim().split(/\s+/).length : 0;
        console.log(`  Reading passage: ${passageWords} words (target ${tc.gradeBand === "K-2" ? "80-150" : tc.gradeBand === "3-5" ? "200-350" : "400-600"})`);
        console.log(`  Passage in own field: ${!!readingAct.passage ? "YES" : "NO"}`);
      } else {
        console.log(`  Reading passage: NO reading_passage activity found`);
      }

      if (mathAct && Array.isArray(mathAct.instructions)) {
        const quickCalc = (mathAct.instructions as string[])[0] ?? "";
        const usesPipe = quickCalc.includes("||");
        const usesSlash = quickCalc.includes(" / ") && !quickCalc.includes("||");
        const usesSymbols = quickCalc.includes("÷") || quickCalc.includes("×");
        console.log(`  Math: || separator=${usesPipe ? "YES" : "NO"} | / separator=${usesSlash ? "YES (BAD)" : "no"} | ÷× symbols=${usesSymbols ? "YES (BAD)" : "no"}`);
        console.log(`  Math sample: ${quickCalc.slice(0, 100)}`);
      }

      // Coloring page coherence check
      const cp = parsed.coloring_page as Record<string, unknown> | undefined;
      if (cp) {
        console.log(`\n  Coloring page:`);
        console.log(`    title        : ${String(cp.title ?? "").slice(0, 80)}`);
        console.log(`    coloring_scene: ${String(cp.coloring_scene ?? "MISSING").slice(0, 120)}`);
        console.log(`    instructions : ${String(cp.instructions ?? "").slice(0, 100)}`);
      }

      if (result.failures.length > 0) {
        console.log(`\n  FAILURES:`);
        result.failures.forEach(f => console.log(`    - ${f}`));
        totalFail++;
      } else {
        totalPass++;
      }

      if (result.warnings.length > 0) {
        console.log(`\n  WARNINGS:`);
        result.warnings.forEach(w => console.log(`    ~ ${w}`));
      }

    } catch (err) {
      console.log(`\n  [ERROR] ${tc.gradeBand}: ${err instanceof Error ? err.message : String(err)}`);
      totalFail++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Result: ${totalPass} passed, ${totalFail} failed out of ${cases.length} packets`);
  process.exit(totalFail > 0 ? 1 : 0);
}

main();

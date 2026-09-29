/**
 * Image model bakeoff: runs the packet's images through Replicate under
 * blind letters and builds contact sheets (HTML and PDF) plus, for some
 * rounds, a printable coloring-page PDF.
 *
 *   npm run image-bakeoff -- --round 3      (default: the latest round)
 *   npm run image-bakeoff -- --round 3 --dry-run
 *   npm run image-bakeoff -- --round 3 --rebuild-sheets   (sheets only, no API calls)
 *
 * Standalone on purpose: calls Replicate directly with REPLICATE_API_TOKEN.
 * No dev server, no login, no Supabase, no admin key, no production code
 * touched.
 *
 * Every contestant ("entry") is one model plus its own prompt builder, so a
 * round can compare models, prompt variants, or both. Entries are blinded
 * by group: letters are shuffled within each group, and an entry with a
 * fixed label (a reference) is shown under that label instead of a letter.
 *
 * Rounds 1 and 2 used the prompt wording copied on 2026-09-28
 * (legacyColoringPrompt). Round 3 onward uses buildColoringPrompt, copied
 * byte for byte from lib/generateMascotImage.ts on main; a round with
 * `assertK2` checks that copy against main's real source before spending
 * anything and refuses to run if they differ.
 *
 * Each round writes to its own model-bakeoff-* folder (gitignored) and
 * refuses to run if it already exists. The letter key, the prompts, and the
 * named results CSV live in KEY_do_not_open/.
 *
 * Spend is tracked per attempt (every attempt counted as billed, even a
 * failed one) and the run stops before any attempt that would push the
 * total past the round's budget.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
import Replicate, { type Prediction } from "replicate";
import sharp from "sharp";
import React from "react";
import ts from "typescript";
import { Document, Page, Text, View, Image, renderToFile } from "@react-pdf/renderer";

const CONCURRENCY = 4;
const ATTEMPT_TIMEOUT_MS = 180_000;
const RETRY_DELAY_MS = 3_000;
const POLL_INTERVAL_MS = 1_500;
// Gray pixel = neither near black nor near white, on the 0-255 grayscale.
const NEAR_BLACK = 50;
const NEAR_WHITE = 205;
const PRINT_SCENE = 1; // the "scene1" print test uses this scene for every letter

// ─── Copied from lib/generateMascotImage.ts on main (2026-09-29) ─────────────
// PRODUCTION COPY START. Must match main byte for byte; rounds with assertK2
// compare it against `git show main:lib/generateMascotImage.ts` before running.

const NO_TEXT_LINE =
  "no letters, numbers, words, or signs anywhere in the image, including on vehicles, clothing, banners, and objects, ";

function buildColoringPrompt(scene: string, includeNoTextLine: boolean): string {
  return (
    `black and white coloring book page for children featuring ${scene}, ` +
    `clean black outlines only, no color, no shading, no fill, ` +
    `pure white background, thick clean outlines with large open white regions for coloring, ` +
    `no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, ` +
    `simple shapes, kid-friendly line art ready to color, ` +
    (includeNoTextLine ? NO_TEXT_LINE : "") +
    `an original, generic child character; do not depict any copyrighted, trademarked, ` +
    `or real-world-recognizable character, celebrity, or franchise mascot; invented, ` +
    `non-specific features only`
  );
}
// PRODUCTION COPY END

// ─── Rounds 1 and 2 wording (copied 2026-09-28, kept so they rerun as they ran) ─

const CHILD_PLACEHOLDER = "the child";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Copied as-is, plus an optional placeholder so a round can test a gendered
// replacement ("a girl") without changing what the default does.
function scrubChildName(text: string, childName: string, placeholder = CHILD_PLACEHOLDER): string {
  const trimmedName = childName.trim();
  if (!trimmedName) return text;

  const pattern = new RegExp(`\\b${escapeRegExp(trimmedName)}\\b`, "gi");
  return text.replace(pattern, placeholder);
}

function mascotPrompt(mascotDescription: string, childName: string): string {
  const description = scrubChildName(mascotDescription.trim(), childName);
  return (
    `${description}, whimsical cartoon style, bright vibrant colors, ` +
    `simple clean lines, perfect for children's worksheet, white background, no text, ` +
    `do not depict any copyrighted, trademarked, or real-world-recognizable character, ` +
    `celebrity, or franchise mascot; invented, non-specific features only`
  );
}

interface ColoringVariant {
  placeholder?: string; // replaces the child's name; production uses "the child"
  noText?: boolean; // round 2 test line against stray letters and numbers
}

function legacyColoringPrompt(coloringScene: string, childName: string, variant: ColoringVariant = {}): string {
  const scene = scrubChildName(coloringScene.trim(), childName, variant.placeholder);
  return (
    `black and white coloring book page for children featuring ${scene}, ` +
    `clean black outlines only, no color, no shading, no fill, ` +
    `pure white background, thick clean outlines with large open white regions for coloring, ` +
    `no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, ` +
    `simple shapes, kid-friendly line art ready to color, ` +
    (variant.noText ? NO_TEXT_LINE : "") +
    `an original, generic child character; do not depict any copyrighted, trademarked, ` +
    `or real-world-recognizable character, celebrity, or franchise mascot; invented, ` +
    `non-specific features only`
  );
}

// ─── Grade band variants (round 3) ───────────────────────────────────────────

// Production's prompt with its three simplicity lines ("for children",
// "thick clean outlines with large open white regions for coloring", and
// "simple shapes, kid-friendly line art ready to color") swapped for
// `detail`. Every other production line is kept, in production's order.
function bandedColoringPrompt(scene: string, detail: string): string {
  return (
    `black and white coloring book page featuring ${scene}, ` +
    `clean black outlines only, no color, no shading, no fill, ` +
    `pure white background, ` +
    `no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, ` +
    `${detail}, ` +
    NO_TEXT_LINE +
    `an original, generic child character; do not depict any copyrighted, trademarked, ` +
    `or real-world-recognizable character, celebrity, or franchise mascot; invented, ` +
    `non-specific features only`
  );
}

const DETAIL_35A =
  "medium weight outlines with a mix of large and medium regions to color, a fuller scene with background details, " +
  "textures drawn as line patterns such as leaves, bark, fur, and fabric, natural proportions, " +
  "line art ready for colored pencils or markers";
const DETAIL_35B = `${DETAIL_35A}, simple decorative patterns inside some of the larger shapes`;
const DETAIL_68A =
  "intricate illustrated line art for older kids and teens, fine but clearly printable black outlines, " +
  "many small and medium regions to color, detailed background, realistic proportions, not cartoonish, " +
  "textures rendered with line work only";
const DETAIL_68B =
  "detailed line art for older kids and teens where the characters and background shapes are filled with " +
  "decorative zentangle style patterns, fine but clearly printable black outlines";

// ─── Scenes ──────────────────────────────────────────────────────────────────

const CHILD_NAME = "Maya"; // fake name, rounds 1 and 2 only

interface Scene {
  id: number;
  label: string;
  mascot?: string; // only rounds that make mascot images need it
  coloring: string;
}

// Rounds 1 and 2. Written the way the packet generator's Claude prompt
// wrote them then: mascot_description follows "A cute cartoon [character]
// [action], [accessories], bright colors, simple clean lines, white
// background, kid-friendly illustration"; coloring_scene names the child
// and mascot, the setting, and 3-5 specific objects.
const MODEL_ROUND_SCENES: Scene[] = [
  {
    id: 1,
    label: "Pony ballet",
    mascot:
      "A cute cartoon pony standing on its back hooves in a graceful ballet pose, wearing a flower crown and a tiny pink tutu, bright colors, simple clean lines, white background, kid-friendly illustration",
    coloring:
      "Maya and Twirl the pony stand in a sunny meadow, with Twirl in a ballet pose, surrounded by a red barn, a wooden fence, a bucket of apples, and a ring of daisies.",
  },
  {
    id: 2,
    label: "Motorcycle race",
    mascot:
      "A cute cartoon friendly red motorcycle with big smiling headlight eyes zooming forward, with racing stripes and a shiny chrome exhaust pipe, bright colors, simple clean lines, white background, kid-friendly illustration",
    coloring:
      "Maya and Revvy the motorcycle race around a curvy race track toward a checkered finish line banner, surrounded by a traffic cone, a trophy cup, a waving checkered flag, and a stack of tires.",
  },
  {
    id: 3,
    label: "Rocket in space",
    mascot:
      "A cute cartoon rocket ship with a smiling face and round window eyes blasting off with a puff of orange flame, with a tiny antenna and fins, bright colors, simple clean lines, white background, kid-friendly illustration",
    coloring:
      "Maya and Zoom the rocket float in outer space with planet Earth in the background, surrounded by a crescent moon, three stars, a ringed planet, and a small satellite.",
  },
  {
    id: 4,
    label: "Martial arts dojo",
    mascot:
      "A cute cartoon panda wearing a white martial arts gi and a black belt doing a high front kick, with a headband, bright colors, simple clean lines, white background, kid-friendly illustration",
    coloring:
      "Maya in a martial arts gi practices a high kick in a wooden dojo next to Kiko the panda, surrounded by a punching bag, a stack of practice boards, a rolled floor mat, and a belt rack.",
  },
  {
    id: 5,
    label: "Pirate ship",
    mascot:
      "A cute cartoon green parrot wearing a tiny pirate hat and an eye patch, perched on a treasure chest, with one wing raised in a wave, bright colors, simple clean lines, white background, kid-friendly illustration",
    coloring:
      "Maya and Captain Pip the parrot stand on the deck of a pirate ship sailing on the ocean, surrounded by a ship's wheel, a treasure chest, a spyglass, and a pirate flag.",
  },
];

// Round 3. Already in the shape production hands the image model: no child
// or mascot names (so production's name scrubbers change nothing), no signs.
const BAND_SCENES: Scene[] = [
  {
    id: 1,
    label: "Pepper garden",
    coloring:
      "a boy and the mascot, a smiling green pepper wearing a straw sun hat, stand together in a sunny vegetable garden with a woven basket full of peppers, a tall pepper plant with flowers, a red watering can, and a wooden wheelbarrow",
  },
  {
    id: 2,
    label: "Space station",
    coloring:
      "a girl and the mascot, a friendly round robot with antenna ears, float on the deck of a space station next to a large telescope, a round window showing a ringed planet, an open toolbox, and a drifting wrench",
  },
];

// ─── Models ──────────────────────────────────────────────────────────────────

type ListName = "mascot" | "coloring";
const LISTS: ListName[] = ["mascot", "coloring"];

interface ModelSpec {
  key: string; // human name, only ever written to KEY_do_not_open/
  ref: string; // owner/name:version (pinned)
  price: number; // USD per image at 1024x1024, from replicate.com (2026-09-28)
  input: (prompt: string) => Record<string, unknown>;
  svg?: boolean;
}

const QWEN_NEGATIVE = "gray shading, gray fill, color, text, letters, words, pencils, crayons";

const FLUX_SCHNELL_REF = "black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e";
const FLUX_2_KLEIN_4B_REF = "black-forest-labs/flux-2-klein-4b:8e9c42d77b10a2a41af823ac4500f7545be6ebc4e745830fc3f3de10de200542";
const FLUX_2_PRO_REF = "black-forest-labs/flux-2-pro:ccb5e33141097816e6fab8c895e702fe4c619e4e07500885b71214e9f6382a5c";
const FLUX_2_DEV_REF = "black-forest-labs/flux-2-dev:7bba46bdde863cfd7aaee87649a5aa49f39f368495dbea500998d1fcbb262050";
const IDEOGRAM_V3_TURBO_REF = "ideogram-ai/ideogram-v3-turbo:d9b3748f95c0fe3e71f010f8cc5d80e8f5252acd0e74b1c294ee889eea52a47b";
const GPT_IMAGE_2_REF = "openai/gpt-image-2:225c978a7f938acc350564c4548ddc2476bfb33364bec6b5422227f55ce56bd3";
const NANO_BANANA_2_REF = "google/nano-banana-2:d1be8b5fc0931a253d417e12a484ac01ee9ccbc6daffd4792151377d5e5ff55f";
const RECRAFT_V3_REF = "recraft-ai/recraft-v3:9507e61ddace8b3a238371b17a61be203747c5081ea6070fecd3c40d27318922";
const RECRAFT_V4_REF = "recraft-ai/recraft-v4:a8bc7377c37baeea1e01568f88b6abfb38939135071a38ca4267c8f82c3cbbf0";
const RECRAFT_V4_SVG_REF = "recraft-ai/recraft-v4-svg:93cbef8f201b974654d36b1247314072205583f6ff489a1582126f34f2f93635";
const QWEN_IMAGE_REF = "qwen/qwen-image:0bba9e70f78437359725e0989ead45ca8b09e6c12a070dfe9a09e6856b43a44d";

const flux2Pro: ModelSpec = {
  key: "flux-2-pro",
  ref: FLUX_2_PRO_REF,
  price: 0.031, // $0.015 per run + $0.015 per output megapixel
  input: (prompt) => ({ prompt, aspect_ratio: "1:1", resolution: "1 MP", output_format: "png" }),
};

const flux2Klein4b: ModelSpec = {
  key: "flux-2-klein-4b",
  ref: FLUX_2_KLEIN_4B_REF,
  price: 0.0011, // $1 per thousand output megapixels, ~1.05 MP
  input: (prompt) => ({ prompt, aspect_ratio: "1:1", output_megapixels: "1", output_format: "png" }),
};

// Same input production sends (lib/generateMascotImage.ts), quality aside.
const gptImage2 = (quality: "low" | "medium", price: number): ModelSpec => ({
  key: `gpt-image-2 (quality ${quality})`,
  ref: GPT_IMAGE_2_REF,
  price,
  input: (prompt) => ({
    prompt, quality, aspect_ratio: "1024x1024", background: "opaque", output_format: "png", number_of_images: 1,
  }),
});

const ideogramColoringBook: ModelSpec = {
  key: "ideogram-v3-turbo (Coloring Book I preset, magic prompt off)",
  ref: IDEOGRAM_V3_TURBO_REF,
  price: 0.03,
  input: (prompt) => ({ prompt, aspect_ratio: "1:1", style_preset: "Coloring Book I", magic_prompt_option: "Off" }),
};

// ─── Entries and rounds ──────────────────────────────────────────────────────

interface Entry {
  key: string; // human name, only ever written to KEY_do_not_open/
  model: ModelSpec;
  prompt: (scene: Scene) => string;
  group?: string; // letters are shuffled within a group; default "all"
  label?: string; // a fixed, unblinded name (a reference) instead of a letter
}

interface Group {
  id: string;
  title: string;
}

interface RoundConfig {
  name: string;
  out: string;
  runs: number;
  budgetUsd: number;
  scenes: Scene[];
  keyNotes: string[];
  // "scene1": one page per letter, scene 1 only (round 1's layout).
  // "everyScene": one full page per letter per scene, letter in a corner.
  printTest: false | "scene1" | "everyScene";
  // When set, coloring contact sheets are one per group per scene, in this
  // order, with reference columns on every sheet. Otherwise one sheet per list.
  groups?: Group[];
  assertK2?: { entryLabel: string };
  entries: Record<ListName, Entry[]>;
}

function modelEntries(list: ListName, models: ModelSpec[], variant: ColoringVariant = {}): Entry[] {
  return models.map((model) => ({
    key: model.key,
    model,
    prompt:
      list === "mascot"
        ? (s: Scene) => mascotPrompt(s.mascot ?? "", CHILD_NAME)
        : (s: Scene) => legacyColoringPrompt(s.coloring, CHILD_NAME, variant),
  }));
}

const GPT_LOW = gptImage2("low", 0.012);
const GPT_MEDIUM = gptImage2("medium", 0.047);

const ROUNDS: Record<number, RoundConfig> = {
  // Round 1 (2026-09-28): the wide field. Kept exactly as it ran.
  1: {
    name: "round 1",
    out: "model-bakeoff-images-round1",
    runs: 3,
    budgetUsd: 12,
    scenes: MODEL_ROUND_SCENES,
    keyNotes: [
      `Test child name: ${CHILD_NAME} (fake). Mascot prompt scrubs it to "${CHILD_PLACEHOLDER}"; coloring prompt scrubs it to "${CHILD_PLACEHOLDER}".`,
      "Coloring no-text line: off",
    ],
    printTest: "scene1",
    entries: {
      mascot: modelEntries("mascot", [
        {
          key: "flux-schnell (baseline)",
          ref: FLUX_SCHNELL_REF,
          price: 0.003,
          input: (prompt) => ({ prompt, num_outputs: 1, aspect_ratio: "1:1", output_format: "png" }),
        },
        flux2Klein4b,
        flux2Pro,
        {
          key: "ideogram-v3-turbo (Children's Book preset, magic prompt off)",
          ref: IDEOGRAM_V3_TURBO_REF,
          price: 0.03,
          input: (prompt) => ({ prompt, aspect_ratio: "1:1", style_preset: "Children's Book", magic_prompt_option: "Off" }),
        },
        gptImage2("medium", 0.047),
        {
          key: "nano-banana-2 (1K)",
          ref: NANO_BANANA_2_REF,
          price: 0.067,
          input: (prompt) => ({ prompt, aspect_ratio: "1:1", resolution: "1K", output_format: "png" }),
        },
      ]),
      coloring: modelEntries("coloring", [
        {
          key: "recraft-v3 digital_illustration (baseline)",
          ref: RECRAFT_V3_REF,
          price: 0.04,
          input: (prompt) => ({ prompt, style: "digital_illustration", size: "1024x1024" }),
        },
        {
          key: "recraft-v3 hand_drawn_outline",
          ref: RECRAFT_V3_REF,
          price: 0.04,
          input: (prompt) => ({ prompt, style: "digital_illustration/hand_drawn_outline", size: "1024x1024" }),
        },
        {
          key: "recraft-v4",
          ref: RECRAFT_V4_REF,
          price: 0.04,
          input: (prompt) => ({ prompt, size: "1024x1024" }),
        },
        {
          key: "recraft-v4-svg (converted to PNG)",
          ref: RECRAFT_V4_SVG_REF,
          price: 0.08,
          input: (prompt) => ({ prompt, size: "1024x1024" }),
          svg: true,
        },
        ideogramColoringBook,
        gptImage2("medium", 0.047),
        {
          key: "qwen-image (negative prompt)",
          ref: QWEN_IMAGE_REF,
          price: 0.025,
          input: (prompt) => ({ prompt, negative_prompt: QWEN_NEGATIVE, aspect_ratio: "1:1", output_format: "png" }),
        },
      ]),
    },
  },
  // Round 2 (2026-09-28): cheaper and faster options around the round 1
  // picks, with a no-text line and "a girl" for the child on coloring pages.
  2: {
    name: "round 2",
    out: "model-bakeoff-images-round2",
    runs: 2,
    budgetUsd: 5,
    scenes: MODEL_ROUND_SCENES,
    keyNotes: [
      `Test child name: ${CHILD_NAME} (fake). Mascot prompt scrubs it to "${CHILD_PLACEHOLDER}"; coloring prompt scrubs it to "a girl".`,
      "Coloring no-text line: on",
    ],
    printTest: false,
    entries: {
      mascot: modelEntries("mascot", [
        flux2Pro,
        flux2Klein4b,
        {
          key: "flux-2-dev (go_fast)",
          ref: FLUX_2_DEV_REF,
          price: 0.013, // $0.012 per output megapixel in go_fast mode, ~1.05 MP
          input: (prompt) => ({ prompt, aspect_ratio: "1:1", go_fast: true, output_format: "png" }),
        },
      ]),
      coloring: modelEntries("coloring", [gptImage2("low", 0.012), gptImage2("medium", 0.047), ideogramColoringBook], {
        placeholder: "a girl",
        noText: true,
      }),
    },
  },
  // Round 3 (2026-09-29): coloring page grade bands, round 1. Coloring only,
  // production's model (GPT Image 2), prompt variants per band. K2_REF is
  // production's prompt exactly and is shown labeled; 3-5 and 6-8 are blind
  // within their band. Budget approved by Andy: $1.50.
  3: {
    name: "coloring grade bands, round 1",
    out: "model-bakeoff-images-coloring-bands-round1",
    runs: 3,
    budgetUsd: 1.5,
    scenes: BAND_SCENES,
    keyNotes: [
      "Coloring only. GPT Image 2 (production input), production grayscale pass.",
      "Scenes have no names, so production's name scrubbers would change nothing.",
    ],
    printTest: "everyScene",
    groups: [
      { id: "K-2", title: "Grades K-2 (reference)" },
      { id: "3-5", title: "Grades 3-5" },
      { id: "6-8", title: "Grades 6-8" },
    ],
    assertK2: { entryLabel: "K2_REF" },
    entries: {
      mascot: [],
      coloring: [
        { key: "K2_REF (production prompt, quality low)", label: "K2_REF", group: "K-2", model: GPT_LOW, prompt: (s) => buildColoringPrompt(s.coloring, true) },
        { key: "35A (quality low)", group: "3-5", model: GPT_LOW, prompt: (s) => bandedColoringPrompt(s.coloring, DETAIL_35A) },
        { key: "35B (quality low)", group: "3-5", model: GPT_LOW, prompt: (s) => bandedColoringPrompt(s.coloring, DETAIL_35B) },
        { key: "68A (quality low)", group: "6-8", model: GPT_LOW, prompt: (s) => bandedColoringPrompt(s.coloring, DETAIL_68A) },
        { key: "68B (quality low)", group: "6-8", model: GPT_LOW, prompt: (s) => bandedColoringPrompt(s.coloring, DETAIL_68B) },
        { key: "68A_MED (68A prompt, quality medium)", group: "6-8", model: GPT_MEDIUM, prompt: (s) => bandedColoringPrompt(s.coloring, DETAIL_68A) },
      ],
    },
  },
};

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const ROUND_NUMBER = Number(argValue("round") ?? Math.max(...Object.keys(ROUNDS).map(Number)));
const ROUND = ROUNDS[ROUND_NUMBER];
if (!ROUND) throw new Error(`Unknown round ${ROUND_NUMBER}. Known rounds: ${Object.keys(ROUNDS).join(", ")}`);
const OUT = path.resolve(ROUND.out);
const KEY_DIR = path.join(OUT, "KEY_do_not_open");

// ─── K-2 production check ────────────────────────────────────────────────────

/**
 * Builds the reference entry's prompt for every scene and compares it with
 * what main's real buildColoringPrompt builds (with the no-text line, as the
 * GPT Image 2 call does). main's source is read with git, its
 * NO_TEXT_LINE and buildColoringPrompt are transpiled and run as they are, so
 * a wording change on main makes this fail instead of passing silently.
 * Throws on any difference.
 */
function assertK2MatchesProduction(entry: Entry, scenes: Scene[]): string {
  const source = execFileSync("git", ["show", "main:lib/generateMascotImage.ts"], { encoding: "utf8" });
  const match = source.match(/const NO_TEXT_LINE =[\s\S]*?\nfunction buildColoringPrompt\([\s\S]*?\n\}\n/);
  if (!match) throw new Error("K-2 check: could not find NO_TEXT_LINE and buildColoringPrompt in main's lib/generateMascotImage.ts");
  const js = ts.transpileModule(match[0], { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const productionBuild = new Function(`${js}\nreturn buildColoringPrompt;`)() as (scene: string, noText: boolean) => string;

  for (const scene of scenes) {
    const production = productionBuild(scene.coloring, true);
    const ours = entry.prompt(scene);
    if (ours !== production) {
      let at = 0;
      while (at < ours.length && ours[at] === production[at]) at++;
      throw new Error(
        `K-2 check FAILED on scene ${scene.id}: ${entry.label} differs from main's production prompt at character ${at}.\n` +
          `  ours:       ...${ours.slice(Math.max(0, at - 40), at + 60)}\n` +
          `  production: ...${production.slice(Math.max(0, at - 40), at + 60)}`
      );
    }
  }
  return `K-2 check passed: ${entry.label} is identical to main's production prompt for all ${scenes.length} scenes.`;
}

function runK2Check(): string | null {
  if (!ROUND.assertK2) return null;
  const entry = ROUND.entries.coloring.find((e) => e.label === ROUND.assertK2?.entryLabel);
  if (!entry) throw new Error(`K-2 check: no coloring entry labeled ${ROUND.assertK2.entryLabel}`);
  return assertK2MatchesProduction(entry, ROUND.scenes);
}

// ─── Replicate ───────────────────────────────────────────────────────────────

let replicate: Replicate | null = null;

function getReplicate(): Replicate {
  if (!replicate) {
    const token = (process.env.REPLICATE_API_TOKEN ?? "").replace(/\s+#.*$/, "").trim();
    if (!token) throw new Error("Set REPLICATE_API_TOKEN (in .env.local) before running the bakeoff.");
    replicate = new Replicate({ auth: token });
  }
  return replicate;
}

const TERMINAL: ReadonlySet<Prediction["status"]> = new Set(["succeeded", "failed", "canceled", "aborted"]);

async function runPrediction(ref: string, input: Record<string, unknown>): Promise<string> {
  const client = getReplicate();
  const version = ref.split(":")[1];
  const deadline = Date.now() + ATTEMPT_TIMEOUT_MS;
  let prediction = await client.predictions.create({ version, input });
  while (!TERMINAL.has(prediction.status)) {
    if (Date.now() >= deadline) {
      try {
        await client.predictions.cancel(prediction.id);
      } catch {
        // a failed cancel only means Replicate may finish it anyway; spend is already counted
      }
      throw new Error(`timed out after ${ATTEMPT_TIMEOUT_MS / 1000}s`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    prediction = await client.predictions.get(prediction.id);
  }
  if (prediction.status !== "succeeded") {
    throw new Error(`prediction ${prediction.status}${prediction.error ? `: ${String(prediction.error)}` : ""}`);
  }
  const out = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (typeof out !== "string" || !out.startsWith("http")) throw new Error("no image URL in output");
  return out;
}

async function download(url: string): Promise<{ buf: Buffer; isSvg: boolean }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const type = res.headers.get("content-type") ?? "";
      const isSvg = type.includes("svg") || url.toLowerCase().endsWith(".svg") || buf.subarray(0, 200).toString("utf8").includes("<svg");
      return { buf, isSvg };
    } catch (err) {
      if (attempt >= 2) throw err;
    }
  }
}

// ─── Image processing ────────────────────────────────────────────────────────

async function toPng(buf: Buffer, isSvg: boolean): Promise<Buffer> {
  if (isSvg) {
    return sharp(buf, { density: 144 })
      .resize(1024, 1024, { fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  }
  return sharp(buf).png().toBuffer();
}

// Production's pass is sharp().grayscale().png(). The white flatten first is
// a no-op for opaque images and keeps transparent ones (SVG) from reading as black.
async function productionGrayscale(png: Buffer): Promise<Buffer> {
  return sharp(png).flatten({ background: "#ffffff" }).grayscale().png().toBuffer();
}

async function hardThreshold(gray: Buffer): Promise<Buffer> {
  return sharp(gray).threshold(128).png().toBuffer();
}

async function grayPercent(gray: Buffer): Promise<number> {
  const { data, info } = await sharp(gray).greyscale().raw().toBuffer({ resolveWithObject: true });
  let grayCount = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const v = data[i];
    if (v > NEAR_BLACK && v < NEAR_WHITE) grayCount++;
  }
  return (grayCount / (data.length / info.channels)) * 100;
}

// ─── Jobs, budget, and blinding ──────────────────────────────────────────────

interface Result {
  list: ListName;
  letter: string; // a blind letter, or a reference's label
  group: string;
  entry: string;
  model: string;
  ref: string;
  scene: number;
  run: number;
  seconds: number | null;
  cost: number;
  attempts: number;
  failed: boolean;
  grayPct: number | null;
  error: string;
}

let spent = 0;
let budgetStopped = false;

function groupOf(entry: Entry): string {
  return entry.group ?? "all";
}

/**
 * Labels every entry in a list: references keep their label; the rest get
 * letters shuffled within their group. Letters run on across groups (in the
 * round's group order), so no letter means two things in one round.
 */
function assignLetters(list: ListName): Map<Entry, string> {
  const entries = ROUND.entries[list];
  const order = ROUND.groups?.map((g) => g.id) ?? [];
  const groups = [...new Set(entries.map(groupOf))].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });
  const ids = new Map<Entry, string>();
  let next = 0;
  for (const e of entries) if (e.label) ids.set(e, e.label);
  for (const group of groups) {
    const blind = entries.filter((e) => !e.label && groupOf(e) === group);
    for (let i = blind.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [blind[i], blind[j]] = [blind[j], blind[i]];
    }
    for (const e of blind) ids.set(e, String.fromCharCode(65 + next++));
  }
  return ids;
}

function rel(...parts: string[]): string {
  return path.join(...parts).split(path.sep).join("/");
}

function imageFile(list: ListName, letter: string, scene: number, run: number): string {
  return path.join(OUT, list, letter, `scene${scene}_run${run}.png`);
}

async function runJob(list: ListName, entry: Entry, letter: string, scene: Scene, run: number): Promise<Result> {
  const spec = entry.model;
  const prompt = entry.prompt(scene);
  const result: Result = {
    list, letter, group: groupOf(entry), entry: entry.key, model: spec.key, ref: spec.ref, scene: scene.id, run,
    seconds: null, cost: 0, attempts: 0, failed: true, grayPct: null, error: "",
  };
  const name = `scene${scene.id}_run${run}.png`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (budgetStopped || spent + spec.price > ROUND.budgetUsd) {
      budgetStopped = true;
      result.error = `skipped: would pass $${ROUND.budgetUsd} budget`;
      return result;
    }
    spent += spec.price;
    result.cost += spec.price;
    result.attempts = attempt;
    const start = Date.now();
    try {
      const url = await runPrediction(spec.ref, spec.input(prompt));
      result.seconds = (Date.now() - start) / 1000;
      const { buf, isSvg } = await download(url);
      const png = await toPng(buf, isSvg || !!spec.svg);
      if (list === "mascot") {
        fs.writeFileSync(path.join(OUT, "mascot", letter, name), png);
      } else {
        const gray = await productionGrayscale(png);
        fs.writeFileSync(path.join(OUT, "coloring", letter, name), gray);
        fs.writeFileSync(path.join(OUT, "coloring-threshold", letter, name), await hardThreshold(gray));
        result.grayPct = await grayPercent(gray);
      }
      result.failed = false;
      result.error = "";
      return result;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      result.seconds = null;
      if (attempt === 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  return result;
}

async function pool<T>(tasks: (() => Promise<T>)[], size: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]();
      }
    })
  );
  return results;
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

function csvRow(values: (string | number | null)[]): string {
  return values.map((v) => (v === null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",");
}

function writeCsvs(results: Result[]) {
  const full = [csvRow(["list", "letter", "group", "entry", "model", "version", "scene", "run", "seconds", "cost_usd", "attempts", "failed", "gray_pct", "error"])];
  const blind = [csvRow(["list", "group", "letter", "scene", "run", "seconds", "failed", "gray_pct"])];
  for (const r of results) {
    const secs = r.seconds === null ? null : r.seconds.toFixed(1);
    const gray = r.grayPct === null ? null : r.grayPct.toFixed(2);
    full.push(csvRow([r.list, r.letter, r.group, r.entry, r.model, r.ref.split(":")[1], r.scene, r.run, secs, r.cost.toFixed(4), r.attempts, r.failed ? "yes" : "no", gray, r.error]));
    blind.push(csvRow([r.list, r.group, r.letter, r.scene, r.run, secs, r.failed ? "yes" : "no", gray]));
  }
  fs.writeFileSync(path.join(KEY_DIR, "results.csv"), `${full.join("\n")}\n`);
  fs.writeFileSync(path.join(OUT, "results_blind.csv"), `${blind.join("\n")}\n`);
}

function findResult(results: Result[], list: ListName, letter: string, scene: number, run: number): Result | undefined {
  return results.find((x) => x.list === list && x.letter === letter && x.scene === scene && x.run === run);
}

const LIST_TITLE: Record<ListName, string> = { mascot: "Mascot", coloring: "Coloring page" };
const MODEL_INTRO =
  "Rows are scenes, columns are letters. Letters are assigned separately for this list, so a letter here is not the same model as that letter on the other sheet.";
const GRAY_NOTE = `Gray % counts pixels that are neither near black (<=${NEAR_BLACK}) nor near white (>=${NEAR_WHITE}) after the production grayscale pass; anti-aliased line edges count a little. Hard black and white copies are in coloring-threshold/.`;

/** One contact sheet: which list, which columns, which scene rows, and its words. */
interface Sheet {
  list: ListName;
  columns: string[];
  scenes: Scene[];
  title: string;
  intro: string;
  file: string; // base name, no extension
}

function contactSheetHtml(sheet: Sheet, results: Result[]): string {
  const { list, columns, scenes, title } = sheet;
  const cell = (letter: string, scene: number) =>
    Array.from({ length: ROUND.runs }, (_, k) => {
      const r = findResult(results, list, letter, scene, k + 1);
      const file = rel(list, letter, `scene${scene}_run${k + 1}.png`);
      if (!r || r.failed) return `<figure class="miss"><div>run ${k + 1}<br>no image</div></figure>`;
      const note = r.grayPct === null ? "" : ` · ${r.grayPct.toFixed(1)}% gray`;
      return `<figure><a href="${file}" target="_blank"><img src="${file}" alt="${LIST_TITLE[list]} ${letter}, scene ${scene}, run ${k + 1}" loading="lazy"></a><figcaption>run ${k + 1}${note}</figcaption></figure>`;
    }).join("");
  const rows = scenes.map(
    (s) => `<tr><th scope="row">${s.id}. ${s.label}</th>${columns.map((l) => `<td>${cell(l, s.id)}</td>`).join("")}</tr>`
  ).join("\n");
  const grayNote = list === "coloring" ? `<p>${GRAY_NOTE}</p>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #fdfbf7; color: #1a1a2e; margin: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p { font-size: 13px; max-width: 900px; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
  thead th { position: sticky; top: 0; background: #fdfbf7; font-size: 18px; }
  tbody th { text-align: left; font-size: 13px; width: 110px; }
  td { white-space: nowrap; }
  figure { display: inline-block; margin: 0 4px 0 0; text-align: center; }
  img { width: 150px; height: 150px; object-fit: contain; background: #fff; border: 1px solid #eee; display: block; }
  figcaption { font-size: 11px; color: #555; }
  .miss div { width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; background: #f3e1dc; font-size: 12px; }
</style></head><body>
<h1>${title}</h1>
<p>${sheet.intro} ${ROUND.runs} runs each. Click an image to open it full size.</p>
${grayNote}
<table><thead><tr><th></th>${columns.map((l) => `<th scope="col">${l}</th>`).join("")}</tr></thead>
<tbody>
${rows}
</tbody></table></body></html>
`;
}

// Same layout as the HTML sheet, one wide page, with small JPEG thumbnails
// embedded so the file stays well under 20 MB.
async function contactSheetPdf(sheet: Sheet, results: Result[]): Promise<string> {
  const { list, columns, scenes, title } = sheet;
  const TH = 78;
  const GAP = 6;
  const PAD = 8;
  const LABEL_W = 110;
  const CAPTION_H = 16;
  const cellW = ROUND.runs * TH + (ROUND.runs - 1) * GAP + 2 * PAD;
  const rowH = TH + CAPTION_H + 12;
  const headerH = list === "coloring" ? 96 : 76;
  // A floor so a one-column sheet still fits its heading on one line and one page.
  const width = Math.max(780, 36 + LABEL_W + columns.length * cellW);
  const height = headerH + 28 + scenes.length * rowH + 24;
  const border = { borderWidth: 0.5, borderColor: "#cccccc", borderStyle: "solid" as const };

  const thumbs = new Map<string, Buffer>();
  for (const r of results) {
    if (r.list !== list || r.failed || !columns.includes(r.letter)) continue;
    const file = imageFile(list, r.letter, r.scene, r.run);
    const jpg = await sharp(file)
      .flatten({ background: "#ffffff" })
      .resize(256, 256, { fit: "contain", background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    thumbs.set(`${r.letter}-${r.scene}-${r.run}`, jpg);
  }

  const h = React.createElement;
  const cell = (letter: string, scene: number) =>
    h(
      View,
      { key: letter, style: { ...border, width: cellW, height: rowH, flexDirection: "row", paddingHorizontal: PAD, paddingTop: 5 } },
      ...Array.from({ length: ROUND.runs }, (_, k) => {
        const r = findResult(results, list, letter, scene, k + 1);
        const thumb = thumbs.get(`${letter}-${scene}-${k + 1}`);
        const caption = !r || r.failed ? `run ${k + 1}: no image` : `run ${k + 1}${r.grayPct === null ? "" : ` · ${r.grayPct.toFixed(1)}% gray`}`;
        return h(
          View,
          { key: k, style: { width: TH, marginRight: k < ROUND.runs - 1 ? GAP : 0 } },
          thumb
            ? h(Image, { src: { data: thumb, format: "jpg" }, style: { width: TH, height: TH, backgroundColor: "#ffffff" } })
            : h(View, { style: { width: TH, height: TH, backgroundColor: "#f3e1dc" } }),
          h(Text, { style: { fontSize: 6, color: "#555555", textAlign: "center", marginTop: 3 } }, caption)
        );
      })
    );

  const doc = h(
    Document,
    { title },
    h(
      Page,
      { size: [width, height], style: { backgroundColor: "#fdfbf7", padding: 18, color: "#1a1a2e" } },
      h(Text, { style: { fontSize: 16, marginBottom: 6 } }, title),
      h(Text, { style: { fontSize: 8.5, color: "#444455", marginBottom: 4 } }, `${sheet.intro} ${ROUND.runs} runs each.`),
      list === "coloring" ? h(Text, { style: { fontSize: 8, color: "#444455", marginBottom: 4 } }, GRAY_NOTE) : null,
      h(
        View,
        { style: { flexDirection: "row", marginTop: 10 } },
        h(View, { style: { width: LABEL_W } }),
        ...columns.map((l) =>
          h(View, { key: l, style: { ...border, width: cellW, height: 28, justifyContent: "center" } },
            h(Text, { style: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center" } }, l))
        )
      ),
      ...scenes.map((s) =>
        h(
          View,
          { key: s.id, style: { flexDirection: "row" } },
          h(View, { style: { ...border, width: LABEL_W, height: rowH, padding: 5 } },
            h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold" } }, `${s.id}. ${s.label}`)),
          ...columns.map((l) => cell(l, s.id))
        )
      )
    )
  );
  const out = path.join(OUT, `${sheet.file}.pdf`);
  await renderToFile(doc, out);
  return out;
}

/** What the sheets need to know about one letter, and nothing that unblinds it. */
interface Column {
  list: ListName;
  id: string;
  group: string;
  reference: boolean;
}

function columnsFromIds(idsByList: Record<ListName, Map<Entry, string>>): Column[] {
  return LISTS.flatMap((list) =>
    [...idsByList[list]].map(([entry, id]) => ({ list, id, group: groupOf(entry), reference: !!entry.label }))
  );
}

/**
 * The sheets for this round. Lists with no entries get no sheet. Without
 * groups: one sheet per list, every scene, every letter (rounds 1 and 2).
 * With groups: one coloring sheet per group per scene; reference columns
 * lead every sheet so each band is judged next to the reference.
 */
function planSheets(allColumns: Column[]): Sheet[] {
  const sheets: Sheet[] = [];
  for (const list of LISTS) {
    const all = allColumns.filter((c) => c.list === list);
    if (all.length === 0) continue;
    const sorted = (cols: Column[]) => cols.map((c) => c.id).sort((a, b) => a.localeCompare(b));
    if (!ROUND.groups || list !== "coloring") {
      sheets.push({
        list,
        columns: sorted(all),
        scenes: ROUND.scenes,
        title: `${LIST_TITLE[list]} bakeoff, ${ROUND.name} (blind)`,
        intro: MODEL_INTRO,
        file: `contact-sheet-${list}`,
      });
      continue;
    }
    const refs = sorted(all.filter((c) => c.reference));
    for (const group of ROUND.groups) {
      const blind = sorted(all.filter((c) => !c.reference && c.group === group.id));
      const columns = [...refs, ...blind];
      if (blind.length === 0 && !all.some((c) => c.reference && c.group === group.id)) continue;
      for (const scene of ROUND.scenes) {
        sheets.push({
          list,
          columns,
          scenes: [scene],
          title: `${group.title}, scene ${scene.id} (${scene.label}): ${ROUND.name}`,
          intro:
            blind.length > 0
              ? `${refs.join(", ")} is today's production prompt, shown labeled for comparison. Letters ${blind.join(", ")} are blind and shuffled within this band; the key is sealed.`
              : `${refs.join(", ")} is today's production prompt, shown labeled as the reference.`,
          file: `contact-sheet-${group.id}-scene${scene.id}`,
        });
      }
    }
  }
  return sheets;
}

async function printTestScene1(letters: string[], results: Result[]): Promise<string[]> {
  const pages: React.ReactElement[] = [];
  const missing: string[] = [];
  for (const letter of letters) {
    const r = results.find((x) => x.list === "coloring" && x.letter === letter && x.scene === PRINT_SCENE && !x.failed);
    if (!r) {
      missing.push(letter);
      continue;
    }
    const data = fs.readFileSync(imageFile("coloring", letter, PRINT_SCENE, r.run));
    pages.push(
      React.createElement(
        Page,
        { key: letter, size: "LETTER", style: { padding: 36, alignItems: "center" } },
        React.createElement(Text, { style: { fontSize: 14, marginBottom: 4 } }, `Coloring page ${letter}`),
        React.createElement(Text, { style: { fontSize: 9, color: "#555", marginBottom: 16 } }, `Scene ${PRINT_SCENE}, run ${r.run}. Production grayscale version.`),
        React.createElement(Image, { src: { data, format: "png" }, style: { width: 520, height: 520 } })
      )
    );
  }
  if (pages.length) {
    await renderToFile(React.createElement(Document, { title: "Coloring page print test" }, ...pages), path.join(OUT, "print-test-coloring.pdf"));
  }
  return missing;
}

// One letter-size page per letter per scene: the image as large as the
// margins allow, and only the letter and scene in small type in the bottom
// right corner. Uses each letter's first successful run for that scene.
async function printTestEveryScene(letters: string[], results: Result[]): Promise<string[]> {
  const pages: React.ReactElement[] = [];
  const missing: string[] = [];
  for (const letter of letters) {
    for (const scene of ROUND.scenes) {
      const r = results
        .filter((x) => x.list === "coloring" && x.letter === letter && x.scene === scene.id && !x.failed)
        .sort((a, b) => a.run - b.run)[0];
      if (!r) {
        missing.push(`${letter} scene ${scene.id}`);
        continue;
      }
      const data = fs.readFileSync(imageFile("coloring", letter, scene.id, r.run));
      pages.push(
        React.createElement(
          Page,
          { key: `${letter}-${scene.id}`, size: "LETTER", style: { padding: 36, justifyContent: "center", alignItems: "center" } },
          React.createElement(Image, { src: { data, format: "png" }, style: { width: 540, height: 540 } }),
          React.createElement(
            Text,
            { style: { position: "absolute", right: 24, bottom: 18, fontSize: 7, color: "#777777" } },
            `${letter} · scene ${scene.id} · run ${r.run}`
          )
        )
      );
    }
  }
  if (pages.length) {
    await renderToFile(React.createElement(Document, { title: "Coloring page print test" }, ...pages), path.join(OUT, "print-test-coloring.pdf"));
  }
  return missing;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function plannedCost(): { count: number; usd: number } {
  const entries = LISTS.flatMap((l) => ROUND.entries[l]);
  const per = ROUND.scenes.length * ROUND.runs;
  return { count: entries.length * per, usd: entries.reduce((sum, e) => sum + e.model.price, 0) * per };
}

// --dry-run: print the plan, estimated cost, the K-2 check, and every
// prompt. No API calls, no files written, no letters assigned.
function dryRun(k2: string | null) {
  const { count, usd } = plannedCost();
  const lines = [
    `${ROUND.name} dry run: ${count} images, estimated $${usd.toFixed(3)} before retries (worst case with every image retried once: $${(usd * 2).toFixed(3)}), budget $${ROUND.budgetUsd}, output ${OUT}`,
    `Output folder exists already: ${fs.existsSync(OUT) ? "YES (the real run will refuse)" : "no"}`,
    ...LISTS.map((l) => `${LIST_TITLE[l]} entries: ${ROUND.entries[l].length}`),
    ...(k2 ? [k2] : []),
  ];
  for (const list of LISTS) {
    for (const entry of ROUND.entries[list]) {
      lines.push("", `${list} / ${entry.key} / $${entry.model.price} per image:`);
      for (const scene of ROUND.scenes.slice(0, ROUND.groups ? ROUND.scenes.length : 1)) {
        lines.push(`  scene ${scene.id}: ${entry.prompt(scene)}`);
      }
    }
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function main() {
  // Before anything is spent or written: a failed K-2 check stops the run.
  const k2 = runK2Check();
  if (process.argv.includes("--dry-run")) return dryRun(k2);
  if (process.argv.includes("--rebuild-sheets")) return rebuildSheets();
  if (k2) process.stdout.write(`${k2}\n`);
  if (fs.existsSync(OUT)) throw new Error(`${OUT} already exists. Move or delete it before a new run so rounds never mix.`);
  fs.mkdirSync(KEY_DIR, { recursive: true });

  const keyLines = [`Image bakeoff ${ROUND.name} key (${new Date().toISOString().slice(0, 10)})`, ...ROUND.keyNotes];
  if (k2) keyLines.push(k2);
  const promptLines: string[] = [];
  const tasks: (() => Promise<Result>)[] = [];
  const idsByList = {} as Record<ListName, Map<Entry, string>>;

  for (const list of LISTS) {
    const ids = assignLetters(list);
    idsByList[list] = ids;
    if (ids.size === 0) continue;
    keyLines.push("", `${list.toUpperCase()}`);
    for (const [entry, id] of [...ids].sort((a, b) => a[1].localeCompare(b[1]))) {
      keyLines.push(`${id} = ${entry.key}  [group ${groupOf(entry)}; ${entry.model.key}; ${entry.model.ref}]`);
      for (const scene of ROUND.scenes) promptLines.push(`${list} ${id} scene ${scene.id}:\n${entry.prompt(scene)}\n`);
      fs.mkdirSync(path.join(OUT, list, id), { recursive: true });
      if (list === "coloring") fs.mkdirSync(path.join(OUT, "coloring-threshold", id), { recursive: true });
    }
    // Interleave by scene and run so a slow entry doesn't bunch up at the end.
    for (const scene of ROUND.scenes) {
      for (let run = 1; run <= ROUND.runs; run++) {
        for (const [entry, id] of ids) tasks.push(() => runJob(list, entry, id, scene, run));
      }
    }
  }
  fs.writeFileSync(path.join(KEY_DIR, "KEY.txt"), `${keyLines.join("\n")}\n`);
  fs.writeFileSync(path.join(KEY_DIR, "prompts.txt"), promptLines.join("\n"));

  const { usd } = plannedCost();
  process.stdout.write(`${ROUND.name}: ${tasks.length} images planned, estimated $${usd.toFixed(3)} before retries, budget $${ROUND.budgetUsd}\n`);

  let done = 0;
  const results = await pool(
    tasks.map((t) => async () => {
      const r = await t();
      done++;
      const status = r.failed ? `FAILED (${r.error})` : `ok ${r.seconds?.toFixed(1)}s${r.attempts > 1 ? " (after retry)" : ""}`;
      process.stdout.write(`[${done}/${tasks.length}] ${r.list} ${r.letter} scene ${r.scene} run ${r.run}: ${status} | spent $${spent.toFixed(3)}\n`);
      return r;
    }),
    CONCURRENCY
  );

  writeCsvs(results);
  const { pdfs, missingPrint } = await buildOutputs(columnsFromIds(idsByList), results);

  const failed = results.filter((r) => r.failed).length;
  const retried = results.filter((r) => r.attempts > 1).length;
  process.stdout.write(
    `\nDone. ${results.length - failed} of ${results.length} images saved, ${failed} failed or skipped, ${retried} needed a retry.` +
      `\nSpend counted: $${spent.toFixed(3)} of $${ROUND.budgetUsd}${budgetStopped ? " (STOPPED at budget)" : ""}.` +
      `\nContact sheet PDFs:\n  ${pdfs.join("\n  ")}` +
      (missingPrint.length ? `\nPrint test is missing: ${missingPrint.join(", ")}` : "") +
      `\nOutput: ${OUT}\n`
  );
}

/** Contact sheets (HTML and PDF) and the print test, from saved images. */
async function buildOutputs(columns: Column[], results: Result[]): Promise<{ pdfs: string[]; missingPrint: string[] }> {
  const pdfs: string[] = [];
  for (const sheet of planSheets(columns)) {
    fs.writeFileSync(path.join(OUT, `${sheet.file}.html`), contactSheetHtml(sheet, results));
    const pdf = await contactSheetPdf(sheet, results);
    pdfs.push(`${pdf} (${(fs.statSync(pdf).size / 1e6).toFixed(2)} MB)`);
  }
  // References first, then letters.
  const coloringIds = columns
    .filter((c) => c.list === "coloring")
    .sort((a, b) => Number(a.reference ? 0 : 1) - Number(b.reference ? 0 : 1) || a.id.localeCompare(b.id))
    .map((c) => c.id);
  const missingPrint =
    ROUND.printTest === "scene1"
      ? await printTestScene1(coloringIds, results)
      : ROUND.printTest === "everyScene"
        ? await printTestEveryScene(coloringIds, results)
        : [];
  return { pdfs, missingPrint };
}

/**
 * --rebuild-sheets: remakes the contact sheets and print test for a round
 * that already ran, from its results_blind.csv and saved images. No API
 * calls, and it never reads KEY_do_not_open/, so it can't unblind anything.
 */
async function rebuildSheets() {
  const csv = path.join(OUT, "results_blind.csv");
  if (!fs.existsSync(csv)) throw new Error(`${csv} not found. Run the round first.`);
  const [header, ...rows] = fs.readFileSync(csv, "utf8").trim().split(/\r?\n/);
  if (header !== "list,group,letter,scene,run,seconds,failed,gray_pct") {
    throw new Error(`${csv} is in an older format; --rebuild-sheets only works on rounds run after the group column was added.`);
  }
  const results: Result[] = rows.map((row) => {
    const [list, group, letter, scene, run, seconds, failed, gray] = row.split(",");
    return {
      list: list as ListName, group, letter, entry: "", model: "", ref: "", scene: Number(scene), run: Number(run),
      seconds: seconds ? Number(seconds) : null, cost: 0, attempts: 0, failed: failed === "yes",
      grayPct: gray ? Number(gray) : null, error: "",
    };
  });
  const seen = new Set<string>();
  const columns: Column[] = [];
  for (const r of results) {
    const k = `${r.list}/${r.letter}`;
    if (seen.has(k)) continue;
    seen.add(k);
    columns.push({ list: r.list, id: r.letter, group: r.group, reference: ROUND.entries[r.list].some((e) => e.label === r.letter) });
  }
  const { pdfs, missingPrint } = await buildOutputs(columns, results);
  process.stdout.write(
    `Rebuilt from ${csv}.\nContact sheet PDFs:\n  ${pdfs.join("\n  ")}` +
      (missingPrint.length ? `\nPrint test is missing: ${missingPrint.join(", ")}` : "") +
      `\n`
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

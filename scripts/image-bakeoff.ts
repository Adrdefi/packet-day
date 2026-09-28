/**
 * Image model bakeoff: runs the packet's two images (mascot and coloring
 * page) through several Replicate models, blinds the results, and builds
 * contact sheets (HTML and PDF) plus, for some rounds, a printable
 * coloring-page PDF.
 *
 *   npm run image-bakeoff -- --round 2      (default: the latest round)
 *
 * Standalone on purpose: calls Replicate directly with REPLICATE_API_TOKEN.
 * No dev server, no login, no Supabase, no admin key, no production code
 * touched. The prompt wording and the name scrubber below are COPIED from
 * lib/generateMascotImage.ts (2026-09-28) so production stays untouched; if
 * production's prompts change, re-copy them here before the next round.
 * Round-specific prompt changes (round 2's no-text line and "a girl") are
 * test variants only; production still uses the copied wording as-is.
 *
 * Each round writes to its own model-bakeoff-images-round<N>/ folder
 * (gitignored: model-bakeoff-*) and refuses to run if it already exists.
 * Images are saved under blind letters from the start; the letter-to-model
 * key and the model-named results CSV live in KEY_do_not_open/.
 *
 * Spend is tracked per attempt (every attempt counted as billed, even a
 * failed one) and the run stops before any attempt that would push the
 * total past the round's budget.
 */

import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import Replicate, { type Prediction } from "replicate";
import sharp from "sharp";
import React from "react";
import { Document, Page, Text, View, Image, renderToFile } from "@react-pdf/renderer";

const CONCURRENCY = 4;
const ATTEMPT_TIMEOUT_MS = 180_000;
const RETRY_DELAY_MS = 3_000;
const POLL_INTERVAL_MS = 1_500;
// Gray pixel = neither near black nor near white, on the 0-255 grayscale.
const NEAR_BLACK = 50;
const NEAR_WHITE = 205;
const PRINT_SCENE = 1; // the print test uses this scene for every letter

// ─── Copied from lib/generateMascotImage.ts ──────────────────────────────────

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

const NO_TEXT_LINE =
  "no letters, numbers, words, or signs anywhere in the image, including on vehicles, clothing, banners, and objects, ";

function coloringPrompt(coloringScene: string, childName: string, variant: ColoringVariant = {}): string {
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

// ─── Test scenes (fake child name only) ──────────────────────────────────────

const CHILD_NAME = "Maya";

interface Scene {
  id: number;
  label: string;
  mascot: string;
  coloring: string;
}

// Written the way the packet generator's Claude prompt writes them:
// mascot_description follows "A cute cartoon [character] [action],
// [accessories], bright colors, simple clean lines, white background,
// kid-friendly illustration"; coloring_scene names the child and mascot,
// the setting, and 3-5 specific objects.
const SCENES: Scene[] = [
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

// ─── Models ──────────────────────────────────────────────────────────────────

type ListName = "mascot" | "coloring";

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

interface RoundConfig {
  out: string;
  runs: number;
  budgetUsd: number;
  coloringVariant: ColoringVariant;
  printTest: boolean;
  models: Record<ListName, ModelSpec[]>;
}

const ROUNDS: Record<number, RoundConfig> = {
  // Round 1 (2026-09-28): the wide field. Kept exactly as it ran.
  1: {
    out: "model-bakeoff-images-round1",
    runs: 3,
    budgetUsd: 12,
    coloringVariant: {},
    printTest: true,
    models: {
      mascot: [
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
      ],
      coloring: [
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
      ],
    },
  },
  // Round 2 (2026-09-28): cheaper and faster options around the round 1
  // picks, with a no-text line and "a girl" for the child on coloring pages.
  2: {
    out: "model-bakeoff-images-round2",
    runs: 2,
    budgetUsd: 5,
    coloringVariant: { placeholder: "a girl", noText: true },
    printTest: false,
    models: {
      mascot: [
        flux2Pro,
        flux2Klein4b,
        {
          key: "flux-2-dev (go_fast)",
          ref: FLUX_2_DEV_REF,
          price: 0.013, // $0.012 per output megapixel in go_fast mode, ~1.05 MP
          input: (prompt) => ({ prompt, aspect_ratio: "1:1", go_fast: true, output_format: "png" }),
        },
      ],
      coloring: [gptImage2("low", 0.012), gptImage2("medium", 0.047), ideogramColoringBook],
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

// ─── Replicate ───────────────────────────────────────────────────────────────

const token = (process.env.REPLICATE_API_TOKEN ?? "").replace(/\s+#.*$/, "").trim();
if (!token) throw new Error("Set REPLICATE_API_TOKEN (in .env.local) before running the bakeoff.");
const replicate = new Replicate({ auth: token });

const TERMINAL: ReadonlySet<Prediction["status"]> = new Set(["succeeded", "failed", "canceled", "aborted"]);

async function runPrediction(ref: string, input: Record<string, unknown>): Promise<string> {
  const version = ref.split(":")[1];
  const deadline = Date.now() + ATTEMPT_TIMEOUT_MS;
  let prediction = await replicate.predictions.create({ version, input });
  while (!TERMINAL.has(prediction.status)) {
    if (Date.now() >= deadline) {
      try {
        await replicate.predictions.cancel(prediction.id);
      } catch {
        // a failed cancel only means Replicate may finish it anyway; spend is already counted
      }
      throw new Error(`timed out after ${ATTEMPT_TIMEOUT_MS / 1000}s`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    prediction = await replicate.predictions.get(prediction.id);
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
  letter: string;
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

function shuffledLetters(list: ListName): Map<ModelSpec, string> {
  const specs = [...ROUND.models[list]];
  for (let i = specs.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [specs[i], specs[j]] = [specs[j], specs[i]];
  }
  return new Map(specs.map((s, i) => [s, String.fromCharCode(65 + i)]));
}

function rel(...parts: string[]): string {
  return path.join(...parts).split(path.sep).join("/");
}

function imageFile(list: ListName, letter: string, scene: number, run: number): string {
  return path.join(OUT, list, letter, `scene${scene}_run${run}.png`);
}

async function runJob(list: ListName, spec: ModelSpec, letter: string, scene: Scene, run: number): Promise<Result> {
  const prompt =
    list === "mascot"
      ? mascotPrompt(scene.mascot, CHILD_NAME)
      : coloringPrompt(scene.coloring, CHILD_NAME, ROUND.coloringVariant);
  const result: Result = {
    list, letter, model: spec.key, ref: spec.ref, scene: scene.id, run,
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
  const full = [csvRow(["list", "model", "version", "scene", "run", "seconds", "cost_usd", "attempts", "failed", "gray_pct", "error"])];
  const blind = [csvRow(["list", "letter", "scene", "run", "seconds", "failed", "gray_pct"])];
  for (const r of results) {
    const secs = r.seconds === null ? null : r.seconds.toFixed(1);
    const gray = r.grayPct === null ? null : r.grayPct.toFixed(2);
    full.push(csvRow([r.list, r.model, r.ref.split(":")[1], r.scene, r.run, secs, r.cost.toFixed(4), r.attempts, r.failed ? "yes" : "no", gray, r.error]));
    blind.push(csvRow([r.list, r.letter, r.scene, r.run, secs, r.failed ? "yes" : "no", gray]));
  }
  fs.writeFileSync(path.join(KEY_DIR, "results.csv"), `${full.join("\n")}\n`);
  fs.writeFileSync(path.join(OUT, "results_blind.csv"), `${blind.join("\n")}\n`);
}

function findResult(results: Result[], list: ListName, letter: string, scene: number, run: number): Result | undefined {
  return results.find((x) => x.list === list && x.letter === letter && x.scene === scene && x.run === run);
}

const LIST_TITLE: Record<ListName, string> = { mascot: "Mascot", coloring: "Coloring page" };
const INTRO =
  "Rows are scenes, columns are letters. Letters are assigned separately for this list, so a letter here is not the same model as that letter on the other sheet.";
const GRAY_NOTE = `Gray % counts pixels that are neither near black (<=${NEAR_BLACK}) nor near white (>=${NEAR_WHITE}) after the production grayscale pass; anti-aliased line edges count a little. Hard black and white copies are in coloring-threshold/.`;

function contactSheetHtml(list: ListName, letters: string[], results: Result[]): string {
  const title = LIST_TITLE[list];
  const cell = (letter: string, scene: number) =>
    Array.from({ length: ROUND.runs }, (_, k) => {
      const r = findResult(results, list, letter, scene, k + 1);
      const file = rel(list, letter, `scene${scene}_run${k + 1}.png`);
      if (!r || r.failed) return `<figure class="miss"><div>run ${k + 1}<br>no image</div></figure>`;
      const note = r.grayPct === null ? "" : ` · ${r.grayPct.toFixed(1)}% gray`;
      return `<figure><a href="${file}" target="_blank"><img src="${file}" alt="${title} ${letter}, scene ${scene}, run ${k + 1}" loading="lazy"></a><figcaption>run ${k + 1}${note}</figcaption></figure>`;
    }).join("");
  const rows = SCENES.map(
    (s) => `<tr><th scope="row">${s.id}. ${s.label}</th>${letters.map((l) => `<td>${cell(l, s.id)}</td>`).join("")}</tr>`
  ).join("\n");
  const grayNote = list === "coloring" ? `<p>${GRAY_NOTE}</p>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} bakeoff</title>
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
<h1>${title} bakeoff, round ${ROUND_NUMBER} (blind)</h1>
<p>${INTRO} ${ROUND.runs} runs each. Click an image to open it full size.</p>
${grayNote}
<table><thead><tr><th></th>${letters.map((l) => `<th scope="col">${l}</th>`).join("")}</tr></thead>
<tbody>
${rows}
</tbody></table></body></html>
`;
}

// Same layout as the HTML sheet, one wide page, with small JPEG thumbnails
// embedded so the file stays well under 20 MB.
async function contactSheetPdf(list: ListName, letters: string[], results: Result[]): Promise<string> {
  const TH = 78;
  const GAP = 6;
  const PAD = 8;
  const LABEL_W = 110;
  const CAPTION_H = 16;
  const cellW = ROUND.runs * TH + (ROUND.runs - 1) * GAP + 2 * PAD;
  const rowH = TH + CAPTION_H + 12;
  const headerH = list === "coloring" ? 96 : 76;
  const width = 36 + LABEL_W + letters.length * cellW;
  const height = headerH + 28 + SCENES.length * rowH + 24;
  const border = { borderWidth: 0.5, borderColor: "#cccccc", borderStyle: "solid" as const };

  const thumbs = new Map<string, Buffer>();
  for (const r of results) {
    if (r.list !== list || r.failed) continue;
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
    { title: `${LIST_TITLE[list]} bakeoff, round ${ROUND_NUMBER} (blind)` },
    h(
      Page,
      { size: [width, height], style: { backgroundColor: "#fdfbf7", padding: 18, color: "#1a1a2e" } },
      h(Text, { style: { fontSize: 16, marginBottom: 6 } }, `${LIST_TITLE[list]} bakeoff, round ${ROUND_NUMBER} (blind)`),
      h(Text, { style: { fontSize: 8.5, color: "#444455", marginBottom: 4 } }, `${INTRO} ${ROUND.runs} runs each.`),
      list === "coloring" ? h(Text, { style: { fontSize: 8, color: "#444455", marginBottom: 4 } }, GRAY_NOTE) : null,
      h(
        View,
        { style: { flexDirection: "row", marginTop: 10 } },
        h(View, { style: { width: LABEL_W } }),
        ...letters.map((l) =>
          h(View, { key: l, style: { ...border, width: cellW, height: 28, justifyContent: "center" } },
            h(Text, { style: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center" } }, l))
        )
      ),
      ...SCENES.map((s) =>
        h(
          View,
          { key: s.id, style: { flexDirection: "row" } },
          h(View, { style: { ...border, width: LABEL_W, height: rowH, padding: 5 } },
            h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold" } }, `${s.id}. ${s.label}`)),
          ...letters.map((l) => cell(l, s.id))
        )
      )
    )
  );
  const out = path.join(OUT, `contact-sheet-${list}.pdf`);
  await renderToFile(doc, out);
  return out;
}

async function printTest(letters: string[], results: Result[]): Promise<string[]> {
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

// ─── Main ────────────────────────────────────────────────────────────────────

// --dry-run: print the plan, estimated cost, and sample prompts. No API
// calls, no files written.
function dryRun() {
  const planned = Object.values(ROUND.models).flat().reduce((sum, m) => sum + m.price, 0) * SCENES.length * ROUND.runs;
  const count = Object.values(ROUND.models).flat().length * SCENES.length * ROUND.runs;
  process.stdout.write(
    `Round ${ROUND_NUMBER} dry run: ${count} images, estimated $${planned.toFixed(2)}, budget $${ROUND.budgetUsd}, output ${OUT}\n` +
      `Mascot models: ${ROUND.models.mascot.length}, coloring models: ${ROUND.models.coloring.length}\n\n` +
      `Sample mascot prompt (scene 1):\n${mascotPrompt(SCENES[0].mascot, CHILD_NAME)}\n\n` +
      `Sample coloring prompt (scene 4):\n${coloringPrompt(SCENES[3].coloring, CHILD_NAME, ROUND.coloringVariant)}\n`
  );
}

async function main() {
  if (process.argv.includes("--dry-run")) return dryRun();
  if (fs.existsSync(OUT)) throw new Error(`${OUT} already exists. Move or delete it before a new run so rounds never mix.`);
  fs.mkdirSync(KEY_DIR, { recursive: true });

  const placeholder = ROUND.coloringVariant.placeholder ?? CHILD_PLACEHOLDER;
  const keyLines = [
    `Image bakeoff round ${ROUND_NUMBER} key (${new Date().toISOString().slice(0, 10)})`,
    `Test child name: ${CHILD_NAME} (fake). Mascot prompt scrubs it to "${CHILD_PLACEHOLDER}"; coloring prompt scrubs it to "${placeholder}".`,
    `Coloring no-text line: ${ROUND.coloringVariant.noText ? "on" : "off"}`,
  ];
  const tasks: (() => Promise<Result>)[] = [];
  const lettersByList: Record<ListName, string[]> = { mascot: [], coloring: [] };

  for (const list of ["mascot", "coloring"] as ListName[]) {
    const letters = shuffledLetters(list);
    keyLines.push("", `${list.toUpperCase()}`);
    for (const [spec, letter] of [...letters].sort((a, b) => a[1].localeCompare(b[1]))) {
      keyLines.push(`${letter} = ${spec.key}  [${spec.ref}]`);
      lettersByList[list].push(letter);
      fs.mkdirSync(path.join(OUT, list, letter), { recursive: true });
      if (list === "coloring") fs.mkdirSync(path.join(OUT, "coloring-threshold", letter), { recursive: true });
    }
    // Interleave by scene and run so a slow model doesn't bunch up at the end.
    for (const scene of SCENES) {
      for (let run = 1; run <= ROUND.runs; run++) {
        for (const [spec, letter] of letters) tasks.push(() => runJob(list, spec, letter, scene, run));
      }
    }
  }
  fs.writeFileSync(path.join(KEY_DIR, "KEY.txt"), `${keyLines.join("\n")}\n`);

  const planned = Object.values(ROUND.models).flat().reduce((sum, m) => sum + m.price, 0) * SCENES.length * ROUND.runs;
  process.stdout.write(`Round ${ROUND_NUMBER}: ${tasks.length} images planned, estimated $${planned.toFixed(2)} before retries, budget $${ROUND.budgetUsd}\n`);

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
  const pdfs: string[] = [];
  for (const list of ["mascot", "coloring"] as ListName[]) {
    fs.writeFileSync(path.join(OUT, `contact-sheet-${list}.html`), contactSheetHtml(list, lettersByList[list], results));
    const pdf = await contactSheetPdf(list, lettersByList[list], results);
    pdfs.push(`${pdf} (${(fs.statSync(pdf).size / 1e6).toFixed(2)} MB)`);
  }
  const missingPrint = ROUND.printTest ? await printTest(lettersByList.coloring, results) : [];

  const failed = results.filter((r) => r.failed).length;
  const retried = results.filter((r) => r.attempts > 1).length;
  process.stdout.write(
    `\nDone. ${results.length - failed} of ${results.length} images saved, ${failed} failed or skipped, ${retried} needed a retry.` +
      `\nSpend counted: $${spent.toFixed(3)} of $${ROUND.budgetUsd}${budgetStopped ? " (STOPPED at budget)" : ""}.` +
      `\nContact sheet PDFs:\n  ${pdfs.join("\n  ")}` +
      (missingPrint.length ? `\nPrint test is missing letters with no scene ${PRINT_SCENE} image: ${missingPrint.join(", ")}` : "") +
      `\nOutput: ${OUT}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

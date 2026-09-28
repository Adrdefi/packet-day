/**
 * Image model bakeoff: runs the packet's two images (mascot and coloring
 * page) through several Replicate models, blinds the results, and builds
 * contact sheets plus a printable coloring-page PDF.
 *
 *   npm run image-bakeoff
 *
 * Standalone on purpose: calls Replicate directly with REPLICATE_API_TOKEN.
 * No dev server, no login, no Supabase, no admin key, no production code
 * touched. The prompt wording and the name scrubber below are COPIED from
 * lib/generateMascotImage.ts (2026-09-28) so production stays untouched; if
 * production's prompts change, re-copy them here before the next round.
 *
 * Output goes to model-bakeoff-images-round1/ (gitignored: model-bakeoff-*).
 * Images are saved under blind letters from the start; the letter-to-model
 * key and the model-named results CSV live in KEY_do_not_open/.
 *
 * Spend is tracked per attempt (every attempt counted as billed, even a
 * failed one) and the run stops before any attempt that would push the
 * total past BUDGET_USD.
 */

import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import Replicate, { type Prediction } from "replicate";
import sharp from "sharp";
import React from "react";
import { Document, Page, Text, Image, renderToFile } from "@react-pdf/renderer";

const OUT = path.resolve("model-bakeoff-images-round1");
const KEY_DIR = path.join(OUT, "KEY_do_not_open");
const BUDGET_USD = 12;
const RUNS = 3;
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

function scrubChildName(text: string, childName: string): string {
  const trimmedName = childName.trim();
  if (!trimmedName) return text;

  const pattern = new RegExp(`\\b${escapeRegExp(trimmedName)}\\b`, "gi");
  return text.replace(pattern, CHILD_PLACEHOLDER);
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

function coloringPrompt(coloringScene: string, childName: string): string {
  const scene = scrubChildName(coloringScene.trim(), childName);
  return (
    `black and white coloring book page for children featuring ${scene}, ` +
    `clean black outlines only, no color, no shading, no fill, ` +
    `pure white background, thick clean outlines with large open white regions for coloring, ` +
    `no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, ` +
    `simple shapes, kid-friendly line art ready to color, ` +
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

const MODELS: Record<ListName, ModelSpec[]> = {
  mascot: [
    {
      key: "flux-schnell (baseline)",
      ref: "black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e",
      price: 0.003,
      input: (prompt) => ({ prompt, num_outputs: 1, aspect_ratio: "1:1", output_format: "png" }),
    },
    {
      key: "flux-2-klein-4b",
      ref: "black-forest-labs/flux-2-klein-4b:8e9c42d77b10a2a41af823ac4500f7545be6ebc4e745830fc3f3de10de200542",
      price: 0.0011, // $1 per thousand output megapixels, ~1.05 MP
      input: (prompt) => ({ prompt, aspect_ratio: "1:1", output_megapixels: "1", output_format: "png" }),
    },
    {
      key: "flux-2-pro",
      ref: "black-forest-labs/flux-2-pro:ccb5e33141097816e6fab8c895e702fe4c619e4e07500885b71214e9f6382a5c",
      price: 0.031, // $0.015 per run + $0.015 per output megapixel
      input: (prompt) => ({ prompt, aspect_ratio: "1:1", resolution: "1 MP", output_format: "png" }),
    },
    {
      key: "ideogram-v3-turbo (Children's Book preset, magic prompt off)",
      ref: "ideogram-ai/ideogram-v3-turbo:d9b3748f95c0fe3e71f010f8cc5d80e8f5252acd0e74b1c294ee889eea52a47b",
      price: 0.03,
      input: (prompt) => ({ prompt, aspect_ratio: "1:1", style_preset: "Children's Book", magic_prompt_option: "Off" }),
    },
    {
      key: "gpt-image-2 (quality medium)",
      ref: "openai/gpt-image-2:225c978a7f938acc350564c4548ddc2476bfb33364bec6b5422227f55ce56bd3",
      price: 0.047,
      input: (prompt) => ({
        prompt, quality: "medium", aspect_ratio: "1024x1024", background: "opaque", output_format: "png", number_of_images: 1,
      }),
    },
    {
      key: "nano-banana-2 (1K)",
      ref: "google/nano-banana-2:d1be8b5fc0931a253d417e12a484ac01ee9ccbc6daffd4792151377d5e5ff55f",
      price: 0.067,
      input: (prompt) => ({ prompt, aspect_ratio: "1:1", resolution: "1K", output_format: "png" }),
    },
  ],
  coloring: [
    {
      key: "recraft-v3 digital_illustration (baseline)",
      ref: "recraft-ai/recraft-v3:9507e61ddace8b3a238371b17a61be203747c5081ea6070fecd3c40d27318922",
      price: 0.04,
      input: (prompt) => ({ prompt, style: "digital_illustration", size: "1024x1024" }),
    },
    {
      key: "recraft-v3 hand_drawn_outline",
      ref: "recraft-ai/recraft-v3:9507e61ddace8b3a238371b17a61be203747c5081ea6070fecd3c40d27318922",
      price: 0.04,
      input: (prompt) => ({ prompt, style: "digital_illustration/hand_drawn_outline", size: "1024x1024" }),
    },
    {
      key: "recraft-v4",
      ref: "recraft-ai/recraft-v4:a8bc7377c37baeea1e01568f88b6abfb38939135071a38ca4267c8f82c3cbbf0",
      price: 0.04,
      input: (prompt) => ({ prompt, size: "1024x1024" }),
    },
    {
      key: "recraft-v4-svg (converted to PNG)",
      ref: "recraft-ai/recraft-v4-svg:93cbef8f201b974654d36b1247314072205583f6ff489a1582126f34f2f93635",
      price: 0.08,
      input: (prompt) => ({ prompt, size: "1024x1024" }),
      svg: true,
    },
    {
      key: "ideogram-v3-turbo (Coloring Book I preset, magic prompt off)",
      ref: "ideogram-ai/ideogram-v3-turbo:d9b3748f95c0fe3e71f010f8cc5d80e8f5252acd0e74b1c294ee889eea52a47b",
      price: 0.03,
      input: (prompt) => ({ prompt, aspect_ratio: "1:1", style_preset: "Coloring Book I", magic_prompt_option: "Off" }),
    },
    {
      key: "gpt-image-2 (quality medium)",
      ref: "openai/gpt-image-2:225c978a7f938acc350564c4548ddc2476bfb33364bec6b5422227f55ce56bd3",
      price: 0.047,
      input: (prompt) => ({
        prompt, quality: "medium", aspect_ratio: "1024x1024", background: "opaque", output_format: "png", number_of_images: 1,
      }),
    },
    {
      key: "qwen-image (negative prompt)",
      ref: "qwen/qwen-image:0bba9e70f78437359725e0989ead45ca8b09e6c12a070dfe9a09e6856b43a44d",
      price: 0.025,
      input: (prompt) => ({ prompt, negative_prompt: QWEN_NEGATIVE, aspect_ratio: "1:1", output_format: "png" }),
    },
  ],
};

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
  const specs = [...MODELS[list]];
  for (let i = specs.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [specs[i], specs[j]] = [specs[j], specs[i]];
  }
  return new Map(specs.map((s, i) => [s, String.fromCharCode(65 + i)]));
}

function rel(...parts: string[]): string {
  return path.join(...parts).split(path.sep).join("/");
}

async function runJob(list: ListName, spec: ModelSpec, letter: string, scene: Scene, run: number): Promise<Result> {
  const prompt = list === "mascot" ? mascotPrompt(scene.mascot, CHILD_NAME) : coloringPrompt(scene.coloring, CHILD_NAME);
  const result: Result = {
    list, letter, model: spec.key, ref: spec.ref, scene: scene.id, run,
    seconds: null, cost: 0, attempts: 0, failed: true, grayPct: null, error: "",
  };
  const name = `scene${scene.id}_run${run}.png`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (budgetStopped || spent + spec.price > BUDGET_USD) {
      budgetStopped = true;
      result.error = `skipped: would pass $${BUDGET_USD} budget`;
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

function contactSheet(list: ListName, letters: string[], results: Result[]): string {
  const title = list === "mascot" ? "Mascot" : "Coloring page";
  const cell = (letter: string, scene: number) =>
    Array.from({ length: RUNS }, (_, k) => {
      const r = results.find((x) => x.list === list && x.letter === letter && x.scene === scene && x.run === k + 1);
      const file = rel(list, letter, `scene${scene}_run${k + 1}.png`);
      if (!r || r.failed) return `<figure class="miss"><div>run ${k + 1}<br>no image</div></figure>`;
      const note = r.grayPct === null ? "" : ` · ${r.grayPct.toFixed(1)}% gray`;
      return `<figure><a href="${file}" target="_blank"><img src="${file}" alt="${title} ${letter}, scene ${scene}, run ${k + 1}" loading="lazy"></a><figcaption>run ${k + 1}${note}</figcaption></figure>`;
    }).join("");
  const rows = SCENES.map(
    (s) => `<tr><th scope="row">${s.id}. ${s.label}</th>${letters.map((l) => `<td>${cell(l, s.id)}</td>`).join("")}</tr>`
  ).join("\n");
  const thresholdLink =
    list === "coloring"
      ? `<p>Hard black and white copies, for comparison only: <code>coloring-threshold/&lt;letter&gt;/</code>. Gray % counts pixels that are neither near black (≤${NEAR_BLACK}) nor near white (≥${NEAR_WHITE}) after the production grayscale pass; anti-aliased line edges count a little.</p>`
      : "";
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
<h1>${title} bakeoff, round 1 (blind)</h1>
<p>Rows are scenes, columns are letters, three runs each. Click an image to open it full size. Letters are assigned separately for this list, so a letter here is not the same model as that letter on the other sheet.</p>
${thresholdLink}
<table><thead><tr><th></th>${letters.map((l) => `<th scope="col">${l}</th>`).join("")}</tr></thead>
<tbody>
${rows}
</tbody></table></body></html>
`;
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
    const data = fs.readFileSync(path.join(OUT, "coloring", letter, `scene${PRINT_SCENE}_run${r.run}.png`));
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

async function main() {
  if (fs.existsSync(OUT)) throw new Error(`${OUT} already exists. Move or delete it before a new run so rounds never mix.`);
  fs.mkdirSync(KEY_DIR, { recursive: true });

  const keyLines = [`Image bakeoff round 1 key (${new Date().toISOString().slice(0, 10)})`, `Test child name: ${CHILD_NAME} (fake), scrubbed to "${CHILD_PLACEHOLDER}"`];
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
      for (let run = 1; run <= RUNS; run++) {
        for (const [spec, letter] of letters) tasks.push(() => runJob(list, spec, letter, scene, run));
      }
    }
  }
  fs.writeFileSync(path.join(KEY_DIR, "KEY.txt"), `${keyLines.join("\n")}\n`);

  const planned = Object.values(MODELS).flat().reduce((sum, m) => sum + m.price, 0) * SCENES.length * RUNS;
  process.stdout.write(`${tasks.length} images planned, estimated $${planned.toFixed(2)} before retries, budget $${BUDGET_USD}\n`);

  let done = 0;
  const results = await pool(
    tasks.map((t) => async () => {
      const r = await t();
      done++;
      const status = r.failed ? `FAILED (${r.error})` : `ok ${r.seconds?.toFixed(1)}s`;
      process.stdout.write(`[${done}/${tasks.length}] ${r.list} ${r.letter} scene ${r.scene} run ${r.run}: ${status} | spent $${spent.toFixed(3)}\n`);
      return r;
    }),
    CONCURRENCY
  );

  writeCsvs(results);
  for (const list of ["mascot", "coloring"] as ListName[]) {
    fs.writeFileSync(path.join(OUT, `contact-sheet-${list}.html`), contactSheet(list, lettersByList[list], results));
  }
  const missingPrint = await printTest(lettersByList.coloring, results);

  const failed = results.filter((r) => r.failed).length;
  process.stdout.write(
    `\nDone. ${results.length - failed} of ${results.length} images saved, ${failed} failed or skipped.` +
      `\nSpend counted: $${spent.toFixed(3)} of $${BUDGET_USD}${budgetStopped ? " (STOPPED at budget)" : ""}.` +
      (missingPrint.length ? `\nPrint test is missing letters with no scene ${PRINT_SCENE} image: ${missingPrint.join(", ")}` : "") +
      `\nOutput: ${OUT}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

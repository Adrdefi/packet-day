// Server-side only. Generates mascot and coloring images via Replicate.
// Returns null on any failure so it never blocks packet delivery.
//
// ── Models (2026-09-28, chosen in the blind image bakeoff) ───────────────────
// Each image tries a primary model (one retry), then falls back to the model
// production used before the switch (one retry), so a packet never loses an
// image just because the newer model had a bad moment.
//
// Mascot:        black-forest-labs/flux-2-pro, 1:1, 1 MP, png.
//                Fallback: black-forest-labs/flux-schnell (the old default).
// Coloring page: openai/gpt-image-2, quality "low", 1024x1024, opaque, png,
//                with an extra no-letters-or-signs line in the prompt.
//                Fallback: recraft-ai/recraft-v3, style="digital_illustration",
//                with the pre-switch prompt unchanged. Confirmed style enum for
//                the pinned recraft version: any, realistic_image,
//                realistic_image/{b_and_w,hard_flash,hdr,natural_light,
//                studio_portrait,enterprise,motion_blur}, digital_illustration,
//                digital_illustration/{pixel_art,hand_drawn,grain,
//                infantile_sketch,2d_art_poster,handmade_3d,hand_drawn_outline,
//                engraving_color,2d_art_poster_2}. No vector_illustration subtree.
//                Sharp grayscale post-processing strips residual tinting from
//                whichever model produced the page.
//                Grade bands (2026-09-29): the GPT Image 2 prompt depends on
//                the child's grade (K-2, 3-5, 6-8; see coloringBandForGrade).
//                The Recraft fallback prompt is the same for every grade.
//
// ── Time budget ─────────────────────────────────────────────────────────────
// Every attempt's timeout is the smaller of its model's own cap and the time
// left before the caller's deadline, so retries and fallbacks can never push
// the route past its limit. Worst case with no deadline pressure: mascot
// 25+3+25+15+3+15 = 86 s, coloring 30+3+30+15+3+15 = 96 s, run in parallel.
//
// ── Diagnosed skip conditions (2026-07-24) ──────────────────────────────────
// 1. SILENT: mascot_description null/empty — was returning null with no log.
// 2. TIMEOUT: old sequential gen + 2 s sleep inside after() exceeded Vercel
//    Hobby's 10 s cap. Fixed by parallel generation. (Not an issue on Pro.)
// 3. CRASH: missing SUPABASE_SERVICE_ROLE_KEY caused createServiceClient()
//    to throw inside after(). Caller now guards before scheduling after().
//
// ── IP guard (2026-08-28, mascot names added 2026-09-28) ────────────────────
// coloring_scene is written to describe the child as "a girl", "a boy", or
// "a kid" rather than by name, but a real child's name is the strongest
// possible signal for a diffusion model to draw a same-named copyrighted
// character (e.g. a child named "Bart" produced a recognizable Bart Simpson),
// so both generators still scrub the child's name to a generic placeholder
// before it reaches the image model (scrubChildName below). The mascot's name
// is scrubbed too (scrubMascotName), because image models print names they
// see (a rocket named Zoom came back with "ZOOM" painted on it). Both prompts
// also carry an explicit no-copyrighted-character instruction as a second
// layer. Neither is a guarantee on its own; see the fix writeup for why both
// are kept.

import Replicate, { type Prediction } from "replicate";
import sharp from "sharp";
import type { ImageUsage } from "@/lib/aiCost";
import { bandForGrade, type BandKey } from "@/lib/pdf-tokens";

let _replicate: Replicate | null = null;

function getReplicate(): Replicate {
  if (!_replicate) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("Missing REPLICATE_API_TOKEN");
    }
    _replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return _replicate;
}

// ─── Model constants ──────────────────────────────────────────────────────────

// Pinned to the versions the 2026-09-28 bakeoff tested. Re-pin only after a
// new version is verified working.
const FLUX_2_PRO =
  "black-forest-labs/flux-2-pro:ccb5e33141097816e6fab8c895e702fe4c619e4e07500885b71214e9f6382a5c";
const GPT_IMAGE_2 =
  "openai/gpt-image-2:225c978a7f938acc350564c4548ddc2476bfb33364bec6b5422227f55ce56bd3";

// Fallbacks: the pre-switch production models. flux-schnell pinned
// 2025-06-25; recraft-v3 version created 2025-11-07.
const FLUX_SCHNELL =
  "black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e";
const RECRAFT_V3 =
  "recraft-ai/recraft-v3:9507e61ddace8b3a238371b17a61be203747c5081ea6070fecd3c40d27318922";

// Per-attempt caps, each well above the slowest time seen in the bakeoff
// (FLUX.2 Pro 13.7 s, GPT Image 2 low 17.4 s, recraft-v3 8.6 s,
// flux-schnell a few seconds in production).
const FLUX_2_PRO_TIMEOUT_MS = 25_000;
const GPT_IMAGE_2_TIMEOUT_MS = 30_000;
const FALLBACK_TIMEOUT_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHILD_PLACEHOLDER = "the child";
const MASCOT_PLACEHOLDER = "the mascot";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces every whole-word occurrence of the child's name with a generic
 * placeholder before text reaches an image-generation model. Case-insensitive.
 * Word-bounded so a short name ("Al") doesn't match inside another word
 * ("Also", "Alligator"). Possessives fall out for free: "Bart's" matches on
 * "Bart" (the boundary after "t" holds against the following apostrophe),
 * leaving "the child's".
 *
 * Only ever applied to the string handed to the image model — coloring_scene,
 * coloring_page.title, and coloring_page.instructions keep the real name for
 * the printed packet.
 */
function scrubChildName(text: string, childName: string): string {
  const trimmedName = childName.trim();
  if (!trimmedName) return text;

  const pattern = new RegExp(`\\b${escapeRegExp(trimmedName)}\\b`, "gi");
  return text.replace(pattern, CHILD_PLACEHOLDER);
}

/**
 * Removes the mascot's name from text bound for an image model, so the model
 * never sees a word it might paint onto the picture. "Twirl the pony" becomes
 * "the pony"; any other mention ("Twirl's tail") becomes "the mascot's tail".
 * Case-sensitive on purpose: mascot names are capitalized, and a name that is
 * also an ordinary word ("Bubbles") shouldn't wipe out "bubbles" in the scene.
 */
function scrubMascotName(text: string, mascotName: string | null | undefined): string {
  const trimmedName = mascotName?.trim();
  if (!trimmedName) return text;

  const name = escapeRegExp(trimmedName);
  return text
    .replace(new RegExp(`\\b${name} the\\b`, "g"), "the")
    .replace(new RegExp(`\\b${name}\\b`, "g"), MASCOT_PLACEHOLDER);
}

// Replicate E9828 "Director" errors hang for 107 s before the platform gives
// up on its own, so every attempt carries its own cap (see the model
// constants above) and is cancelled when it runs out.
const RETRY_DELAY_MS = 3_000;
const POLL_INTERVAL_MS = 1_000;
// Hard cap on the cancel request itself, so a hung cancel can't stall the packet.
const CANCEL_REQUEST_TIMEOUT_MS = 10_000;
// Don't start an attempt with less than this left before the deadline.
const MIN_ATTEMPT_MS = 5_000;
// Used only when a caller passes no deadline: comfortably above the 96 s
// worst case, so the per-attempt caps are what bound the call.
const DEFAULT_DEADLINE_MS = 150_000;
const ATTEMPTS_PER_MODEL = 2;

const TERMINAL_STATUSES: ReadonlySet<Prediction["status"]> = new Set([
  "succeeded",
  "failed",
  "canceled",
  "aborted",
]);

/** Tells Replicate to stop a prediction. Never throws — a failed cancel is only logged. */
async function cancelPrediction(predictionId: string, label: string): Promise<void> {
  try {
    await getReplicate().predictions.cancel(predictionId, {
      signal: AbortSignal.timeout(CANCEL_REQUEST_TIMEOUT_MS),
    });
    console.warn(`[${label}] Cancelled prediction ${predictionId}`);
  } catch (err) {
    console.error(`[${label}] Failed to cancel prediction ${predictionId}`, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Runs one Replicate prediction to completion and returns its output, giving
 * up after `timeoutMs`. When we give up — timeout or a failed status check —
 * the prediction is cancelled on Replicate's side (awaited), so it stops
 * running instead of finishing, and billing, after we've moved on.
 *
 * Every HTTP call carries an AbortSignal bounded by the remaining time, so no
 * single request can hang past the deadline. Everything stays on the awaited
 * chain of the caller.
 */
async function runPrediction(
  modelRef: string,
  input: Record<string, unknown>,
  timeoutMs: number,
  label: string
): Promise<unknown> {
  const replicate = getReplicate();
  const version = modelRef.split(":")[1];
  const deadline = Date.now() + timeoutMs;
  const remainingSignal = () => AbortSignal.timeout(Math.max(1_000, deadline - Date.now()));

  // If this request itself times out we have no prediction id to cancel —
  // Replicate may still have created it. Rare, and nothing more we can do.
  let prediction = await replicate.predictions.create({
    version,
    input,
    signal: remainingSignal(),
  });

  try {
    while (!TERMINAL_STATUSES.has(prediction.status)) {
      if (Date.now() >= deadline) {
        throw new Error(`${label}: timed out after ${Math.round(timeoutMs / 1000)}s`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      prediction = await replicate.predictions.get(prediction.id, { signal: remainingSignal() });
    }
  } catch (err) {
    await cancelPrediction(prediction.id, label);
    throw err;
  }

  if (prediction.status !== "succeeded") {
    throw new Error(
      `${label}: prediction ${prediction.status}${prediction.error ? ` — ${String(prediction.error)}` : ""}`
    );
  }
  return prediction.output;
}

/** One model to try, with the input it gets and its per-attempt cap. */
interface ImageStage {
  modelRef: string;
  input: Record<string, unknown>;
  attemptTimeoutMs: number;
}

interface StagesResult {
  url: string | null;
  /** Model that produced the image, or the last one tried if none did. */
  model: string | null;
  attempts: number;
  durationMs: number | null;
  usage: ImageUsage[];
  usedFallback: boolean;
}

/**
 * Tries each stage in order, ATTEMPTS_PER_MODEL times each, stopping at the
 * first image. Attempts are logged distinctly so Vercel logs show retries
 * and fallbacks. Never starts an attempt it can't give MIN_ATTEMPT_MS before
 * `deadlineMs`, and never lets one run past it.
 */
async function runStages(stages: ImageStage[], deadlineMs: number, label: string): Promise<StagesResult> {
  const usage: ImageUsage[] = [];
  let attempts = 0;
  let lastModel: string | null = null;
  let lastStageIndex = 0;

  for (const [stageIndex, stage] of stages.entries()) {
    const modelName = stage.modelRef.split(":")[0];
    if (stageIndex > 0) console.warn(`[${label}] Falling back to ${modelName}`);

    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
      const remainingMs = deadlineMs - Date.now();
      if (remainingMs < MIN_ATTEMPT_MS) {
        console.error(`[${label}] Out of time before ${modelName} attempt ${attempt} — giving up`, {
          remainingMs,
        });
        return { url: null, model: lastModel, attempts, durationMs: null, usage, usedFallback: lastStageIndex > 0 };
      }

      let stageUsage = usage.find((u) => u.model === stage.modelRef);
      if (!stageUsage) {
        stageUsage = { model: stage.modelRef, attempts: 0 };
        usage.push(stageUsage);
      }
      stageUsage.attempts++;
      attempts++;
      lastModel = stage.modelRef;
      lastStageIndex = stageIndex;

      const attemptStartMs = Date.now();
      try {
        console.warn(`[${label}] ${modelName} attempt ${attempt} starting`);
        const output = await runPrediction(
          stage.modelRef,
          stage.input,
          Math.min(stage.attemptTimeoutMs, remainingMs),
          label
        );
        const url = extractUrl(output);
        if (!url) throw new Error("No URL in Replicate output");
        return {
          url,
          model: stage.modelRef,
          attempts,
          durationMs: Date.now() - attemptStartMs,
          usage,
          usedFallback: stageIndex > 0,
        };
      } catch (err) {
        console.warn(`[${label}] ${modelName} attempt ${attempt} failed`, {
          reason: err instanceof Error ? err.message : String(err),
        });
        if (attempt < ATTEMPTS_PER_MODEL || stageIndex < stages.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, Math.min(RETRY_DELAY_MS, deadlineMs - Date.now())))
          );
        }
      }
    }
  }

  return { url: null, model: lastModel, attempts, durationMs: null, usage, usedFallback: lastStageIndex > 0 };
}

/** Fetch a Replicate output URL and return it as a base64 data URL. */
async function fetchAsDataUrl(url: string): Promise<string> {
  const imgResponse = await fetch(url);
  if (!imgResponse.ok) {
    throw new Error(`Fetch failed: ${imgResponse.status} ${imgResponse.statusText}`);
  }
  const arrayBuffer = await imgResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = imgResponse.headers.get("content-type") ?? "image/png";
  return `data:${contentType};base64,${base64}`;
}

/** Extract a URL string from whatever Replicate returns (FileOutput or string). */
function extractUrl(output: unknown): string | null {
  if (!output) return null;
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) return null;

  // FileOutput objects (replicate SDK v1+) expose a .url() method that returns
  // a URL object. Prefer this over toString() so we're not relying on the
  // string coercion behavior of ReadableStream subclasses.
  if (
    typeof first === "object" &&
    first !== null &&
    typeof (first as Record<string, unknown>).url === "function"
  ) {
    try {
      const urlObj = (first as { url: () => URL }).url();
      return urlObj.toString();
    } catch {
      // fall through to String() attempt
    }
  }

  // Plain string URL (pinned-version calls, or future SDK changes)
  const url = String(first);
  if (!url.startsWith("http")) {
    console.error("[replicate] Unexpected output format — not a URL", {
      type: typeof first,
      preview: url.slice(0, 120),
    });
    return null;
  }
  return url;
}

/**
 * What each generator returns. `attempts` counts every Replicate prediction
 * started across every model tried, including ones that timed out and were
 * cancelled (cost estimates treat every attempt as billed). `usage` breaks
 * those attempts down per model so cost is priced correctly when a fallback
 * ran. `model` is the model that produced the image, or the last one tried
 * if none did; null when skipped. `durationMs` is the successful Replicate
 * call only — null if no attempt succeeded or generation was skipped.
 */
export interface ImageGenResult {
  image: string | null;
  model: string | null;
  attempts: number;
  durationMs: number | null;
  usage: ImageUsage[];
  usedFallback: boolean;
}

const SKIPPED: ImageGenResult = { image: null, model: null, attempts: 0, durationMs: null, usage: [], usedFallback: false };

// ─── Coloring page ────────────────────────────────────────────────────────────

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

// ─── Coloring page grade bands (2026-09-29, chosen in the blind bakeoff) ─────
// K-2 is buildColoringPrompt above, unchanged. 3-5 and 6-8 swap its three
// simplicity lines ("for children", "thick clean outlines with large open
// white regions for coloring", and "simple shapes, kid-friendly line art
// ready to color") for a detail line, keeping every other line in order.
// The strings are copied character for character from the image-bakeoff
// branch (scripts/image-bakeoff.ts): 3-5 is round 1 variant 35B, 6-8 is
// round 2 variant D_T2. npm run check-coloring-prompt locks all three.
// Only GPT Image 2 is banded; the Recraft fallback keeps today's prompt.

const DETAIL_3_5 =
  "medium weight outlines with a mix of large and medium regions to color, a fuller scene with background details, " +
  "textures drawn as line patterns such as leaves, bark, fur, and fabric, natural proportions, " +
  "line art ready for colored pencils or markers, simple decorative patterns inside some of the larger shapes";

const DETAIL_6_8 =
  "intricate illustrated line art for older kids and teens, fine but clearly printable black outlines, " +
  "many small and medium regions to color, detailed background, realistic proportions, not cartoonish, " +
  "textures rendered with line work only, crisp, smooth, continuous black outlines, clean line art with no " +
  "sketchy, broken, or doubled strokes, no stippling or hatching texture, no labels, markings, symbols, or " +
  "numbers on walls, panels, railings, or equipment, balance detailed areas with a few larger open areas to " +
  "color, avoid tiny cluttered details";

function buildDetailedColoringPrompt(scene: string, detail: string): string {
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

/**
 * The coloring band for a child's grade ("K", "1".."8"). A missing grade,
 * or one with no K and no number in it, is K-2: today's prompt, so nothing
 * changes quietly. Anything readable goes through bandForGrade, the same
 * rule the PDF uses (5 is 3-5, 6 is 6-8). bandForGrade itself turns an
 * unreadable grade into 3-5, which is why it is only called on readable ones.
 */
export function coloringBandForGrade(gradeLevel: string | null | undefined): BandKey {
  const grade = gradeLevel?.trim() ?? "";
  if (!/^k(indergarten)?$/i.test(grade) && !/\d/.test(grade)) return "K-2";
  return bandForGrade(grade);
}

/**
 * Both prompts for one coloring page: the band's GPT Image 2 prompt, and the
 * Recraft fallback's prompt, which is today's prompt for every band.
 * `scene` must already have the child's and mascot's names scrubbed out.
 */
export function buildColoringPrompts(scene: string, band: BandKey): { gptImage2: string; recraft: string } {
  const gptImage2 =
    band === "3-5"
      ? buildDetailedColoringPrompt(scene, DETAIL_3_5)
      : band === "6-8"
        ? buildDetailedColoringPrompt(scene, DETAIL_6_8)
        : buildColoringPrompt(scene, true);
  return { gptImage2, recraft: buildColoringPrompt(scene, false) };
}

/**
 * Generates a B&W coloring-page image: GPT Image 2 first, recraft-v3 (with
 * the pre-switch prompt) as the fallback.
 *
 * Accepts `coloringScene` — the concrete visual scene description from the
 * packet JSON (coloring_page.coloring_scene). This is the single source of
 * truth: the same text drives the image, the page title, and the instructions,
 * so all three always describe the same scene.
 *
 * Sharp grayscale post-processing is applied as a safety net to strip any
 * residual color tinting before the image reaches the PDF.
 *
 * `childName` and `mascotName` are scrubbed out of the scene text before it
 * reaches either model — see the IP guard note at the top of this file.
 *
 * `gradeLevel` picks the GPT Image 2 prompt's grade band (see
 * coloringBandForGrade). Leaving it out gives K-2, today's prompt.
 */
export async function generateColoringImage(
  coloringScene: string | null | undefined,
  childName: string,
  mascotName: string | null | undefined,
  deadlineMs: number,
  gradeLevel?: string | null
): Promise<ImageGenResult> {
  if (!coloringScene?.trim()) {
    console.warn("[generateColoringImage] Skipping — coloring_scene is null or empty");
    return SKIPPED;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateColoringImage] Skipping — REPLICATE_API_TOKEN not set");
    return SKIPPED;
  }

  const scene = scrubMascotName(scrubChildName(coloringScene.trim(), childName), mascotName);
  const band = coloringBandForGrade(gradeLevel);
  const prompts = buildColoringPrompts(scene, band);
  const startMs = Date.now();

  const result = await runStages(
    [
      {
        modelRef: GPT_IMAGE_2,
        input: {
          prompt: prompts.gptImage2,
          quality: "low",
          aspect_ratio: "1024x1024",
          background: "opaque",
          output_format: "png",
          number_of_images: 1,
        },
        attemptTimeoutMs: GPT_IMAGE_2_TIMEOUT_MS,
      },
      {
        modelRef: RECRAFT_V3,
        input: { prompt: prompts.recraft, style: "digital_illustration", size: "1024x1024" },
        attemptTimeoutMs: FALLBACK_TIMEOUT_MS,
      },
    ],
    deadlineMs,
    "generateColoringImage"
  );
  const genResult: ImageGenResult = {
    image: null,
    model: result.model,
    attempts: result.attempts,
    durationMs: result.durationMs,
    usage: result.usage,
    usedFallback: result.usedFallback,
  };

  if (!result.url) {
    console.error("[generateColoringImage] Every model and attempt failed", {
      attempts: result.attempts,
      elapsedMs: Date.now() - startMs,
    });
    return genResult;
  }

  try {
    const imgResponse = await fetch(result.url);
    if (!imgResponse.ok) {
      throw new Error(`Fetch failed: ${imgResponse.status} ${imgResponse.statusText}`);
    }
    const arrayBuffer = await imgResponse.arrayBuffer();

    // Gentle grayscale — strips residual color tinting without destroying
    // tonal detail the way a hard threshold would.
    const grayBuffer = await sharp(Buffer.from(arrayBuffer))
      .grayscale()
      .png()
      .toBuffer();

    console.warn(
      `[generateColoringImage] Done with ${result.model?.split(":")[0]} in ${Date.now() - startMs}ms (grade band ${band})`
    );
    return { ...genResult, image: `data:image/png;base64,${grayBuffer.toString("base64")}` };
  } catch (err) {
    console.error("[generateColoringImage] Download or grayscale failed", {
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
    });
    return genResult;
  }
}

// ─── Mascot image ─────────────────────────────────────────────────────────────

/**
 * Generates a colourful cartoon mascot image: FLUX.2 Pro first, flux-schnell
 * as the fallback. Returns a base64 data URL, or null if every attempt fails.
 *
 * `childName` and `mascotName` are scrubbed out of the description before it
 * reaches either model, as defense in depth — mascot_description isn't
 * instructed to contain either name, but nothing structurally prevents it.
 * See the IP guard note at the top of this file.
 */
export async function generateMascotImage(
  mascotDescription: string | null | undefined,
  childName: string,
  mascotName: string | null | undefined,
  deadlineMs: number
): Promise<ImageGenResult> {
  if (!mascotDescription?.trim()) {
    console.warn("[generateMascotImage] Skipping — mascot_description is null or empty");
    return SKIPPED;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateMascotImage] Skipping — REPLICATE_API_TOKEN not set");
    return SKIPPED;
  }

  const description = scrubMascotName(scrubChildName(mascotDescription.trim(), childName), mascotName);
  const prompt =
    `${description}, whimsical cartoon style, bright vibrant colors, ` +
    `simple clean lines, perfect for children's worksheet, white background, no text, ` +
    `do not depict any copyrighted, trademarked, or real-world-recognizable character, ` +
    `celebrity, or franchise mascot; invented, non-specific features only`;

  const startMs = Date.now();
  const result = await runStages(
    [
      {
        modelRef: FLUX_2_PRO,
        input: { prompt, aspect_ratio: "1:1", resolution: "1 MP", output_format: "png" },
        attemptTimeoutMs: FLUX_2_PRO_TIMEOUT_MS,
      },
      {
        modelRef: FLUX_SCHNELL,
        input: { prompt, num_outputs: 1, aspect_ratio: "1:1", output_format: "png" },
        attemptTimeoutMs: FALLBACK_TIMEOUT_MS,
      },
    ],
    deadlineMs,
    "generateMascotImage"
  );
  const genResult: ImageGenResult = {
    image: null,
    model: result.model,
    attempts: result.attempts,
    durationMs: result.durationMs,
    usage: result.usage,
    usedFallback: result.usedFallback,
  };

  if (!result.url) {
    console.error("[generateMascotImage] Every model and attempt failed", {
      attempts: result.attempts,
      elapsedMs: Date.now() - startMs,
    });
    return genResult;
  }

  console.warn(`[generateMascotImage] Done with ${result.model?.split(":")[0]} in ${Date.now() - startMs}ms`);
  try {
    return { ...genResult, image: await fetchAsDataUrl(result.url) };
  } catch (fetchErr) {
    // Return the direct URL as a fallback — it expires in ~1 hour but
    // that's long enough to render the PDF for the current session.
    console.error("[generateMascotImage] Base64 fetch failed — using direct URL", {
      message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    });
    return { ...genResult, image: result.url };
  }
}

// ─── Parallel generation ──────────────────────────────────────────────────────

/**
 * Generates mascot and coloring images in parallel.
 * Both calls run concurrently so the total time is max(mascot, coloring),
 * not mascot + coloring.
 *
 * @param mascotDescription - drives the mascot image (character, style)
 * @param coloringScene     - drives the coloring page image (scene, objects, setting)
 *                            If omitted, falls back to mascotDescription so old callers still work.
 * @param childName         - scrubbed out of both prompts before they reach the image model.
 * @param options.mascotName - also scrubbed out of both prompts.
 * @param options.deadlineMs - epoch ms by which every attempt must finish; defaults to
 *                            DEFAULT_DEADLINE_MS from now.
 * @param options.gradeLevel - the child's grade, for the coloring page's grade band.
 *                            Left out, the coloring page uses the K-2 prompt.
 */
export async function generateBothImages(
  mascotDescription: string | null | undefined,
  coloringScene: string | null | undefined,
  childName: string,
  options: { mascotName?: string | null; deadlineMs?: number; gradeLevel?: string | null } = {}
): Promise<{
  mascotImageUrl: string | null;
  coloringImageUrl: string | null;
  mascot: ImageGenResult;
  coloring: ImageGenResult;
}> {
  const deadlineMs = options.deadlineMs ?? Date.now() + DEFAULT_DEADLINE_MS;
  const [mascot, coloring] = await Promise.all([
    generateMascotImage(mascotDescription, childName, options.mascotName, deadlineMs),
    generateColoringImage(coloringScene ?? mascotDescription, childName, options.mascotName, deadlineMs, options.gradeLevel),
  ]);
  const mascotImageUrl = mascot.image;
  const coloringImageUrl = coloring.image;

  if (!mascotImageUrl) {
    console.error("[generateBothImages] mascot image returned null", {
      mascotDescription: mascotDescription?.slice(0, 120) ?? "(empty)",
    });
  }
  if (!coloringImageUrl) {
    console.error("[generateBothImages] coloring image returned null", {
      coloringScene: (coloringScene ?? mascotDescription)?.slice(0, 120) ?? "(empty)",
    });
  }

  return { mascotImageUrl, coloringImageUrl, mascot, coloring };
}

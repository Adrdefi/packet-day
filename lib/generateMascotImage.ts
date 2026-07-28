// Server-side only. Generates mascot and coloring images via Replicate.
// Returns null on any failure so it never blocks packet delivery.
//
// ── Models ────────────────────────────────────────────────────────────────────
// Mascot:        black-forest-labs/flux-schnell  (unpinned deployment)
//                Fast, vibrant cartoon output.
// Coloring page: recraft-ai/recraft-v3 pinned to version 9507e61d...
//                style="digital_illustration" (base style). Chosen via
//                comparison test (2026-07-24): cleaner coloring-book output
//                than hand_drawn_outline, which returned colored artwork.
//                Sharp grayscale post-processing strips residual color tinting.
//                Confirmed style enum for this version: any, realistic_image,
//                realistic_image/{b_and_w,hard_flash,hdr,natural_light,
//                studio_portrait,enterprise,motion_blur}, digital_illustration,
//                digital_illustration/{pixel_art,hand_drawn,grain,
//                infantile_sketch,2d_art_poster,handmade_3d,hand_drawn_outline,
//                engraving_color,2d_art_poster_2}. No vector_illustration subtree.
//
// ── Diagnosed skip conditions (2026-07-24) ──────────────────────────────────
// 1. SILENT: mascot_description null/empty — was returning null with no log.
// 2. TIMEOUT: old sequential gen + 2 s sleep inside after() exceeded Vercel
//    Hobby's 10 s cap. Fixed by parallel generation. (Not an issue on Pro.)
// 3. CRASH: missing SUPABASE_SERVICE_ROLE_KEY caused createServiceClient()
//    to throw inside after(). Caller now guards before scheduling after().

import Replicate from "replicate";
import sharp from "sharp";

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

// Pinned 2025-06-25. Re-pin when a new version is verified working.
const FLUX_SCHNELL =
  "black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e";

// Pinned so a recraft update can't silently break coloring page output.
// Version created 2025-11-07. Re-pin when a new version is verified.
const RECRAFT_V3 =
  "recraft-ai/recraft-v3:9507e61ddace8b3a238371b17a61be203747c5081ea6070fecd3c40d27318922";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_WORDS =
  /\b(orange|blue|green|red|yellow|purple|brown|pink|gold|silver|white|black|rainbow)\b/gi;

function stripColors(description: string): string {
  return description.replace(COLOR_WORDS, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Race a promise against a hard timeout.
 * Replicate E9828 "Director" errors hang for 107 s before the platform gives
 * up on its own. 60 s lets us fail fast, log it, and move on.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`${label}: timed out after ${ms / 1000}s`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}

const REPLICATE_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 3_000;

/**
 * Try `fn` once; if it throws, wait RETRY_DELAY_MS and try once more.
 * Both attempts are logged distinctly so Vercel logs make the retry visible.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    console.warn(`[${label}] Attempt 1 failed — retrying in ${RETRY_DELAY_MS / 1000}s`, {
      reason: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    // Let any error from attempt 2 propagate to the caller
    return await fn();
  }
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

// ─── Coloring page ────────────────────────────────────────────────────────────

/**
 * Generates a B&W coloring-page image via recraft-v3.
 *
 * Accepts `coloringScene` — the concrete visual scene description from the
 * packet JSON (coloring_page.coloring_scene). This is the single source of
 * truth: the same text drives the image, the page title, and the instructions,
 * so all three always describe the same scene.
 *
 * Style: "digital_illustration" (base style). Comparison testing (2026-07-24)
 * showed this produces the cleanest coloring-book output with a strong
 * black-outline prompt — better than hand_drawn_outline, which returned
 * colored artwork despite the name.
 *
 * Sharp grayscale post-processing is applied as a safety net to strip any
 * residual color tinting before the image reaches the PDF.
 */
export async function generateColoringImage(
  coloringScene: string | null | undefined
): Promise<string | null> {
  if (!coloringScene?.trim()) {
    console.warn("[generateColoringImage] Skipping — coloring_scene is null or empty");
    return null;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateColoringImage] Skipping — REPLICATE_API_TOKEN not set");
    return null;
  }

  const scene = coloringScene.trim();
  const prompt =
    `black and white coloring book page for children featuring ${scene}, ` +
    `clean black outlines only, no color, no shading, no fill, ` +
    `pure white background, thick clean outlines with large open white regions for coloring, ` +
    `no pencils, crayons, or art supplies in the image, no crosshatching or gray fill, ` +
    `simple shapes, kid-friendly line art ready to color`;

  const startMs = Date.now();

  const attempt = async () => {
    const output = await withTimeout(
      getReplicate().run(RECRAFT_V3 as `${string}/${string}:${string}`, {
        input: {
          prompt,
          style: "digital_illustration",
          size: "1024x1024",
        },
      }),
      REPLICATE_TIMEOUT_MS,
      "generateColoringImage"
    );

    const url = extractUrl(output);
    if (!url) throw new Error("No URL in Replicate output");
    return url;
  };

  try {
    console.warn("[generateColoringImage] Attempt 1 starting");
    const url = await withRetry(attempt, "generateColoringImage");
    const elapsed = Date.now() - startMs;
    console.warn(`[generateColoringImage] Succeeded in ${elapsed}ms`);

    const imgResponse = await fetch(url);
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

    const base64 = grayBuffer.toString("base64");
    console.warn(`[generateColoringImage] Grayscale pass complete, total ${Date.now() - startMs}ms`);
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("[generateColoringImage] Both attempts failed", {
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
    });
    return null;
  }
}

// ─── Mascot image ─────────────────────────────────────────────────────────────

/**
 * Generates a colourful cartoon mascot image via flux-schnell.
 * Returns a base64 data URL, or null if both attempts fail.
 */
export async function generateMascotImage(
  mascotDescription: string | null | undefined
): Promise<string | null> {
  if (!mascotDescription?.trim()) {
    console.warn("[generateMascotImage] Skipping — mascot_description is null or empty");
    return null;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateMascotImage] Skipping — REPLICATE_API_TOKEN not set");
    return null;
  }

  const prompt =
    `${mascotDescription.trim()}, whimsical cartoon style, bright vibrant colors, ` +
    `simple clean lines, perfect for children's worksheet, white background, no text`;

  const startMs = Date.now();

  const attempt = async () => {
    const output = await withTimeout(
      getReplicate().run(FLUX_SCHNELL as `${string}/${string}`, {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 80,
        },
      }),
      REPLICATE_TIMEOUT_MS,
      "generateMascotImage"
    );

    const url = extractUrl(output);
    if (!url) throw new Error("No URL in Replicate output");
    return url;
  };

  try {
    console.warn("[generateMascotImage] Attempt 1 starting");
    const url = await withRetry(attempt, "generateMascotImage");
    const elapsed = Date.now() - startMs;
    console.warn(`[generateMascotImage] Succeeded in ${elapsed}ms`);

    try {
      return await fetchAsDataUrl(url);
    } catch (fetchErr) {
      // Return the direct URL as a fallback — it expires in ~1 hour but
      // that's long enough to render the PDF for the current session.
      console.error("[generateMascotImage] Base64 fetch failed — using direct URL", {
        message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      return url;
    }
  } catch (err) {
    console.error("[generateMascotImage] Both attempts failed", {
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
    });
    return null;
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
 */
export async function generateBothImages(
  mascotDescription: string | null | undefined,
  coloringScene?: string | null | undefined
): Promise<{ mascotImageUrl: string | null; coloringImageUrl: string | null }> {
  const [mascotImageUrl, coloringImageUrl] = await Promise.all([
    generateMascotImage(mascotDescription),
    generateColoringImage(coloringScene ?? mascotDescription),
  ]);

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

  return { mascotImageUrl, coloringImageUrl };
}

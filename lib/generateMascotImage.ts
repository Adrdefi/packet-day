// Server-side only. Generates mascot and coloring images via Replicate.
// Returns null on any failure so it never blocks packet delivery.
//
// ── Diagnosed skip conditions (2026-07-24) ──────────────────────────────────
// 1. SILENT: mascot_description null/empty — was returning null with no log,
//    making it impossible to diagnose in production. Now logs a warning.
// 2. TIMEOUT: sequential generation + 2 s sleep inside after() exceeded
//    Vercel Hobby's 10 s after() cap. Fixed by running both in parallel.
// 3. CRASH: missing SUPABASE_SERVICE_ROLE_KEY caused createServiceClient()
//    to throw inside after(), aborting before any DB write. Caller now guards
//    for this before invoking these functions.

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

const COLOR_WORDS = /\b(orange|blue|green|red|yellow|purple|brown|pink|gold|silver|white|black|rainbow)\b/gi;

function stripColors(description: string): string {
  return description.replace(COLOR_WORDS, "").replace(/\s{2,}/g, " ").trim();
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
  // Array output (most image models)
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) return null;
  // FileOutput.toString() returns the URL in replicate SDK v1+
  const url = String(first);
  if (!url.startsWith("http")) {
    console.error("[generateMascotImage] Unexpected output format — not a URL", {
      type: typeof first,
      preview: url.slice(0, 120),
    });
    return null;
  }
  return url;
}

/**
 * Generates a coloring-page B&W image from a mascot description.
 * Uses flux-schnell with heavy coloring-book prompt constraints.
 */
export async function generateColoringImage(
  mascotDescription: string | null | undefined
): Promise<string | null> {
  if (!mascotDescription?.trim()) {
    console.warn("[generateColoringImage] Skipping — mascot_description is null or empty");
    return null;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateColoringImage] Skipping — REPLICATE_API_TOKEN not set");
    return null;
  }

  const stripped = stripColors(mascotDescription.trim());
  const prompt =
    `children's coloring book line art of ${stripped}, ` +
    `thick bold black outlines, pure white background, no color, no shading, ` +
    `no grey, no gradients, flat white fills, simple clean cartoon outline style, ` +
    `black and white only, ready to color with crayons`;

  const startMs = Date.now();

  try {
    const output = await getReplicate().run("black-forest-labs/flux-schnell", {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 100,
      },
    });

    const url = extractUrl(output);
    if (!url) return null;

    const imgResponse = await fetch(url);
    const arrayBuffer = await imgResponse.arrayBuffer();

    const pngBuffer = await sharp(Buffer.from(arrayBuffer))
      .grayscale()
      .linear(1.8, -(128 * 1.8 - 128))
      .png()
      .toBuffer();

    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (err) {
    console.error("[generateColoringImage] Failed", {
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
    });
    return null;
  }
}

/**
 * Generates a mascot image from a description string.
 * Uses black-forest-labs/flux-schnell.
 * Returns a base64 data URL, or null if generation fails.
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

  try {
    const output = await getReplicate().run("black-forest-labs/flux-schnell", {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        output_quality: 80,
      },
    });

    const url = extractUrl(output);
    if (!url) return null;

    try {
      return await fetchAsDataUrl(url);
    } catch (fetchErr) {
      // URL fetch failed — return the direct Replicate URL as a last resort.
      // Note: Replicate URLs expire after ~1 hour.
      console.error("[generateMascotImage] Base64 fetch failed — using direct URL", {
        message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      return url;
    }
  } catch (err) {
    console.error("[generateMascotImage] Exception", {
      message: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startMs,
      status: (err as { status?: number }).status,
    });
    return null;
  }
}

/**
 * Generates mascot and coloring images in parallel.
 * Replaces the old sequential pattern (mascot → 2 s sleep → coloring)
 * which consistently timed out on Vercel Hobby after() tasks.
 */
export async function generateBothImages(
  mascotDescription: string | null | undefined
): Promise<{ mascotImageUrl: string | null; coloringImageUrl: string | null }> {
  const [mascotImageUrl, coloringImageUrl] = await Promise.all([
    generateMascotImage(mascotDescription),
    generateColoringImage(mascotDescription),
  ]);
  return { mascotImageUrl, coloringImageUrl };
}

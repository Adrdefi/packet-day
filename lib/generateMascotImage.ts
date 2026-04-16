// Server-side only. Generates a mascot image via Replicate and returns
// a public URL. Returns null on any failure so it never blocks packet delivery.

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

/**
 * Strips common color words from a description string.
 * Used to produce a neutral description for B&W coloring page generation.
 */
function stripColors(description: string): string {
  return description.replace(COLOR_WORDS, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Generates a B&W coloring page image from a mascot description.
 *
 * Uses recraft-ai/recraft-v3 with style="vector_illustration" instead of
 * flux-schnell. Flux Schnell does not reliably produce true B&W line art —
 * it tends to output shaded, colored illustrations regardless of prompt wording.
 * Recraft v3's vector_illustration style is purpose-built for clean outline art
 * and responds well to coloring-book prompts.
 *
 * Note: recraft-v3 uses width/height (not aspect_ratio) and does not accept
 * a negative_prompt parameter.
 */
export async function generateColoringImage(
  mascotDescription: string | null | undefined
): Promise<string | null> {
  if (!mascotDescription?.trim()) {
    console.log("[generateColoringImage] Skipping — no mascot description provided");
    return null;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateColoringImage] REPLICATE_API_TOKEN not set — skipping");
    return null;
  }

  const stripped = stripColors(mascotDescription.trim());
  const prompt =
    `children's coloring book line art of ${stripped}, ` +
    `thick bold black outlines, pure white background, no color, no shading, ` +
    `no grey, no gradients, flat white fills, simple clean cartoon outline style, ` +
    `black and white only, ready to color with crayons`;

  console.log("[generateColoringImage] Starting generation", {
    promptPreview: prompt.slice(0, 120),
  });

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

    const first = Array.isArray(output) ? output[0] : output;
    if (!first) {
      console.error("[generateColoringImage] Output was empty");
      return null;
    }

    const url = String(first);
    if (!url.startsWith("http")) {
      console.error("[generateColoringImage] Output is not a URL");
      return null;
    }

    console.log("[generateColoringImage] Fetching image", { url, elapsedMs: Date.now() - startMs });

    const imgResponse = await fetch(url);
    const arrayBuffer = await imgResponse.arrayBuffer();

    const pngBuffer = await sharp(Buffer.from(arrayBuffer))
      .grayscale()
      .linear(1.8, -(128 * 1.8 - 128))
      .png()
      .toBuffer();

    console.log("[generateColoringImage] Done", { byteLength: pngBuffer.byteLength, elapsedMs: Date.now() - startMs });
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
 * Uses black-forest-labs/flux-schnell (fast, cheap, great for cartoons).
 * Returns a public image URL, or null if generation fails.
 */
export async function generateMascotImage(
  mascotDescription: string | null | undefined
): Promise<string | null> {
  if (!mascotDescription?.trim()) {
    console.log("[generateMascotImage] Skipping — no mascot description provided");
    return null;
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateMascotImage] REPLICATE_API_TOKEN not set — skipping image generation");
    return null;
  }

  const prompt =
    `${mascotDescription.trim()}, whimsical cartoon style, bright vibrant colors, ` +
    `simple clean lines, perfect for children's worksheet, white background, no text`;

  console.log("[generateMascotImage] Starting generation", {
    promptLength: prompt.length,
    promptPreview: prompt.slice(0, 120),
    tokenPresent: !!process.env.REPLICATE_API_TOKEN,
  });

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

    const elapsedMs = Date.now() - startMs;

    console.log("[generateMascotImage] Replicate raw output", {
      elapsedMs,
      outputType: typeof output,
      isArray: Array.isArray(output),
      arrayLength: Array.isArray(output) ? output.length : undefined,
      // Log the raw value safely — truncate if it's an unexpected giant string
      rawValue: Array.isArray(output)
        ? output.map((v) => String(v).slice(0, 200))
        : String(output).slice(0, 200),
    });

    // SDK v1 returns FileOutput[] for image models. FileOutput.toString() returns the URL.
    const first = Array.isArray(output) ? output[0] : output;
    if (!first) {
      console.error("[generateMascotImage] Output was empty or null", { output });
      return null;
    }

    const url = String(first);

    if (!url.startsWith("http")) {
      console.error("[generateMascotImage] Output is not a URL", {
        urlPreview: url.slice(0, 200),
      });
      return null;
    }

    console.log("[generateMascotImage] Success — fetching as base64", { url, elapsedMs });

    try {
      const imgResponse = await fetch(url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const contentType = imgResponse.headers.get("content-type") ?? "image/png";
      const dataUrl = `data:${contentType};base64,${base64}`;
      console.log("[generateMascotImage] Converted to base64 data URL", { contentType, byteLength: arrayBuffer.byteLength });
      console.log("[generateMascotImage] Base64 data URL created", { length: dataUrl.length, preview: dataUrl.slice(0, 50) });
      return dataUrl;
    } catch (fetchErr) {
      console.error("[generateMascotImage] Failed to fetch image as base64 — returning original URL", {
        message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      return url;
    }
  } catch (err) {
    const elapsedMs = Date.now() - startMs;
    console.error("[generateMascotImage] Exception after", elapsedMs, "ms", {
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
      status: (err as { status?: number }).status,
      // Replicate ApiError has a response body
      responseBody: (err as { response?: { body?: unknown } }).response?.body,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : undefined,
    });
    return null;
  }
}

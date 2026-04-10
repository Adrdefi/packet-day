// Server-side only. Generates a mascot image via Replicate and returns
// a public URL. Returns null on any failure so it never blocks packet delivery.

import Replicate from "replicate";

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

/**
 * Generates a mascot image from a description string.
 * Uses black-forest-labs/flux-schnell (fast, cheap, great for cartoons).
 * Returns a public image URL, or null if generation fails.
 */
export async function generateMascotImage(
  mascotDescription: string | null | undefined
): Promise<string | null> {
  if (!mascotDescription?.trim()) return null;
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generateMascotImage] REPLICATE_API_TOKEN not set — skipping image generation");
    return null;
  }

  try {
    const prompt =
      `${mascotDescription.trim()}, whimsical cartoon style, bright vibrant colors, ` +
      `simple clean lines, perfect for children's worksheet, white background, no text`;

    const output = await getReplicate().run("black-forest-labs/flux-schnell", {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "webp",
        output_quality: 80,
        go_fast: true,
      },
    });

    // SDK v1 returns FileOutput[] for image models. FileOutput.toString() returns the URL.
    const first = Array.isArray(output) ? output[0] : output;
    if (!first) return null;

    const url = String(first);
    return url || null;
  } catch (err) {
    console.error(
      "[generateMascotImage] Failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

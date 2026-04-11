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
        output_format: "webp",
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
      const contentType = imgResponse.headers.get("content-type") ?? "image/webp";
      console.log("[generateMascotImage] Converted to base64 data URL", { contentType, byteLength: arrayBuffer.byteLength });
      return `data:${contentType};base64,${base64}`;
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

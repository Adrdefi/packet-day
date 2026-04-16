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
    console.warn("[generateColoringImage] REPLICATE_API_TOKEN not set — skipping image generation");
    return null;
  }

  const stripped = stripColors(mascotDescription.trim());
  const prompt =
    `children's coloring book page outline drawing of ${stripped}, thick black outlines on pure white background, ` +
    `no color, no shading, no gray fills, simple clean line art, ready to color in`;

  console.log("[generateColoringImage] Starting generation", {
    model: "recraft-ai/recraft-v3",
    promptLength: prompt.length,
    promptPreview: prompt.slice(0, 120),
  });

  const startMs = Date.now();
  const MAX_ATTEMPTS = 3;
  const RATE_LIMIT_DELAY_MS = 12_000;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const output = await getReplicate().run("recraft-ai/recraft-v3", {
        input: {
          prompt,
          style: "realistic_image/b_and_w",
          width: 1024,
          height: 1024,
          num_outputs: 1,
        },
      });

      const elapsedMs = Date.now() - startMs;

      console.log("RECRAFT RAW OUTPUT:", JSON.stringify(output));
      console.log("[generateColoringImage] Replicate raw output", {
        attempt,
        elapsedMs,
        outputType: typeof output,
        isArray: Array.isArray(output),
        arrayLength: Array.isArray(output) ? output.length : undefined,
        rawValue: Array.isArray(output)
          ? output.map((v) => String(v).slice(0, 200))
          : String(output).slice(0, 200),
      });

      const first = Array.isArray(output) ? output[0] : output;
      if (!first) {
        console.error("[generateColoringImage] Output was empty or null", { output });
        return null;
      }

      const url = String(first);

      if (!url.startsWith("http")) {
        console.error("[generateColoringImage] Output is not a URL", {
          urlPreview: url.slice(0, 200),
        });
        return null;
      }

      console.log("[generateColoringImage] Success — fetching and converting to PNG", { url, elapsedMs });

      try {
        const imgResponse = await fetch(url);
        const arrayBuffer = await imgResponse.arrayBuffer();
        // Recraft v3 returns webp. React-PDF only supports PNG and JPEG.
        // Convert to PNG via sharp before encoding as base64.
        const pngBuffer = await sharp(Buffer.from(arrayBuffer))
          .grayscale()
          .normalise()
          .threshold(190)
          .png()
          .toBuffer();
        const base64 = pngBuffer.toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;
        console.log("[generateColoringImage] Converted webp to PNG data URL", { byteLength: pngBuffer.byteLength });
        return dataUrl;
      } catch (fetchErr) {
        console.error("[generateColoringImage] Failed to fetch/convert image — returning original URL", {
          message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        });
        return url;
      }
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        status === 429 ||
        message.toLowerCase().includes("throttled") ||
        message.toLowerCase().includes("too many requests");

      if (!isRateLimit) {
        // Non-rate-limit error — fail immediately, no retry
        const elapsedMs = Date.now() - startMs;
        console.error("[generateColoringImage] Non-retryable exception after", elapsedMs, "ms", {
          attempt,
          name: err instanceof Error ? err.name : undefined,
          message,
          status,
          responseBody: (err as { response?: { body?: unknown } }).response?.body,
          stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : undefined,
        });
        return null;
      }

      console.warn("[generateColoringImage] Rate limited — waiting 12s before retry", {
        attempt,
        attemptsRemaining: MAX_ATTEMPTS - attempt,
        status,
        message,
      });

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }
  }

  // All attempts exhausted
  const elapsedMs = Date.now() - startMs;
  console.error("[generateColoringImage] All", MAX_ATTEMPTS, "attempts failed after", elapsedMs, "ms", {
    lastMessage: lastErr instanceof Error ? lastErr.message : String(lastErr),
  });
  return null;
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

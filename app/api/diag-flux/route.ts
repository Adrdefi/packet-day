// TEMPORARY DIAGNOSTIC ROUTE — DELETE AFTER USE
// Tests whether the pinned flux-schnell version responds on production.
// Returns only status/timing/error. Never returns the token or image data.

import { NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";
export const maxDuration = 90;

const FLUX_SCHNELL =
  "black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e";

export async function GET() {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "REPLICATE_API_TOKEN not set in this environment" },
      { status: 500 }
    );
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const startMs = Date.now();

  try {
    const output = await replicate.run(
      FLUX_SCHNELL as `${string}/${string}:${string}`,
      {
        input: {
          prompt: "a simple red circle on a white background",
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          num_inference_steps: 1,
        },
      }
    );

    const elapsedMs = Date.now() - startMs;
    const first = Array.isArray(output) ? output[0] : output;

    // Capture the type and a safe prefix of the URL — never the full image data
    let outputKind = "unknown";
    let urlPrefix: string | null = null;
    if (first) {
      if (typeof first === "object" && typeof (first as { url?: unknown }).url === "function") {
        outputKind = "FileOutput";
        const u = (first as { url: () => URL }).url().toString();
        urlPrefix = u.slice(0, 50) + "…";
      } else {
        const s = String(first);
        outputKind = s.startsWith("http") ? "url-string" : "unexpected-" + typeof first;
        urlPrefix = s.slice(0, 50) + "…";
      }
    }

    return NextResponse.json({
      ok: true,
      model: FLUX_SCHNELL,
      elapsedMs,
      outputLength: Array.isArray(output) ? output.length : 1,
      outputKind,
      urlPrefix,
    });
  } catch (err) {
    const elapsedMs = Date.now() - startMs;
    return NextResponse.json(
      {
        ok: false,
        model: FLUX_SCHNELL,
        elapsedMs,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

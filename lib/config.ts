/** Central config — import from here instead of hardcoding strings in route files. */

import { SITE_URL } from "@/lib/site";

export const MODEL = "claude-opus-5-5";

/**
 * Models that still accept `temperature` and fit a packet in the old
 * max_tokens caps. Newer models (Sonnet 5, Opus 5.5, ...) reject sampling
 * params with a 400, and their thinking tokens count against max_tokens,
 * so they get no temperature and a larger cap.
 */
export const MODELS_WITH_TEMPERATURE = new Set(["claude-sonnet-4-6"]);
export const THINKING_MODEL_MAX_TOKENS = 16000;

// ─── AI prices (USD) ──────────────────────────────────────────────────────────
// Used only to estimate packet_ai_usage.est_cost_usd — not billing truth.
// Claude prices are per million tokens, from platform.claude.com/docs pricing
// (checked 2026-09-22). cacheRead/cacheWrite are the 5-minute cache rates.

export interface ClaudePrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const CLAUDE_PRICES_PER_MTOK: Record<string, ClaudePrice> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

// Per image, keyed by Replicate "owner/name" (no version hash). From each
// model's replicate.com page (checked 2026-09-28), at the settings
// lib/generateMascotImage.ts sends. flux-schnell and recraft-v3 are the
// fallbacks and stay listed so a fallback's attempts are still priced.
export const IMAGE_PRICES_PER_IMAGE: Record<string, number> = {
  // $0.015 per run + $0.015 per output megapixel, at 1 MP (~1.05 MP).
  "black-forest-labs/flux-2-pro": 0.031,
  // Quality "low" at 1024x1024. Medium is $0.047 and high $0.128; update
  // this if the quality setting changes.
  "openai/gpt-image-2": 0.012,
  "black-forest-labs/flux-schnell": 0.003,
  "recraft-ai/recraft-v3": 0.04,
};

/**
 * Base URL for building absolute redirect links (e.g. Stripe success/cancel
 * URLs). Prefers the request's own origin so local dev and Vercel preview
 * deploys redirect back to themselves instead of production, where no
 * session cookie exists.
 *
 * Accepts any Headers-like object so it works both for a Route Handler's
 * `req.headers` (POST requests, which normally carry an `origin` header)
 * and a Server Component's `headers()` (plain GET navigations, which
 * usually don't — falls back to `host` + `x-forwarded-proto` there).
 */
export function getBaseUrl(headers: Headers): string {
  const origin = headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const host = headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL).replace(/\/$/, "");
}

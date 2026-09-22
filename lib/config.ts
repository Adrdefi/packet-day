/** Central config — import from here instead of hardcoding strings in route files. */

import { SITE_URL } from "@/lib/site";

export const MODEL = "claude-sonnet-4-6";

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

// Per image, keyed by Replicate "owner/name" (no version hash). From
// replicate.com/pricing (checked 2026-09-22).
export const IMAGE_PRICES_PER_IMAGE: Record<string, number> = {
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

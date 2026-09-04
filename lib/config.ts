/** Central config — import from here instead of hardcoding strings in route files. */

import type { NextRequest } from "next/server";

export const MODEL = "claude-sonnet-4-6";

/**
 * Base URL for building absolute redirect links (e.g. Stripe success/cancel
 * URLs). Prefers the request's own origin so local dev and Vercel preview
 * deploys redirect back to themselves instead of production, where no
 * session cookie exists.
 */
export function getBaseUrl(req: NextRequest): string {
  const base =
    req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://packetday.com";
  return base.replace(/\/$/, "");
}

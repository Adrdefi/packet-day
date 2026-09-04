/** Central config — import from here instead of hardcoding strings in route files. */

export const MODEL = "claude-sonnet-4-6";

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

  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://packetday.com").replace(/\/$/, "");
}

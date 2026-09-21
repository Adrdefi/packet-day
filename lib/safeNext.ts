/**
 * Validates a `next`-style redirect target — the one shared check every
 * route that reads a `next`/`next_path` value must run before redirecting
 * to it. Accepts only a same-site relative path: must start with a single
 * "/", never "//" or "/\" (both of which some browsers still treat as
 * protocol-relative, i.e. an open redirect to another host), and never an
 * absolute URL with its own scheme (those don't start with "/" at all, so
 * the leading-slash check alone already rejects them).
 *
 * A query string and fragment on an otherwise-safe path — e.g.
 * "/dashboard?upgrade=yearly&utm_source=email" — pass through untouched;
 * this only judges the leading path shape, not what follows it.
 *
 * Additional hardening beyond the leading-character checks above:
 * - Rejects a backslash anywhere in the value, not just a leading one —
 *   there's no legitimate reason an internal path needs one.
 * - Rejects whitespace or control characters anywhere (tab, newline, CR,
 *   any other char below code 32, and DEL/127). This matters beyond
 *   cosmetics: URL parsers strip ASCII tab/newline/CR from a string before
 *   resolving it, so "/\t/evil.com" is exactly how a value that looks
 *   same-site on the page becomes the protocol-relative "//evil.com" once
 *   an actual URL parser gets it — rejecting the raw control character
 *   closes that before it can happen.
 * - As a final, authoritative check: resolves the value against the site's
 *   real origin with `new URL()` and confirms the result's origin didn't
 *   drift. This is the catch-all for any bypass the checks above didn't
 *   anticipate — if the earlier checks let something through that a real
 *   URL parser would still treat as cross-origin, this still catches it.
 *
 * Returns the value unchanged if safe, or null otherwise, so a call site
 * can write `safeNext(raw) ?? fallback` instead of a separate type guard.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;
  if (/[\s\x00-\x1F\x7F]/.test(value)) return null;

  try {
    const resolved = new URL(value, "https://www.packetday.com");
    if (resolved.origin !== "https://www.packetday.com") return null;
  } catch {
    return null;
  }

  return value;
}

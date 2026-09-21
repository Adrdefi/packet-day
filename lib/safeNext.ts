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
 * Returns the value unchanged if safe, or null otherwise, so a call site
 * can write `safeNext(raw) ?? fallback` instead of a separate type guard.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.startsWith("/\\")) return null;
  return value;
}

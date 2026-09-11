/**
 * A same-origin relative path only — rejects absolute URLs
 * ("https://evil.com/..."), protocol-relative ones ("//evil.com/..."), and
 * the backslash variant browsers sometimes still treat as protocol-relative
 * ("/\evil.com"), so `next` can't be turned into an open redirect.
 */
export function isSafeNextPath(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}

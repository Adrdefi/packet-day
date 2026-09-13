// Whether a packets.mascot_image_url value is safe to render as an <img> src
// — never a base64 "data:" blob (up to ~900KB of inline text) and never a
// temporary replicate.delivery link (expires, and was never meant to be a
// permanent asset). Shared by the public share page and the packet OG card
// route so both apply the exact same three rules.

export function resolveMascotUrl(url: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith("https://")) return null;
  if (url.includes("replicate.delivery")) return null;
  return url;
}

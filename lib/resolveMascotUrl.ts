import { isHostedPacketImageUrl } from "@/lib/hostedImageUrl";

// Whether a packets.mascot_image_url value is safe to render as an <img> src
// — only an image in Packet Day's own Storage buckets. That rules out a
// base64 "data:" blob (up to ~900KB of inline text) and a temporary
// replicate.delivery link (expires, and was never meant to be a permanent
// asset). Shared by the public share page, the packet OG card route, the
// dashboard list and the packet result view so all apply the same rule.

export function resolveMascotUrl(url: string | null): string | null {
  if (!url) return null;
  return isHostedPacketImageUrl(url) ? url : null;
}

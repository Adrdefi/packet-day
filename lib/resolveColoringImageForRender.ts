// Resolves a packets.coloring_image_url column value into something safe to
// hand PacketPDF as its coloringImageUrl prop, for the render paths that read
// the column directly (app/api/generate-pdf's cache-miss path,
// app/api/dev-render-packet, scripts/sweep-packets.ts).
//
// Mirrors lib/resolveMascotImageForRender.ts exactly. New packets store a
// public packet-coloring-pages URL (uploaded by app/api/generate-packet);
// older rows, and any packet whose upload failed, still hold base64. Both
// shapes are handled below. See resolveMascotImageForRender.ts's header for the full
// rationale (react-pdf's own image loader fetches an https src itself at
// render time and swallows a failed fetch with a bare console.warn, no
// trace anywhere — fetching here instead makes a failure visible in our own
// logs and keeps the renderer's own network dependency at zero).
//
// Single attempt, no retry — a transient failure here just means "no
// coloring image on this render," not a reason to slow down a download or a
// fleet sweep.

export async function resolveColoringImageForRender(
  coloringImageUrl: string | null,
  packetId: string
): Promise<string | null> {
  if (!coloringImageUrl) return null;

  // Old rows hold base64 directly — already in memory, nothing to fetch.
  if (coloringImageUrl.startsWith("data:")) return coloringImageUrl;

  if (!coloringImageUrl.startsWith("https://")) {
    console.error(
      "[resolveColoringImageForRender] Unrecognized coloring_image_url shape — skipping",
      { packetId, preview: coloringImageUrl.slice(0, 60) }
    );
    return null;
  }

  try {
    const response = await fetch(coloringImageUrl);
    if (!response.ok) {
      console.error("[resolveColoringImageForRender] Coloring fetch failed", {
        packetId,
        status: response.status,
      });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = response.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error("[resolveColoringImageForRender] Coloring fetch threw", {
      packetId,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

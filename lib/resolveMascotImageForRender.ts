// Resolves a packets.mascot_image_url column value into something safe to
// hand PacketPDF as its mascotImageUrl prop, for the render paths that read
// the column directly (app/api/generate-pdf's cache-miss path,
// app/api/dev-render-packet, scripts/sweep-packets.ts).
//
// Since the mascot hosting fix, that column can hold a short https:// URL
// instead of a base64 data URL. react-pdf's own image loader fetches an
// https src itself at render time — and if that fetch fails, it's swallowed
// inside @react-pdf/layout with a bare console.warn and the image is just
// omitted, no error, no crash, no trace anywhere (see CLAUDE.md's react-pdf
// gotchas). Fetching here instead, before react-pdf ever sees the value,
// means a failure is visible in our own logs and the renderer only ever
// gets bytes already in memory — never makes a network call of its own.
//
// Same fetch-and-base64 shape as fetchAsDataUrl in lib/generateMascotImage.ts,
// kept separate rather than imported/exported from there: that file's
// version fetches a fresh Replicate output during generation, this one
// re-fetches an already-hosted Storage object at render time — different
// callers, different failure semantics (this one is caller-facing and must
// never throw), not worth coupling.
//
// Single attempt, no retry — a transient failure here just means "no mascot
// on this render," not a reason to slow down a download or a fleet sweep.

export async function resolveMascotImageForRender(
  mascotImageUrl: string | null,
  packetId: string
): Promise<string | null> {
  if (!mascotImageUrl) return null;

  // Old rows hold base64 directly — already in memory, nothing to fetch.
  if (mascotImageUrl.startsWith("data:")) return mascotImageUrl;

  if (!mascotImageUrl.startsWith("https://")) {
    console.error(
      "[resolveMascotImageForRender] Unrecognized mascot_image_url shape — skipping",
      { packetId, preview: mascotImageUrl.slice(0, 60) }
    );
    return null;
  }

  try {
    const response = await fetch(mascotImageUrl);
    if (!response.ok) {
      console.error("[resolveMascotImageForRender] Mascot fetch failed", {
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
    console.error("[resolveMascotImageForRender] Mascot fetch threw", {
      packetId,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

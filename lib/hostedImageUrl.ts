// Packet images are only ever loaded from Packet Day's own public Storage
// buckets. Shared by the render-time fetchers
// (lib/resolveMascotImageForRender.ts, lib/resolveColoringImageForRender.ts)
// and lib/resolveMascotUrl.ts, which every page showing a mascot uses.

const HOSTED_IMAGE_BUCKETS = ["packet-mascots", "packet-coloring-pages"];

export function isHostedPacketImageUrl(url: string): boolean {
  // Read literally so Next.js inlines it in client bundles too.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;

  let parsed: URL;
  let storage: URL;
  try {
    parsed = new URL(url);
    storage = new URL(base);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" || parsed.origin !== storage.origin) return false;
  return HOSTED_IMAGE_BUCKETS.some((bucket) =>
    parsed.pathname.startsWith(`/storage/v1/object/public/${bucket}/`)
  );
}

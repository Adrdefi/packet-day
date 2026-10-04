export type CopyLinkResult = "copied" | "shared" | "cancelled" | "failed";

/**
 * Copies a share link. If the clipboard is blocked (in-app browsers, older
 * phones, a page that isn't focused), phones fall back to the native share
 * sheet. "failed" means neither worked, so the caller should show the link
 * for the parent to copy by hand.
 */
export async function copyLink(url: string, title: string): Promise<CopyLinkResult> {
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    // fall through to the share sheet
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }

  return "failed";
}

"use client";

/**
 * Shown when copyLink() couldn't copy or share: the link, already selected,
 * so the parent can copy it by hand.
 */
export default function ManualCopyLink({ url }: { url: string }) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-white p-3 text-left" role="status">
      <p className="text-xs text-dark/70 mb-2">
        We couldn&apos;t copy that for you. Here&apos;s the link, press and hold to copy it.
      </p>
      <input
        type="text"
        readOnly
        value={url}
        aria-label="Packet share link"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-sage"
      />
    </div>
  );
}

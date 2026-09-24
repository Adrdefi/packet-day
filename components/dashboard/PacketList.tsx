"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Child, Packet } from "@/types";
import { resolveMascotUrl } from "@/lib/resolveMascotUrl";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Single packet row ────────────────────────────────────────────────────────

function PacketRow({
  packet,
  childEmoji,
  onDownloadError,
}: {
  packet: Packet;
  childEmoji: string;
  onDownloadError: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  async function copyShareLink() {
    const url = `${window.location.origin}/packets/${packet.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text manually isn't needed in modern browsers, silently ignore
    }
  }

  async function downloadPDF() {
    if (downloading) return; // one render in flight per row at a time
    setDownloading(true);
    try {
      // iOS Safari doesn't support the `download` attribute on anchor tags.
      // Detect iOS and navigate directly to the API URL — bypasses the blob
      // entirely and lets Safari open the PDF natively.
      if (isIOS) {
        window.location.href = `/api/generate-pdf?packetId=${packet.id}`;
      } else {
        const res = await fetch(`/api/generate-pdf?packetId=${packet.id}`);
        if (!res.ok) throw new Error("PDF generation failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const filename =
          res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ??
          "packet.pdf";
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        // Delay revoke so the browser has time to open it
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch {
      onDownloadError("Couldn't build that PDF right now. Give it another try in a moment.");
    } finally {
      setDownloading(false);
    }
  }

  // Hosted mascot only (never a base64 blob or an expired replicate link),
  // falling back to the child's emoji.
  const mascotUrl = resolveMascotUrl(packet.mascot_image_url);

  const summary = (
    <>
      {/* Mascot thumbnail, or the child's emoji */}
      {mascotUrl ? (
        <Image
          src={mascotUrl}
          alt=""
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center text-lg shrink-0">
          {childEmoji}
        </div>
      )}

      {/* Packet info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-dark truncate leading-snug">
          {packet.child_name}{" "}
          <span className="text-muted font-normal">· {packet.theme}</span>
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatDate(packet.created_at)}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0">
      {/* Tapping the row opens the packet's result screen. The PDF and Share
          buttons sit outside the link so they keep working on their own.
          A packet whose generation never finished has nothing to show. */}
      {packet.generated_content ? (
        <Link
          href={`/dashboard/packets/${packet.id}`}
          className="flex flex-1 min-w-0 items-center gap-3 -my-1.5 py-1.5 rounded-lg hover:bg-sage/5 transition-colors"
        >
          {summary}
        </Link>
      ) : (
        <div className="flex flex-1 min-w-0 items-center gap-3">{summary}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={downloadPDF}
          disabled={downloading}
          title={isIOS ? "Opens in Safari. Tap share to save" : "Download PDF"}
          className="text-xs font-semibold text-sage border border-sage/30 bg-sage/5 hover:bg-sage/15 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2.5 rounded-lg transition-colors"
        >
          {downloading ? "Building..." : isIOS ? "Open PDF" : "PDF ↓"}
        </button>
        <button
          onClick={copyShareLink}
          className="text-xs font-semibold text-muted border border-border hover:border-sage/50 hover:text-sage px-3 py-2.5 rounded-lg transition-colors min-w-[60px]"
        >
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

interface PacketListProps {
  packets: Packet[];
  kids: Child[];
}

export default function PacketList({ packets, kids }: PacketListProps) {
  const { toasts, toast, dismiss } = useToast();

  if (packets.length === 0) {
    const firstChild = kids[0];
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm p-10 text-center">
        <div className="text-5xl mb-4">☀️</div>
        <p className="font-display text-lg font-bold text-dark mb-2">
          Ready when you are!
        </p>
        <p className="text-sm text-muted leading-relaxed mb-6">
          {firstChild
            ? <>Generate {firstChild.name}&apos;s first packet and it&apos;ll show up here.</>
            : "Generate your first packet and it'll show up here."}
        </p>
        {firstChild && (
          <a
            href={`/generate?child=${firstChild.id}`}
            className="inline-block bg-sage text-cream font-bold text-sm py-3 px-6 rounded-xl hover:bg-sage-dark transition-colors"
          >
            Generate Today&apos;s Packet →
          </a>
        )}
      </div>
    );
  }

  const childMap = new Map(kids.map((c) => [c.id, c]));

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-5">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {packets.map((packet) => {
        const child = packet.child_id
          ? childMap.get(packet.child_id)
          : undefined;
        return (
          <PacketRow
            key={packet.id}
            packet={packet}
            childEmoji={child?.avatar_emoji ?? "📦"}
            onDownloadError={toast.error}
          />
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Child, Packet } from "@/types";

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
}: {
  packet: Packet;
  childEmoji: string;
}) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0">
      {/* Child avatar */}
      <div className="w-9 h-9 rounded-full bg-sage/10 flex items-center justify-center text-lg shrink-0">
        {childEmoji}
      </div>

      {/* Packet info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-dark truncate leading-snug">
          {packet.child_name}{" "}
          <span className="text-muted font-normal">— {packet.theme}</span>
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatDate(packet.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {packet.pdf_url && (
          <a
            href={packet.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sage border border-sage/30 bg-sage/5 hover:bg-sage/15 px-3 py-1.5 rounded-lg transition-colors"
          >
            PDF ↓
          </a>
        )}
        <button
          onClick={copyShareLink}
          className="text-xs font-semibold text-muted border border-border hover:border-sage/50 hover:text-sage px-3 py-1.5 rounded-lg transition-colors min-w-[60px]"
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
  children: Child[];
}

export default function PacketList({ packets, children }: PacketListProps) {
  if (packets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm p-10 text-center">
        <div className="text-5xl mb-4">📦</div>
        <p className="font-display text-lg font-bold text-dark mb-2">
          Your first packet is waiting!
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Pick a child on the left to get started.
        </p>
      </div>
    );
  }

  const childMap = new Map(children.map((c) => [c.id, c]));

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-5">
      {packets.map((packet) => {
        const child = packet.child_id
          ? childMap.get(packet.child_id)
          : undefined;
        return (
          <PacketRow
            key={packet.id}
            packet={packet}
            childEmoji={child?.avatar_emoji ?? "📦"}
          />
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import UpgradeModal from "@/components/UpgradeModal";
import { nextFreeDateLabel } from "@/lib/nextFreeDate";
import { possessive } from "@/lib/possessive";

interface PostPacketNudgeProps {
  childName?: string | null;
}

// UpgradeModal (capped mode) needs a "your next free packet arrives {date}"
// display string. That's always the first of the month AFTER the current
// one — the same math as lib/nextFreeDate.ts's nextFreeDateLabel, fed the
// current month's first day instead of a fetched packets_reset_date, since
// this component intentionally never reads usage state (see the isPaid-only
// gating below).
function currentMonthFirstDayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/**
 * Quiet inline nudge for the reserved slot in app/generate/page.tsx's
 * ResultView, between the activity cards and the social share row. Gated
 * on a fresh server read (GET /api/plans, session-bound) rather than the
 * subscriptionStatus already held in GenerateContent's client state, so a
 * stale client value can never show this to a paying user.
 */
export default function PostPacketNudge({ childName }: PostPacketNudgeProps) {
  // null = still checking; false = paid, or the check failed, or errored —
  // never render; true = confirmed free tier, safe to render.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const trackedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/plans")
      .then((res) => {
        if (!res.ok) throw new Error(`plans fetch failed: ${res.status}`);
        return res.json() as Promise<{ isPaid: boolean }>;
      })
      .then((data) => {
        if (!cancelled) setVisible(!data.isPaid);
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fires once, only after the server check confirms free tier — never on
  // a re-render, never for a paid user (visible never becomes true there).
  useEffect(() => {
    if (visible && !trackedRef.current) {
      trackedRef.current = true;
      track("upgrade_nudge_seen", { source: "post_packet" });
    }
  }, [visible]);

  if (!visible) return null;

  const heading = childName
    ? `That's ${possessive(childName)} packet for this month.`
    : "That's this month's packet.";

  return (
    <>
      <div className="rounded-2xl border border-sage/20 bg-sage/5 p-5 text-center mb-10">
        <h3 className="font-display text-lg font-bold text-dark mb-1.5">{heading}</h3>
        <p className="text-sm text-muted leading-relaxed mb-3">
          Unlimited means you can make another tomorrow, and the next day, for every kid in your house.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-sm font-semibold text-sage hover:text-sage-dark underline underline-offset-2 transition-colors"
        >
          See Unlimited
        </button>
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        source="post_packet"
        capped
        childName={childName}
        defaultPlan="yearly"
        nextFreeDate={nextFreeDateLabel(currentMonthFirstDayUTC())}
      />
    </>
  );
}

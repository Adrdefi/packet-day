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
 * Quiet inline upgrade card for app/generate/page.tsx's ResultView, directly
 * under the download button. ResultView only renders this once a fresh
 * server read (GET /api/plans, session-bound) confirms the user is free tier
 * AND has used this month's packet, never from GenerateContent's client
 * state, so a stale client value can never show this to a paying user.
 */
export default function PostPacketNudge({ childName }: PostPacketNudgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const trackedRef = useRef(false);

  // Fires once per mount. The parent only mounts this after the server
  // check above, so it never fires for a paid user.
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      track("upgrade_nudge_seen", { source: "post_packet" });
    }
  }, []);

  const heading = childName
    ? `That's ${possessive(childName)} packet for this month.`
    : "That's this month's packet.";

  return (
    <>
      <div className="w-full max-w-md rounded-2xl border border-sage/20 bg-sage/5 p-5 text-center">
        <h3 className="font-display text-lg font-bold text-dark mb-1.5">{heading}</h3>
        <p className="text-sm text-muted leading-relaxed mb-4">
          Unlimited means you can make another tomorrow, and the next day, for every kid in your house.
        </p>
        {/* Honey, not sage: this sits right under the green Download button
            and has to read as the second action, not a second Download. */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full bg-honey text-dark font-bold px-6 py-3 rounded-xl hover:bg-honey-dark transition-colors text-sm shadow-sm"
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

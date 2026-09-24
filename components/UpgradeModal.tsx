"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { useUpgradeCheckout } from "@/hooks/useUpgradeCheckout";
import type { EmailKey } from "@/lib/emailKeys";

// The trailing variant is set only when a deep link arrived with a
// validated `?src=` email key (see UpgradeModalController) — it's what
// lets checkout_started attribute a conversion back to the email that sent
// it, e.g. "cap_followup_email".
type Source =
  | "cap_hit"
  | "upgrade_link"
  | "deep_link"
  | "post_packet"
  | "child_card"
  | "add_child"
  | "generate_panel"
  | `${EmailKey}_email`;
type Plan = "yearly" | "monthly";

// Shown when the account has no hosted mascot yet (the real cover of the
// Oliver sample packet, the same image the homepage hero uses).
const FALLBACK_PICTURE = "/landing/oliver/cover.webp";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  source: Source;
  capped: boolean;
  childName?: string | null;
  /** Picks whose latest mascot to show; the account's latest when absent. */
  childId?: string | null;
  /** "children": opened from Add Another Child on a free account. */
  reason?: "packets" | "children";
  defaultPlan?: Plan;
  /** Display string, e.g. "Oct 1" — see lib/nextFreeDate.ts. */
  nextFreeDate: string;
}

interface PlanPriceIds {
  monthlyPriceId: string;
  yearlyPriceId: string;
}

interface PlansResponse extends PlanPriceIds {
  isPaid: boolean;
  latestMascotUrl?: string | null;
}

export default function UpgradeModal({
  open,
  onClose,
  source,
  capped,
  childName,
  childId,
  reason = "packets",
  defaultPlan = "yearly",
  nextFreeDate,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(defaultPlan);
  const [priceIds, setPriceIds] = useState<PlanPriceIds | null>(null);
  // null until /api/plans answers; the fallback picture is used when it
  // answers with no hosted mascot, or fails.
  const [mascotUrl, setMascotUrl] = useState<string | null>(null);
  // True from the moment the modal opens until /api/plans answers — the
  // button stays disabled and shows a quiet loading label the whole time,
  // per the hardening pass: no clickable button that can't work yet.
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [priceIdsError, setPriceIdsError] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const openedTrackedRef = useRef(false);

  const { loading, error, upgrade } = useUpgradeCheckout({
    monthlyPriceId: priceIds?.monthlyPriceId ?? "",
    yearlyPriceId: priceIds?.yearlyPriceId ?? "",
    source,
  });

  // Resets to the caller's chosen default each time the modal opens fresh,
  // then asks /api/plans for a fresh, server-side isPaid read alongside the
  // two Stripe price IDs — this is the final word on every trigger,
  // including the generate page's, which otherwise only has client-held
  // subscription state to decide whether to open at all. If the server
  // says isPaid, the modal closes immediately without ever revealing
  // prices or firing the open event below.
  useEffect(() => {
    if (!open) return;
    setSelectedPlan(defaultPlan);
    setPriceIdsError(false);
    setCheckingPlan(true);
    setPriceIds(null);
    setMascotUrl(null);

    let cancelled = false;
    fetch(childId ? `/api/plans?childId=${encodeURIComponent(childId)}` : "/api/plans")
      .then((res) => {
        if (!res.ok) throw new Error(`plans fetch failed: ${res.status}`);
        return res.json() as Promise<PlansResponse>;
      })
      .then((data) => {
        if (cancelled) return;

        if (data.isPaid) {
          onClose();
          return;
        }

        // The picture doesn't depend on prices, so set it before the price
        // check below can bail out to the catch.
        setMascotUrl(data.latestMascotUrl ?? FALLBACK_PICTURE);

        // A missing env var (e.g. STRIPE_PRICE_MONTHLY/YEARLY unset for
        // this environment) resolves server side to an empty string, not
        // a missing key — this app never has a legitimate reason to hand
        // back an empty price ID, so treat it exactly like a failed fetch
        // and fall into the catch below, regardless of why it happened.
        if (!data.monthlyPriceId || !data.yearlyPriceId) {
          throw new Error("plans response missing a price ID");
        }

        setPriceIds({ monthlyPriceId: data.monthlyPriceId, yearlyPriceId: data.yearlyPriceId });

        // Fires once per open, not once per render, and never for a paid
        // user (the isPaid branch above returns before reaching here).
        if (!openedTrackedRef.current) {
          openedTrackedRef.current = true;
          track("upgrade_modal_opened", { source, capped });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPriceIdsError(true);
        // Keep a real mascot if the response already delivered one.
        setMascotUrl((current) => current ?? FALLBACK_PICTURE);
      })
      .finally(() => {
        if (!cancelled) setCheckingPlan(false);
      });

    return () => {
      cancelled = true;
    };
    // source/capped/onClose are set by the caller in the same event handler
    // that flips `open` true, so this effect's closure already has their
    // current values whenever it actually runs — they don't need to be
    // deps, and listing onClose (a fresh arrow function most renders)
    // would refetch on every unrelated parent re-render while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultPlan]);

  // Resets the one-track-per-open guard when the modal closes.
  useEffect(() => {
    if (!open) openedTrackedRef.current = false;
  }, [open]);

  // Body scroll locked while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus moves into the dialog on open and restores to whatever was
  // focused before it on close. Escape closes. Tab is trapped inside the
  // dialog's focusable elements.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const headline =
    reason === "children"
      ? "Unlimited covers every kid in your house."
      : capped
        ? childName
          ? `Want another packet for ${childName}?`
          : "Ready for your next packet day?"
        : "Ready for your next packet day?";

  const body =
    reason === "children"
      ? "The free plan has room for one child profile. Go Unlimited to add every kid, with a packet for each of them any day you need one."
      : capped
        ? "You've used this month's free packet. Go Unlimited and turn any day into a packet day, for every kid in your house."
        : "Go Unlimited and turn any day into a packet day, for every kid in your house.";

  const footerLink =
    capped && reason !== "children"
      ? `Maybe later. Your next free packet arrives ${nextFreeDate}.`
      : "Maybe later";

  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl border border-border shadow-xl max-w-sm w-full p-6 space-y-5 focus:outline-none"
      >
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-dark hover:bg-cream transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="text-center -mt-4 space-y-2">
          {/* Fixed size box so the modal doesn't jump when the picture arrives */}
          <div className="mx-auto mb-3 w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-sage/10">
            {mascotUrl && (
              <Image
                src={mascotUrl}
                alt=""
                width={80}
                height={80}
                className="w-20 h-20 object-cover object-top"
              />
            )}
          </div>
          <h2
            id="upgrade-modal-title"
            className="font-display text-xl font-bold text-dark leading-snug"
          >
            {headline}
          </h2>
          <p className="text-sm text-muted leading-relaxed">{body}</p>
        </div>

        {/* Plan options */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setSelectedPlan("yearly")}
            aria-pressed={selectedPlan === "yearly"}
            className={[
              "w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
              selectedPlan === "yearly"
                ? "border-sage bg-sage/5"
                : "border-border bg-white hover:border-sage/40",
            ].join(" ")}
          >
            <span className="text-sm font-semibold text-dark">
              $9/mo, billed yearly ($108)
            </span>
            <span className="shrink-0 bg-honey text-dark text-xs font-bold px-2.5 py-1 rounded-full">
              ⭐ Best value
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan("monthly")}
            aria-pressed={selectedPlan === "monthly"}
            className={[
              "w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors",
              selectedPlan === "monthly"
                ? "border-sage bg-sage/5"
                : "border-border bg-white hover:border-sage/40",
            ].join(" ")}
          >
            <span className="text-sm font-semibold text-dark">
              $12/mo, cancel anytime
            </span>
          </button>
        </div>

        {error && (
          <p className="text-coral text-sm font-medium text-center">{error}</p>
        )}

        <div className="space-y-2">
          {priceIdsError ? (
            // /api/plans failed or the session expired mid-modal (401) —
            // never leave a button that looks clickable but can't work.
            <Link
              href="/pricing"
              className="block w-full text-center bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors text-sm"
            >
              See plans
            </Link>
          ) : (
            <button
              onClick={() => upgrade(selectedPlan === "yearly")}
              disabled={checkingPlan || loading || !priceIds}
              className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {checkingPlan ? "Checking your plan…" : loading ? "Redirecting…" : "Go Unlimited"}
            </button>
          )}
          <p className="text-center text-xs text-muted">
            One price covers all your kids. Cancel anytime.
          </p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Secure checkout by Stripe.
          </p>
        </div>

        <p className="text-center text-sm">
          <button
            onClick={onClose}
            className="text-muted hover:text-dark underline underline-offset-2 transition-colors"
          >
            {footerLink}
          </button>
        </p>
      </div>
    </div>
  );
}

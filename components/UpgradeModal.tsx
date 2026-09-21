"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { useUpgradeCheckout } from "@/hooks/useUpgradeCheckout";

type Source = "cap_hit" | "upgrade_link" | "deep_link";
type Plan = "yearly" | "monthly";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  source: Source;
  capped: boolean;
  childName?: string | null;
  defaultPlan?: Plan;
  /** Display string, e.g. "Oct 1" — see lib/nextFreeDate.ts. */
  nextFreeDate: string;
}

interface PlanPriceIds {
  monthlyPriceId: string;
  yearlyPriceId: string;
}

export default function UpgradeModal({
  open,
  onClose,
  source,
  capped,
  childName,
  defaultPlan = "yearly",
  nextFreeDate,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(defaultPlan);
  const [priceIds, setPriceIds] = useState<PlanPriceIds | null>(null);
  const [priceIdsError, setPriceIdsError] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const openedTrackedRef = useRef(false);

  const { loading, error, upgrade } = useUpgradeCheckout({
    monthlyPriceId: priceIds?.monthlyPriceId ?? "",
    yearlyPriceId: priceIds?.yearlyPriceId ?? "",
  });

  // Resets to the caller's chosen default each time the modal opens fresh,
  // and fetches the two Stripe price IDs the checkout button needs — see
  // app/api/plans/route.ts for why this fetches rather than taking them as
  // props.
  useEffect(() => {
    if (!open) return;
    setSelectedPlan(defaultPlan);
    setPriceIdsError(false);

    let cancelled = false;
    fetch("/api/plans")
      .then((res) => {
        if (!res.ok) throw new Error("plans fetch failed");
        return res.json();
      })
      .then((data: PlanPriceIds) => {
        if (!cancelled) setPriceIds(data);
      })
      .catch(() => {
        if (!cancelled) setPriceIdsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open, defaultPlan]);

  // Fires once per open, not once per render.
  useEffect(() => {
    if (open && !openedTrackedRef.current) {
      openedTrackedRef.current = true;
      track("upgrade_modal_opened", { source, capped });
    }
    if (!open) openedTrackedRef.current = false;
  }, [open, source, capped]);

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

  const headline = capped
    ? childName
      ? `Want another packet for ${childName}?`
      : "Ready for your next packet day?"
    : "Ready for your next packet day?";

  const body = capped
    ? "You've used this month's free packet. Go Unlimited and turn any day into a packet day, for every kid in your house."
    : "Go Unlimited and turn any day into a packet day, for every kid in your house.";

  const footerLink = capped
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
        {priceIdsError && !error && (
          <p className="text-coral text-sm font-medium text-center">
            Something went sideways. Let&apos;s try that again.
          </p>
        )}

        <div className="space-y-2">
          <button
            onClick={() => upgrade(selectedPlan === "yearly")}
            disabled={loading || !priceIds}
            className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Redirecting…" : "Go Unlimited"}
          </button>
          <p className="text-center text-xs text-muted">
            One price covers all your kids. Cancel anytime.
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

"use client";

interface UsageBannerProps {
  used: number;
  limit: number;
  resetDate: string; // profiles.packets_reset_date, e.g. "2026-08-01"
  onUpgradeClick: () => void;
}

function firstOfMonthAfter(resetDate: string): string {
  const d = new Date(`${resetDate}T00:00:00Z`);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function UsageBanner({ used, limit, resetDate, onUpgradeClick }: UsageBannerProps) {
  const exhausted = used >= limit;

  // Out of free packets: a warm note about when the next one arrives, not a
  // warning. Using the free packet is the plan working, not a problem.
  if (exhausted) {
    return (
      <div className="rounded-2xl border border-honey/30 bg-cream-dark p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="flex-1 text-sm text-dark leading-relaxed">
            <span className="font-semibold">
              Your next free packet arrives {firstOfMonthAfter(resetDate)}.
            </span>{" "}
            Or go Unlimited for every kid, every day.
          </p>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="shrink-0 bg-honey text-dark font-bold px-6 py-3 rounded-xl hover:bg-honey-dark transition-colors text-sm shadow-sm"
          >
            See Unlimited
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);

  return (
    <div className="rounded-xl border p-5 bg-white border-border shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-2.5">
          <p className="text-sm font-semibold leading-snug text-dark">
            {`You've used ${used} of ${limit} free packet${limit === 1 ? "" : "s"} this month.`}
          </p>

          {/* Progress bar */}
          <div className="h-2 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-sage"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={used}
              aria-valuemin={0}
              aria-valuemax={limit}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onUpgradeClick}
          className="shrink-0 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors text-center bg-sage text-cream hover:bg-sage-dark"
        >
          Upgrade to Unlimited →
        </button>
      </div>
    </div>
  );
}

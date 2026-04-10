import Link from "next/link";

interface UsageBannerProps {
  used: number;
  limit: number;
}

function firstOfNextMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric" }
  );
}

export default function UsageBanner({ used, limit }: UsageBannerProps) {
  const exhausted = used >= limit;
  const pct = Math.min((used / limit) * 100, 100);

  return (
    <div
      className={[
        "rounded-xl border p-5",
        exhausted
          ? "bg-coral/8 border-coral/30"
          : "bg-white border-border shadow-sm",
      ].join(" ")}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-2.5">
          <p
            className={`text-sm font-semibold leading-snug ${
              exhausted ? "text-coral-dark" : "text-dark"
            }`}
          >
            {exhausted
              ? `You're out of free packets for this month. Upgrade to keep going, or come back ${firstOfNextMonth()}.`
              : `You've used ${used} of ${limit} free packets this month.`}
          </p>

          {/* Progress bar */}
          <div className="h-2 w-full bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                exhausted ? "bg-coral" : "bg-sage"
              }`}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={used}
              aria-valuemin={0}
              aria-valuemax={limit}
            />
          </div>
        </div>

        <Link
          href="/pricing"
          className={[
            "shrink-0 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors text-center",
            exhausted
              ? "bg-coral text-cream hover:bg-coral-dark"
              : "bg-sage text-cream hover:bg-sage-dark",
          ].join(" ")}
        >
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  );
}

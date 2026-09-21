"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UsageBanner from "@/components/dashboard/UsageBanner";
import UpgradeModal from "@/components/UpgradeModal";

type Plan = "yearly" | "monthly";

interface Props {
  used: number;
  limit: number;
  resetDate: string;
  nextFreeDate: string;
  capped: boolean;
  /** Non-null only when a fresh server read already confirmed this user is
   * not paid and the ?upgrade= value was "yearly" or "monthly" — see
   * app/dashboard/page.tsx. */
  deepLinkPlan: Plan | null;
}

export default function UpgradeModalController({
  used,
  limit,
  resetDate,
  nextFreeDate,
  capped,
  deepLinkPlan,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"upgrade_link" | "deep_link">("upgrade_link");
  const [defaultPlan, setDefaultPlan] = useState<Plan>("yearly");
  const deepLinkHandledRef = useRef(false);

  // Opens once on mount for a valid, not-paid deep link, then strips only
  // the `upgrade` param so a refresh doesn't reopen it — utm_*/ref/any
  // other params on the URL are left exactly as they were.
  useEffect(() => {
    if (!deepLinkPlan || deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;

    setSource("deep_link");
    setDefaultPlan(deepLinkPlan);
    setOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("upgrade");
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPlan]);

  return (
    <>
      <UsageBanner
        used={used}
        limit={limit}
        resetDate={resetDate}
        onUpgradeClick={() => {
          setSource("upgrade_link");
          setDefaultPlan("yearly");
          setOpen(true);
        }}
      />
      <UpgradeModal
        open={open}
        onClose={() => setOpen(false)}
        source={source}
        capped={capped}
        defaultPlan={defaultPlan}
        nextFreeDate={nextFreeDate}
      />
    </>
  );
}

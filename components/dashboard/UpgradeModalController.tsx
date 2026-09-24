"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UsageBanner from "@/components/dashboard/UsageBanner";
import UpgradeModal from "@/components/UpgradeModal";
import { isEmailKey, type EmailKey } from "@/lib/emailKeys";

type Plan = "yearly" | "monthly";
type Source =
  | "upgrade_link"
  | "deep_link"
  | "child_card"
  | "add_child"
  | `${EmailKey}_email`;

export interface OpenUpgradeOptions {
  source: "child_card" | "add_child";
  childName?: string;
  childId?: string;
  reason?: "packets" | "children";
}

// Lets the dashboard's kid cards and "Add Another Child" button open the one
// upgrade modal this controller owns, instead of each mounting its own.
// Null outside the controller, or for a paid account (the controller renders
// no modal then), so callers must only render their upgrade buttons for
// free accounts.
const OpenUpgradeContext = createContext<((opts: OpenUpgradeOptions) => void) | null>(null);

export function useOpenUpgrade() {
  return useContext(OpenUpgradeContext);
}

interface Props {
  children: React.ReactNode;
  /** Fresh server read in app/dashboard/page.tsx. Paid accounts get no banner and no modal. */
  isFree: boolean;
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
  children,
  isFree,
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
  const [source, setSource] = useState<Source>("upgrade_link");
  const [defaultPlan, setDefaultPlan] = useState<Plan>("yearly");
  const [childName, setChildName] = useState<string | undefined>(undefined);
  const [childId, setChildId] = useState<string | undefined>(undefined);
  const [reason, setReason] = useState<"packets" | "children">("packets");
  const deepLinkHandledRef = useRef(false);

  // Opens once on mount for a valid, not-paid deep link, then strips only
  // the `upgrade` and `src` params so a refresh doesn't reopen it —
  // utm_*/ref/any other params on the URL are left exactly as they were.
  useEffect(() => {
    if (!deepLinkPlan || deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;

    // `src` carries an email key through to checkout_started's source (see
    // lib/emails/links.ts's buildUpgradeLink and components/UpgradeModal.tsx)
    // — validated against the same allowlist every email key is drawn from,
    // never trusted as a bare query param. Absent or invalid, behavior is
    // byte-for-byte what it was before `src` existed: source stays
    // "deep_link".
    const rawSrc = searchParams.get("src");
    setSource(isEmailKey(rawSrc) ? `${rawSrc}_email` : "deep_link");
    setDefaultPlan(deepLinkPlan);
    setChildName(undefined);
    setChildId(undefined);
    setReason("packets");
    setOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("upgrade");
    params.delete("src");
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPlan]);

  function openUpgrade(opts: OpenUpgradeOptions) {
    setSource(opts.source);
    setDefaultPlan("yearly");
    setChildName(opts.childName);
    setChildId(opts.childId);
    setReason(opts.reason ?? "packets");
    setOpen(true);
  }

  if (!isFree) return <>{children}</>;

  return (
    <OpenUpgradeContext.Provider value={openUpgrade}>
      {children}
      <UsageBanner
        used={used}
        limit={limit}
        resetDate={resetDate}
        onUpgradeClick={() => {
          setSource("upgrade_link");
          setDefaultPlan("yearly");
          setChildName(undefined);
          setChildId(undefined);
          setReason("packets");
          setOpen(true);
        }}
      />
      <UpgradeModal
        open={open}
        onClose={() => setOpen(false)}
        source={source}
        capped={capped}
        childName={childName}
        childId={childId}
        reason={reason}
        defaultPlan={defaultPlan}
        nextFreeDate={nextFreeDate}
      />
    </OpenUpgradeContext.Provider>
  );
}

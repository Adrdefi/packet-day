"use client";

import { useOpenUpgrade } from "@/components/dashboard/UpgradeModalController";

// Rendered by server components (ChildCard, app/dashboard/page.tsx) only for
// free accounts, where UpgradeModalController provides the modal. The server
// already decided who sees these; the modal still re-checks isPaid itself.

export function GetAnotherPacketButton({ childName, childId }: { childName: string; childId: string }) {
  const openUpgrade = useOpenUpgrade();
  return (
    <button
      type="button"
      onClick={() => openUpgrade?.({ source: "child_card", childName, childId })}
      className="block w-full text-center bg-honey text-dark font-bold py-3 rounded-xl hover:bg-honey-dark transition-colors text-sm"
    >
      Get another packet for {childName}
    </button>
  );
}

export function AddChildUpgradeButton() {
  const openUpgrade = useOpenUpgrade();
  return (
    <button
      type="button"
      onClick={() => openUpgrade?.({ source: "add_child", reason: "children" })}
      className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-border bg-white hover:border-sage/50 hover:bg-sage/5 text-muted hover:text-sage font-semibold text-sm py-4 rounded-xl transition-colors"
    >
      + Add Another Child
    </button>
  );
}

"use client";

import { useEffect } from "react";

export function ViewCounter({ packetId }: { packetId: string }) {
  useEffect(() => {
    fetch(`/api/packets/${packetId}/view`, { method: "POST" }).catch(() => {});
  }, [packetId]);

  return null;
}

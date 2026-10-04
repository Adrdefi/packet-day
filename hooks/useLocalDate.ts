import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * Formats a timestamp in the viewer's own time zone without a hydration
 * mismatch. The server can only format in UTC, which is already tomorrow for
 * a packet made after 5pm Pacific, so server HTML (and the first browser
 * render) use UTC, and the browser switches to local time right after
 * hydration. Returns a string, so useSyncExternalStore's snapshots compare by
 * value and stay stable.
 */
export function useLocalDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  return useSyncExternalStore(
    subscribeNever,
    () => new Date(iso).toLocaleDateString("en-US", options),
    () => new Date(iso).toLocaleDateString("en-US", { ...options, timeZone: "UTC" })
  );
}

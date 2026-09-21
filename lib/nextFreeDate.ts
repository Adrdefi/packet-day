/**
 * Formats the date a free user's packet count actually resets, for display
 * in the upgrade modal ("Your next free packet arrives Oct 1"). Takes the
 * stored packets_reset_date (or get_my_packet_usage's reset_date) — always
 * a first-of-month value — and returns the first of the FOLLOWING month,
 * short-formatted. Same month-after math as UsageBanner's
 * firstOfMonthAfter, kept separate because that one uses a long month name
 * ("August 1") and this one needs the modal's short form ("Oct 1").
 */
export function nextFreeDateLabel(resetDate: string): string {
  const d = new Date(`${resetDate}T00:00:00Z`);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

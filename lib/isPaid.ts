/**
 * The one shared check for whether an account is on the paid plan. Every
 * scattered `subscription_status !== "pro"` / `=== "pro"` comparison should
 * go through this instead, so a future new status value only needs
 * updating here, not at every call site.
 *
 * Only "pro" is paid. "cancelled" and "free" (and anything unrecognized)
 * are treated as not paid, on purpose — cancelling drops an account back
 * to the free tier, not below it.
 */
export function isPaidStatus(status: string | null | undefined): boolean {
  return status === "pro";
}

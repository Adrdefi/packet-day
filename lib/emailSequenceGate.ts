import { isEmailTestAllowlisted } from "@/lib/emailTestAllowlist";
import { isExcludedFromMarketing } from "@/lib/emailInternalAccounts";

/**
 * The one gate for "is this address in scope for the launch-cutoff-bound
 * parts of the email program" — shared by app/auth/confirm/route.ts (the
 * welcome_1 stamping decision) and the cron route (cap_followup
 * eligibility), so the two can never drift apart. False for any address
 * isExcludedFromMarketing rejects (internal, packetday, non-allowlisted
 * adrdefi). Otherwise true when the address is on EMAIL_TEST_ALLOWLIST, or
 * when EMAIL_LAUNCH_AT is set and this profile's created_at is on or after
 * it. With EMAIL_LAUNCH_AT unset, only an allowlisted address can ever
 * pass this.
 *
 * packet_back_monthly does NOT use this gate — it has no launch cutoff by
 * design (CLAUDE.md rule g) and is checked independently.
 */
export function passesSequenceGate(email: string, createdAtISO: string): boolean {
  if (isExcludedFromMarketing(email)) return false;
  if (isEmailTestAllowlisted(email)) return true;

  const launchAt = process.env.EMAIL_LAUNCH_AT;
  if (!launchAt) return false;
  return new Date(createdAtISO) >= new Date(launchAt);
}

import { isEmailTestAllowlisted } from "@/lib/emailTestAllowlist";

/**
 * Internal (Andy and Natalie's own) addresses that must never receive a
 * marketing email — on top of the adrdefi exclusion, which catches every
 * adrdefi test account. Exact addresses, compared case-insensitively.
 * Unlike adrdefi, EMAIL_TEST_ALLOWLIST does NOT bypass this list.
 */
const INTERNAL_EXCLUDED_EMAILS: readonly string[] = [
  "andyriggs@hotmail.com",
  "nattiepattieg@gmail.com",
  "packetday@gmail.com",
  "riggs.natalie@outlook.com",
];

/** True for an internal address, or any address containing "packetday" (catch-all for our own inboxes). Never bypassed by EMAIL_TEST_ALLOWLIST. */
export function isInternalExcludedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return INTERNAL_EXCLUDED_EMAILS.includes(normalized) || normalized.includes("packetday");
}

/**
 * The one exclusion check every marketing path uses — the confirm route's
 * welcome_1 (via lib/emailSequenceGate.ts) and the cron route's profile
 * load — so the two can never drift apart. Excludes internal/packetday
 * addresses unconditionally, and adrdefi test accounts unless they're on
 * EMAIL_TEST_ALLOWLIST.
 */
export function isExcludedFromMarketing(email: string): boolean {
  if (isInternalExcludedEmail(email)) return true;
  return email.toLowerCase().includes("adrdefi") && !isEmailTestAllowlisted(email);
}

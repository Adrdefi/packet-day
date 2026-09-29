/**
 * Internal (Andy and Natalie's own) addresses that must never receive a
 * marketing email from the cron route — on top of the adrdefi exclusion,
 * which catches every adrdefi test account. Exact addresses, compared
 * case-insensitively. Unlike adrdefi, EMAIL_TEST_ALLOWLIST does NOT bypass
 * this list.
 */
const INTERNAL_EXCLUDED_EMAILS: readonly string[] = [
  "andyriggs@hotmail.com",
  "nattiepattieg@gmail.com",
  "packetday@gmail.com",
  "riggs.natalie@outlook.com",
];

export function isInternalExcludedEmail(email: string): boolean {
  return INTERNAL_EXCLUDED_EMAILS.includes(email.trim().toLowerCase());
}

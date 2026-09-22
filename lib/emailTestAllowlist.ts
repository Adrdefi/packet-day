/**
 * EMAIL_TEST_ALLOWLIST: a comma-separated list of exact email addresses
 * that bypass the adrdefi exclusion AND the launch cutoff (EMAIL_LAUNCH_AT)
 * for backdated test accounts (Phase 6). Everything else — opt-out, the
 * paid-user checks, the one-per-day/priority/skip rules, the mailing
 * address safety lock — still applies to an allowlisted address exactly as
 * it does to a real user; this only lifts the two gates a test account
 * would otherwise never clear (it's usually an adrdefi address, and it's
 * backdated specifically to simulate having signed up before launch).
 * Empty or unset bypasses nothing — its default, safe state.
 */
export function isEmailTestAllowlisted(email: string): boolean {
  const raw = process.env.EMAIL_TEST_ALLOWLIST;
  if (!raw) return false;

  const normalized = email.trim().toLowerCase();
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

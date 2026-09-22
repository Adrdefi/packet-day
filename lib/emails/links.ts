import { SITE_URL } from "@/lib/site";
import type { EmailKey } from "@/lib/emailKeys";

// Every marketing-email link uses the www host (never the apex, per
// CLAUDE.md's domain rule) and carries the same three utm params, tagged
// with the email's own key so a click can be traced back to the email that
// sent it.
function withUtm(url: URL, emailKey: EmailKey): URL {
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", emailKey);
  return url;
}

/** "Make a packet" style buttons. */
export function buildGenerateLink(emailKey: EmailKey): string {
  return withUtm(new URL("/generate", SITE_URL), emailKey).toString();
}

/**
 * "Go Unlimited" style buttons. `src` carries the email key through to
 * checkout so UpgradeModalController can attribute the resulting
 * checkout_started event back to this email (see that component and
 * hooks/useUpgradeCheckout.ts) — it's read and validated against
 * EMAIL_KEYS there, never trusted blindly.
 */
export function buildUpgradeLink(emailKey: EmailKey): string {
  const url = new URL("/dashboard", SITE_URL);
  url.searchParams.set("upgrade", "yearly");
  url.searchParams.set("src", emailKey);
  return withUtm(url, emailKey).toString();
}

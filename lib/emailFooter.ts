import { createUnsubscribeToken } from "@/lib/unsubscribe";

// Marketing links always use the www host, per CLAUDE.md's domain rule —
// never the apex, even though it 308-redirects.
const SITE_URL = "https://www.packetday.com";

function getMailingAddress(): string {
  return process.env.MAILING_ADDRESS ?? "";
}

/**
 * One-time, hardcoded exception to the safety lock below — see CLAUDE.md's
 * "Address lock exception" note. DELETE this constant and every branch that
 * references it after October 2, 2026; it must never be turned into a
 * pattern, an env var, or anything reusable. Only this exact composed
 * email_sends key (lib/emailSequence.ts's buildPeriodicSendKey) bypasses
 * the lock — packet_back_monthly:2026-11 and every other send, including
 * every other packet_back_monthly period, still throws normally.
 */
export const ADDRESS_LOCK_EXCEPTION_KEY = "packet_back_monthly:2026-10";

/**
 * Safety lock: every marketing send must call this before sending. Throws
 * if MAILING_ADDRESS is missing or still the "ADDRESS PENDING" placeholder,
 * so a real address can never be skipped by accident. Transactional email
 * (packet ready, auth) must never call this — it isn't subject to CAN-SPAM's
 * physical-address requirement and must never be blocked by it.
 *
 * `emailSendKey`, when passed, is compared against the one-time exception
 * above — everything else about the lock is unchanged.
 */
export function assertMailingAddressReady(emailSendKey?: string): void {
  if (emailSendKey === ADDRESS_LOCK_EXCEPTION_KEY) return;

  const address = getMailingAddress();
  if (!address || address === "ADDRESS PENDING") {
    throw new Error(
      "MAILING_ADDRESS is missing or still set to the ADDRESS PENDING placeholder. Set a real mailing address before sending any marketing email."
    );
  }
}

/**
 * The address to print in the footer, or null to omit the line — a real
 * address is always shown once one exists, exception key or not; null only
 * happens when it's genuinely missing/placeholder, which is only reachable
 * at all under the one-time exception (assertMailingAddressReady already
 * threw for every other caller before this is ever called).
 */
function resolveDisplayAddress(): string | null {
  const address = getMailingAddress();
  return address && address !== "ADDRESS PENDING" ? address : null;
}

function buildUnsubscribeUrl(userId: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(userId))}`;
}

function buildOneClickUnsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(userId))}`;
}

export function buildMarketingEmailFooterHtml(userId: string, emailSendKey?: string): string {
  assertMailingAddressReady(emailSendKey);
  const address = resolveDisplayAddress();
  const unsubscribeUrl = buildUnsubscribeUrl(userId);

  return `<tr>
    <td style="padding:16px 40px 32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <hr style="border:none;border-top:1px solid #F0EAE0;margin:0 0 16px 0;" />
      ${address ? `<p style="margin:0 0 6px 0;font-size:12px;color:#9A9AAF;">${address}</p>` : ""}
      <p style="margin:0;font-size:12px;color:#9A9AAF;"><a href="${unsubscribeUrl}" style="color:#9A9AAF;text-decoration:underline;">Unsubscribe</a></p>
    </td>
  </tr>`;
}

export function buildMarketingEmailFooterText(userId: string, emailSendKey?: string): string {
  assertMailingAddressReady(emailSendKey);
  const address = resolveDisplayAddress();
  const unsubscribeUrl = buildUnsubscribeUrl(userId);

  return address ? `${address}\n\nUnsubscribe: ${unsubscribeUrl}` : `Unsubscribe: ${unsubscribeUrl}`;
}

/**
 * List-Unsubscribe / List-Unsubscribe-Post headers per RFC 8058, so Gmail
 * and Yahoo show their built-in one-click unsubscribe button. The bracketed
 * URL points at the API route (POST, no page); the mailto is the required
 * fallback for clients that only support the older mailto form.
 */
export function buildMarketingEmailHeaders(userId: string, emailSendKey?: string): Record<string, string> {
  assertMailingAddressReady(emailSendKey);
  const oneClickUrl = buildOneClickUnsubscribeUrl(userId);

  return {
    "List-Unsubscribe": `<${oneClickUrl}>, <mailto:hello@packetday.com?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

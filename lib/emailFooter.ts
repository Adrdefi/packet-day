import { createUnsubscribeToken } from "@/lib/unsubscribe";
import type { EmailKey } from "@/lib/emailKeys";

// Marketing links always use the www host, per CLAUDE.md's domain rule —
// never the apex, even though it 308-redirects.
const SITE_URL = "https://www.packetday.com";

function getMailingAddress(): string {
  return process.env.MAILING_ADDRESS ?? "";
}

/** True once MAILING_ADDRESS holds a real value (not missing, not the "ADDRESS PENDING" placeholder). Read fresh on every call, so setting the env var takes effect with no code change. */
export function isMailingAddressConfigured(): boolean {
  const address = getMailingAddress();
  return !!address && address !== "ADDRESS PENDING";
}

const MONTHLY_EMAIL_KEY: EmailKey = "packet_back_monthly";

/**
 * True for packet_back_monthly's send keys — the bare key or any period
 * ("packet_back_monthly:2026-11"). This is the ONLY email allowed to send
 * without a mailing address (the address line is just omitted); every
 * other marketing email, including cap_followup at any period, still hits
 * the strict lock below.
 */
function isMonthlySendKey(emailSendKey: string | undefined): boolean {
  return emailSendKey === MONTHLY_EMAIL_KEY || !!emailSendKey?.startsWith(`${MONTHLY_EMAIL_KEY}:`);
}

/**
 * Safety lock: every marketing send must call this before sending. Throws
 * if MAILING_ADDRESS is missing or still the "ADDRESS PENDING" placeholder,
 * so a real address can never be skipped by accident. Transactional email
 * (packet ready, auth) must never call this — it isn't subject to CAN-SPAM's
 * physical-address requirement and must never be blocked by it.
 *
 * `emailSendKey`, when it's a packet_back_monthly key, skips the throw (see
 * isMonthlySendKey) — everything else about the lock is unchanged.
 */
export function assertMailingAddressReady(emailSendKey?: string): void {
  if (isMonthlySendKey(emailSendKey)) return;

  if (!isMailingAddressConfigured()) {
    throw new Error(
      "MAILING_ADDRESS is missing or still set to the ADDRESS PENDING placeholder. Set a real mailing address before sending any marketing email."
    );
  }
}

/**
 * The address to print in the footer, or null to omit the line — a real
 * address is always shown once one exists; null only happens when it's
 * genuinely missing/placeholder, which is only reachable for
 * packet_back_monthly (assertMailingAddressReady already threw for every
 * other caller before this is ever called).
 */
function resolveDisplayAddress(): string | null {
  return isMailingAddressConfigured() ? getMailingAddress() : null;
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

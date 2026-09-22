import { createUnsubscribeToken } from "@/lib/unsubscribe";

// Marketing links always use the www host, per CLAUDE.md's domain rule —
// never the apex, even though it 308-redirects.
const SITE_URL = "https://www.packetday.com";

function getMailingAddress(): string {
  return process.env.MAILING_ADDRESS ?? "";
}

/**
 * Safety lock: every marketing send must call this before sending. Throws
 * if MAILING_ADDRESS is missing or still the "ADDRESS PENDING" placeholder,
 * so a real address can never be skipped by accident. Transactional email
 * (packet ready, auth) must never call this — it isn't subject to CAN-SPAM's
 * physical-address requirement and must never be blocked by it.
 */
export function assertMailingAddressReady(): void {
  const address = getMailingAddress();
  if (!address || address === "ADDRESS PENDING") {
    throw new Error(
      "MAILING_ADDRESS is missing or still set to the ADDRESS PENDING placeholder. Set a real mailing address before sending any marketing email."
    );
  }
}

function buildUnsubscribeUrl(userId: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(userId))}`;
}

function buildOneClickUnsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(userId))}`;
}

export function buildMarketingEmailFooterHtml(userId: string): string {
  assertMailingAddressReady();
  const address = getMailingAddress();
  const unsubscribeUrl = buildUnsubscribeUrl(userId);

  return `<tr>
    <td style="padding:16px 40px 32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <hr style="border:none;border-top:1px solid #F0EAE0;margin:0 0 16px 0;" />
      <p style="margin:0 0 6px 0;font-size:12px;color:#9A9AAF;">${address}</p>
      <p style="margin:0;font-size:12px;color:#9A9AAF;"><a href="${unsubscribeUrl}" style="color:#9A9AAF;text-decoration:underline;">Unsubscribe</a></p>
    </td>
  </tr>`;
}

export function buildMarketingEmailFooterText(userId: string): string {
  assertMailingAddressReady();
  const address = getMailingAddress();
  const unsubscribeUrl = buildUnsubscribeUrl(userId);

  return `${address}\n\nUnsubscribe: ${unsubscribeUrl}`;
}

/**
 * List-Unsubscribe / List-Unsubscribe-Post headers per RFC 8058, so Gmail
 * and Yahoo show their built-in one-click unsubscribe button. The bracketed
 * URL points at the API route (POST, no page); the mailto is the required
 * fallback for clients that only support the older mailto form.
 */
export function buildMarketingEmailHeaders(userId: string): Record<string, string> {
  assertMailingAddressReady();
  const oneClickUrl = buildOneClickUnsubscribeUrl(userId);

  return {
    "List-Unsubscribe": `<${oneClickUrl}>, <mailto:hello@packetday.com?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

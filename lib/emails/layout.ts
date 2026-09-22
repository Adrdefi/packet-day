import {
  buildMarketingEmailFooterHtml,
  buildMarketingEmailFooterText,
  buildMarketingEmailHeaders,
} from "@/lib/emailFooter";

// Same hex tokens as the packet-ready email (lib/resend.ts) — kept as
// literal values here rather than importing Tailwind config, since email
// clients need real hex in inline styles regardless.
const SANS_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF_FONT = "Georgia,'Times New Roman',Times,serif";
const SAGE = "#4A7C59";
const CREAM = "#FDFBF7";
const DARK = "#1A1A2E";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface MarketingEmailCta {
  label: string;
  url: string;
}

export interface MarketingEmailParams {
  userId: string;
  /** The actual email_sends key this send will claim (e.g. "packet_back_monthly:2026-10"). Only ever meaningful for the one-time address-lock exception in lib/emailFooter.ts — every other template omits it and gets the normal, strict safety lock. */
  emailSendKey?: string;
  preview: string;
  /** HTML/text that renders before the CTA button (or the whole body, when there's no CTA). */
  preCtaHtml: string;
  preCtaText: string;
  /** Single CTA button, per email. Omit for a reply-only email like checkin_day1. */
  cta?: MarketingEmailCta | null;
  /** HTML/text that renders after the CTA button — sign-off, P.S., etc. */
  postCtaHtml: string;
  postCtaText: string;
}

export interface MarketingEmailOutput {
  html: string;
  text: string;
  headers: Record<string, string>;
}

// cta.label is always the plain, human-readable text — shared as-is with
// the plain-text render below, so HTML escaping happens only here, not at
// the call site. A template that builds a label from dynamic data (e.g.
// packet_back_monthly's possessive child name) must never pre-escape it,
// or the entity would leak verbatim into the text version.
function buildCtaRow(cta: MarketingEmailCta | null | undefined): string {
  if (!cta) return "";
  return `
        <tr>
          <td align="center" style="padding:8px 40px 16px 40px;">
            <a href="${cta.url}" style="display:inline-block;background-color:${SAGE};color:${CREAM};font-family:${SANS_FONT};font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">${escapeHtml(cta.label)}</a>
          </td>
        </tr>`;
}

function buildCtaTextLine(cta: MarketingEmailCta | null | undefined): string | null {
  return cta ? `${cta.label}: ${cta.url}` : null;
}

/**
 * The shared marketing-email shell: plain, single column, table based,
 * inline styles only, Georgia serif heading plus a system sans body, no web
 * fonts. Every template hands this its own body content and gets back a
 * finished { subject-less } render — subject/preview are carried by the
 * caller alongside this, since they belong to Resend's send() call, not the
 * HTML body.
 *
 * The hidden preheader span carries the preview text (padded with
 * zero-width spaces so trailing visible text can't leak into the preview
 * snippet). Footer + List-Unsubscribe headers come from lib/emailFooter.ts,
 * which also runs the mailing-address safety lock — every caller of this
 * function is therefore already covered by that lock.
 */
export function renderMarketingEmail(params: MarketingEmailParams): MarketingEmailOutput {
  const { userId, emailSendKey, preview, preCtaHtml, preCtaText, cta, postCtaHtml, postCtaText } = params;

  const hasPostCta = postCtaHtml.trim() !== "";
  // No CTA and nothing after it (checkin_day1) — the pre-content block is
  // the whole body, so it needs to supply its own bottom padding instead of
  // relying on a CTA row or post-content row that won't be rendered.
  const preCtaBottomPadding = !cta && !hasPostCta ? "32px" : "0";

  const postCtaRow = hasPostCta
    ? `
        <tr>
          <td style="padding:0 40px 0 40px;font-family:${SANS_FONT};font-size:16px;line-height:1.65;color:${DARK};">
${postCtaHtml}
          </td>
        </tr>`
    : "";

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${CREAM};">${escapeHtml(preview)}${"&#8203; ".repeat(40)}</td>
        </tr>
        <tr>
          <td align="center" style="padding:32px 40px 8px 40px;">
            <p style="margin:0;font-family:${SERIF_FONT};font-size:20px;font-weight:700;color:${SAGE};letter-spacing:-0.2px;">Packet Day</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px ${preCtaBottomPadding} 40px;font-family:${SANS_FONT};font-size:16px;line-height:1.65;color:${DARK};">
${preCtaHtml}
          </td>
        </tr>${buildCtaRow(cta)}${postCtaRow}
        ${buildMarketingEmailFooterHtml(userId, emailSendKey)}
      </table>
    </td>
  </tr>
</table>`;

  const text = [
    preCtaText,
    buildCtaTextLine(cta),
    hasPostCta ? postCtaText : null,
    buildMarketingEmailFooterText(userId, emailSendKey),
  ]
    .filter((part): part is string => part !== null)
    .join("\n\n");

  return { html, text, headers: buildMarketingEmailHeaders(userId, emailSendKey) };
}

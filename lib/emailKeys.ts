/**
 * Every key in the welcome/nurture sequence, plus the recurring monthly
 * re-engagement email. This is the single allowlist both the templates
 * (lib/emails/templates.ts) and any surface that needs to validate a key
 * coming from outside the server (e.g. the dashboard's `?src=` deep-link
 * param, see components/dashboard/UpgradeModalController.tsx) read from.
 */
export const EMAIL_KEYS = [
  "welcome_1",
  "nudge_2",
  "story_3",
  "plans_4",
  "faq_5",
  "checkin_day1",
  "cap_followup",
  "packet_back_monthly",
] as const;

export type EmailKey = (typeof EMAIL_KEYS)[number];

export function isEmailKey(value: unknown): value is EmailKey {
  return typeof value === "string" && (EMAIL_KEYS as readonly string[]).includes(value);
}

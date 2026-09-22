/**
 * Sends one real copy of every marketing template (lib/emails/templates.ts)
 * plus the packet-ready email (lib/resend.ts) to a single test inbox, so a
 * human can eyeball subjects, sender, copy, and links before Phase 4 (the
 * sequence engine) ever sends one of these to a real user.
 *
 * Every send is single and awaited — one at a time, never batched or
 * fired-and-forgotten — and welcome_1 sends twice, once with a first name
 * and once without, to prove the "Hi there," fallback actually renders.
 *
 * USAGE
 * -----
 *   npm run test-emails
 *
 * SAFETY LOCK
 * -----------
 * Every marketing template's footer runs lib/emailFooter.ts's
 * assertMailingAddressReady(), which throws if MAILING_ADDRESS is missing
 * or still "ADDRESS PENDING". Locally, before a real mailing address is
 * set, that's still true — so this script carries one narrow, test-only
 * exception: if MAILING_ADDRESS is still the placeholder AND every
 * recipient this run will actually send to contains "adrdefi", it sets
 * process.env.MAILING_ADDRESS to "ADDRESS PENDING (test)" for the
 * remainder of this process only. That string is deliberately NOT the
 * exact "ADDRESS PENDING" the safety lock checks for, so it satisfies the
 * lock and renders visibly in the footer as an obvious placeholder. This
 * never touches the real app process or Vercel's env — a real send there
 * still hits the unmodified, unconditional lock.
 */

import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { sendPacketReadyEmail, sendMarketingEmail } from "../lib/resend";
import { buildMarketingEmailHeaders } from "../lib/emailFooter";
import {
  buildWelcome1Email,
  buildNudge2Email,
  buildStory3Email,
  buildPlans4Email,
  buildFaq5Email,
  buildCheckinDay1Email,
  buildCapFollowupEmail,
  buildPacketBackMonthlyEmail,
} from "../lib/emails/templates";

// ─── Env ────────────────────────────────────────────────────────────────────

function stripInlineComment(value: string | undefined): string {
  if (!value) return "";
  const idx = value.indexOf(" #");
  return (idx === -1 ? value : value.slice(0, idx)).trim();
}

function loadEnvSafely(): void {
  loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "MAILING_ADDRESS",
    "UNSUBSCRIBE_SECRET",
  ]) {
    process.env[key] = stripInlineComment(process.env[key]);
  }
}

loadEnvSafely();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.UNSUBSCRIBE_SECRET) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, or UNSUBSCRIBE_SECRET after loading .env.local. Stopping."
  );
  process.exit(1);
}

const TEST_RECIPIENT = "adrdefi+emailtest@gmail.com";

function applyTestMailingAddressOverride(): void {
  const current = process.env.MAILING_ADDRESS ?? "";
  if (current && current !== "ADDRESS PENDING") return; // a real address is already set — nothing to do

  if (!TEST_RECIPIENT.toLowerCase().includes("adrdefi")) {
    console.error(
      'STOP: MAILING_ADDRESS is still the "ADDRESS PENDING" placeholder and the test recipient does not contain "adrdefi" — refusing to send. This exception is test-only; a real send stays locked.'
    );
    process.exit(1);
  }

  process.env.MAILING_ADDRESS = "ADDRESS PENDING (test)";
  console.log(
    'MAILING_ADDRESS is still the placeholder locally — using the test-only override "ADDRESS PENDING (test)" since the recipient contains "adrdefi".'
  );
}

applyTestMailingAddressOverride();

// ─── Test user id (for the unsubscribe token in the footer) ───────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const SYNTHETIC_USER_ID = "00000000-0000-0000-0000-000000000000";

async function resolveTestUserId(): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", "%emailtest%")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log(`Profile lookup for a test user id failed (non-fatal, using a synthetic id): ${error.message}`);
    return SYNTHETIC_USER_ID;
  }
  if (data?.id) return data.id as string;

  console.log(
    'No profile found matching "emailtest" — using a synthetic id for the unsubscribe link. The rendered link will not resolve to a real account.'
  );
  return SYNTHETIC_USER_ID;
}

// ─── Sends ──────────────────────────────────────────────────────────────────

let sentCount = 0;

async function sendTemplate(label: string, content: { subject: string; html: string; text: string }, userId: string) {
  const headers = buildMarketingEmailHeaders(userId);
  const result = await sendMarketingEmail({
    to: TEST_RECIPIENT,
    subject: `[TEST] ${content.subject}`,
    html: content.html,
    text: content.text,
    headers,
  });

  if (result.error) {
    console.error(`FAILED (${label}):`, result.error);
    return;
  }

  sentCount += 1;
  console.log(`Sent ${label} -> ${TEST_RECIPIENT} (Resend id ${result.data?.id})`);
}

async function main(): Promise<void> {
  const userId = await resolveTestUserId();

  await sendTemplate("welcome_1 (with first name)", buildWelcome1Email({ userId, fullName: "Andy" }), userId);
  await sendTemplate('welcome_1 (no name, proves "Hi there,")', buildWelcome1Email({ userId, fullName: null }), userId);
  await sendTemplate("nudge_2", buildNudge2Email({ userId, fullName: "Andy" }), userId);
  await sendTemplate("story_3", buildStory3Email({ userId, fullName: "Andy" }), userId);
  await sendTemplate("plans_4", buildPlans4Email({ userId, fullName: "Andy" }), userId);
  await sendTemplate("faq_5", buildFaq5Email({ userId, fullName: "Andy" }), userId);
  await sendTemplate("checkin_day1", buildCheckinDay1Email({ userId, fullName: "Andy" }), userId);
  await sendTemplate("cap_followup", buildCapFollowupEmail({ userId, fullName: "Andy" }), userId);
  await sendTemplate(
    "packet_back_monthly",
    buildPacketBackMonthlyEmail({ userId, fullName: "Andy", childName: "Noah", theme: "dinosaurs" }),
    userId
  );

  // Packet-ready — transactional, no unsubscribe footer/headers, no safety
  // lock. pdfBuffer is a placeholder, not a real render: this script is
  // testing the EMAIL (sender, subject, sign-off, copy), not PDF output —
  // see scripts/test-pdf.ts for that.
  const placeholderPdf = Buffer.from("Placeholder attachment for a test send — not a real generated packet.", "utf8");
  const result = await sendPacketReadyEmail({
    to: TEST_RECIPIENT,
    childName: "Noah",
    theme: "Dinosaur Discovery",
    mascotName: "Rex",
    heroImageUrl: null,
    subjects: ["Reading", "Math"],
    pdfBuffer: placeholderPdf,
    filename: "test-packet-placeholder.pdf",
    testSubjectPrefix: "[TEST] ",
  });

  if (result.error) {
    console.error("FAILED (packet ready):", result.error);
  } else {
    sentCount += 1;
    console.log(`Sent packet ready -> ${TEST_RECIPIENT} (Resend id ${result.data?.id})`);
  }

  console.log(`\n${sentCount} email(s) sent to ${TEST_RECIPIENT}.`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

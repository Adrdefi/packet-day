import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { claimEmailSend, markEmailSendFailed, markEmailSendSent } from "@/lib/emailSends";
import { buildMarketingEmailHeaders } from "@/lib/emailFooter";
import { sendMarketingEmail } from "@/lib/resend";
import { buildWelcome1Email } from "@/lib/emails/templates";
import { passesSequenceGate } from "@/lib/emailSequenceGate";
import { isPaidStatus } from "@/lib/isPaid";

// Bounds the welcome_1 send call below — see lib/resend.ts's
// sendMarketingEmail for how this is a real AbortController cancellation,
// not a Promise.race-and-abandon, so nothing is ever left running past
// this request's own response.
const WELCOME_1_SEND_TIMEOUT_MS = 3000;

// Stamps sequence_started_at. Same local getServiceClient() pattern as
// lib/emailSends.ts, which records the send itself.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

/**
 * Stamps sequence_started_at for a freshly confirmed, eligible signup, and
 * — only when EMAIL_SEQUENCE_ENABLED is "true" — attempts the Email 1
 * send. Stamping and sending are gated separately on purpose: stamping is
 * not sending, and without the stamp the cron route (app/api/cron/
 * email-sequence) can never find this user later to backstop them once
 * sending is turned on. Everything here is best-effort: it must never
 * delay the redirect below beyond the send's own timeout, and a failure
 * here must never break confirmation.
 */
export async function attemptWelcome1(params: {
  userId: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  marketingOptOut: boolean;
  sequenceStartedAt: string | null;
  subscriptionStatus: string | null;
}): Promise<void> {
  const { userId, email, fullName, createdAt, marketingOptOut, sequenceStartedAt, subscriptionStatus } = params;

  // EMAIL_LAUNCH_AT unset means nobody is enrolled, on purpose. Test
  // accounts (adrdefi), internal and packetday addresses, anyone already
  // opted out, and paying users are excluded, per CLAUDE.md's Phase 4
  // rules (f/g/h/i) — except an address on EMAIL_TEST_ALLOWLIST, which
  // bypasses the adrdefi exclusion and the launch cutoff (but never the
  // internal list, opt-out, or paid checks). Shared with the cron route
  // via lib/emailSequenceGate.ts and lib/emailInternalAccounts.ts so the
  // two can never drift.
  const eligible = passesSequenceGate(email, createdAt) && !marketingOptOut && !isPaidStatus(subscriptionStatus);
  if (!eligible) return;

  try {
    if (!sequenceStartedAt) {
      const { error: stampError } = await getServiceClient()
        .from("profiles")
        .update({ sequence_started_at: new Date().toISOString() })
        .eq("id", userId);
      if (stampError) throw stampError;
    }

    if (process.env.EMAIL_SEQUENCE_ENABLED !== "true") return; // stamped; sending itself waits for the switch

    // Built BEFORE the claim: if building throws (e.g. the mailing address
    // safety lock), no email_sends row exists, so the cron backstop can
    // still retry welcome_1 later instead of finding it permanently failed.
    const content = buildWelcome1Email({ userId, fullName });
    const headers = buildMarketingEmailHeaders(userId);

    const claimed = await claimEmailSend(userId, "welcome_1");
    if (!claimed) return; // already claimed (race, or a prior attempt already exists) — nothing to do

    try {
      const result = await sendMarketingEmail({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        headers,
        timeoutMs: WELCOME_1_SEND_TIMEOUT_MS,
      });

      if (result.error) {
        await markEmailSendFailed(claimed.id, JSON.stringify(result.error));
      } else {
        await markEmailSendSent(claimed.id, result.data?.id ?? null);
      }
    } catch (sendErr) {
      // Claim already exists — never leave it stuck in 'pending', mark it
      // failed so the ledger stays accurate (no retries either way).
      await markEmailSendFailed(claimed.id, sendErr instanceof Error ? sendErr.message : String(sendErr));
    }
  } catch (err) {
    console.error("[welcome-1] welcome_1 attempt failed (non-fatal):", err instanceof Error ? err.message : String(err));
  }
}

/**
 * Loads the profile fields attemptWelcome1 needs and runs it for a freshly
 * signed-in user. Shared by every signup landing route
 * (app/auth/confirm and app/auth/callback) so a new signup is enrolled the
 * same way whichever link Supabase sends them through. Safe to call more
 * than once: stamping only happens when sequence_started_at is empty, and
 * the email_sends claim dedupes the send itself.
 */
export async function enrollNewSignup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null }
): Promise<void> {
  if (!user.email) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at, marketing_opt_out, sequence_started_at, full_name, subscription_status")
    .eq("id", user.id)
    .single();
  if (!profile) return;

  await attemptWelcome1({
    userId: user.id,
    email: user.email,
    fullName: profile.full_name,
    createdAt: profile.created_at,
    marketingOptOut: profile.marketing_opt_out,
    sequenceStartedAt: profile.sequence_started_at,
    subscriptionStatus: profile.subscription_status,
  });
}

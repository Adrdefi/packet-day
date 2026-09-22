import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import { isPlanSlug } from "@/lib/plans";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { track } from "@vercel/analytics/server";
import { claimEmailSend, markEmailSendFailed, markEmailSendSent } from "@/lib/emailSends";
import { buildMarketingEmailHeaders } from "@/lib/emailFooter";
import { sendMarketingEmail } from "@/lib/resend";
import { buildWelcome1Email } from "@/lib/emails/templates";
import { passesSequenceGate } from "@/lib/emailSequenceGate";

// Bounds the welcome_1 send call below — see lib/resend.ts's
// sendMarketingEmail for how this is a real AbortController cancellation,
// not a Promise.race-and-abandon, so nothing is ever left running past
// this request's own response.
const WELCOME_1_SEND_TIMEOUT_MS = 3000;

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
async function attemptWelcome1(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  marketingOptOut: boolean;
  sequenceStartedAt: string | null;
}): Promise<void> {
  const { supabase, userId, email, fullName, createdAt, marketingOptOut, sequenceStartedAt } = params;

  // EMAIL_LAUNCH_AT unset means nobody is enrolled, on purpose. Test
  // accounts (adrdefi) and anyone already opted out are excluded with no
  // exception, per CLAUDE.md's Phase 4 rules (g/h) — except an address on
  // EMAIL_TEST_ALLOWLIST, which bypasses the adrdefi exclusion and the
  // launch cutoff (but never the opt-out check). Shared with the cron
  // route's cap_followup eligibility via lib/emailSequenceGate.ts so the
  // two can never drift.
  const eligible = passesSequenceGate(email, createdAt) && !marketingOptOut;
  if (!eligible) return;

  try {
    if (!sequenceStartedAt) {
      const { error: stampError } = await supabase
        .from("profiles")
        .update({ sequence_started_at: new Date().toISOString() })
        .eq("id", userId);
      if (stampError) throw stampError;
    }

    if (process.env.EMAIL_SEQUENCE_ENABLED !== "true") return; // stamped; sending itself waits for the switch

    const claimed = await claimEmailSend(userId, "welcome_1");
    if (!claimed) return; // already claimed (race, or a prior attempt already exists) — nothing to do

    try {
      const content = buildWelcome1Email({ userId, fullName });
      const headers = buildMarketingEmailHeaders(userId);
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
    console.error("[auth-confirm] welcome_1 attempt failed (non-fatal):", err instanceof Error ? err.message : String(err));
  }
}

// Allow list of OTP types this route will verify. Add an entry here (and
// nowhere else) to support another flow. `email` is the non-deprecated type
// for signup confirmation — @supabase/auth-js's verifyOtp docs note that
// `signup` and `magiclink` are deprecated in favor of `email`.
const ALLOWED_TYPES: Record<string, EmailOtpType> = {
  recovery: "recovery",
  email: "email",
};

/**
 * Handles the token-hash confirmation link from Supabase auth emails
 * (signup confirmation, password recovery). Unlike the PKCE `code` exchange
 * in app/auth/callback/route.ts, verifyOtp needs no client-stored secret, so
 * this link works from any browser or device — not just the one that
 * requested it.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = rawType ? ALLOWED_TYPES[rawType] : undefined;
  const rawNext = searchParams.get("next");
  const next = safeNext(rawNext) ?? "/reset-password";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      if (type === "email") {
        // Signup confirmation. The chosen plan (if any) travels in user
        // metadata set at signUp() time, not in a `next` query param — that
        // param is never trusted here, the destination is always computed
        // server-side to match what a signed-up user's landing spot is.
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const plan = user?.user_metadata?.plan;
        // Set at signUp() time (app/(auth)/signup/page.tsx) — validated
        // again here rather than trusted as-is, since it's user metadata
        // a client controls.
        const nextPath = safeNext(
          typeof user?.user_metadata?.next_path === "string" ? user.user_metadata.next_path : null
        );

        try {
          await track("email_confirmed", { plan: isPlanSlug(plan) ? plan : "free" });
        } catch (err) {
          console.error("[auth-confirm] Failed to record email_confirmed event:", err);
        }

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed, created_at, marketing_opt_out, sequence_started_at, full_name")
            .eq("id", user.id)
            .single();

          if (profile && user.email) {
            await attemptWelcome1({
              supabase,
              userId: user.id,
              email: user.email,
              fullName: profile.full_name,
              createdAt: profile.created_at,
              marketingOptOut: profile.marketing_opt_out,
              sequenceStartedAt: profile.sequence_started_at,
            });
          }

          // Plan keeps top priority, exactly as before — a chosen paid plan
          // always goes to checkout, regardless of any next_path.
          if (isPlanSlug(plan)) {
            return NextResponse.redirect(`${origin}/checkout-redirect?plan=${plan}`);
          }

          if (!profile?.onboarding_completed) {
            const onboardingUrl = nextPath
              ? `${origin}/onboarding?next=${encodeURIComponent(nextPath)}`
              : `${origin}/onboarding`;
            return NextResponse.redirect(onboardingUrl);
          }

          if (nextPath) {
            return NextResponse.redirect(`${origin}${nextPath}`);
          }
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing params, disallowed type, or a failed verification.
  return NextResponse.redirect(
    `${origin}${type === "email" ? "/login?error=link-expired" : "/reset-password"}`
  );
}

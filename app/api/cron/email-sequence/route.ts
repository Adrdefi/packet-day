import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isPaidStatus } from "@/lib/isPaid";
import type { EmailKey } from "@/lib/emailKeys";
import {
  deriveAttemptedState,
  isStillCapped,
  pacificHour,
  resolveSequenceDecision,
  utcQuotaMonth,
  type Candidate,
  type UserSequenceState,
} from "@/lib/emailSequence";
import { claimEmailSend, getEmailSendRowsForUsers, markEmailSendFailed, markEmailSendSent } from "@/lib/emailSends";
import { buildMarketingEmailHeaders } from "@/lib/emailFooter";
import { sendMarketingEmail } from "@/lib/resend";
import { isEmailTestAllowlisted } from "@/lib/emailTestAllowlist";
import { passesSequenceGate } from "@/lib/emailSequenceGate";
import {
  buildCapFollowupEmail,
  buildCheckinDay1Email,
  buildFaq5Email,
  buildNudge2Email,
  buildPacketBackMonthlyEmail,
  buildPlans4Email,
  buildStory3Email,
  buildWelcome1Email,
  type EmailContent,
  type EmailTemplateParams,
} from "@/lib/emails/templates";

// Up to 50 sequential, awaited sends at ~1-3s each — generous headroom
// under this app's existing 300s ceiling (see app/api/generate-packet/route.ts).
export const maxDuration = 300;

const MAX_SENDS_PER_RUN = 50;

// Every free-tier subscription_status shares the same 1-packet-a-month
// limit (PACKET_LIMITS.free / .cancelled in app/api/generate-packet/route.ts
// — cancelling drops you back to free, not below it), so a single free
// limit works for every non-paid user cap_followup ever considers.
const FREE_PACKET_LIMIT = 1;

// Every email this route can dispatch. packet_back_monthly is deliberately
// absent here — it needs extra per-user fields (child name, theme) beyond
// this shape, so it's dispatched separately below, not through this table.
const TEMPLATE_BUILDERS: Partial<Record<EmailKey, (params: EmailTemplateParams) => EmailContent>> = {
  welcome_1: buildWelcome1Email,
  nudge_2: buildNudge2Email,
  story_3: buildStory3Email,
  faq_5: buildFaq5Email,
  checkin_day1: buildCheckinDay1Email,
  plans_4: buildPlans4Email,
  cap_followup: buildCapFollowupEmail,
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // an unset secret must never mean "open" — reject, don't fail open

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription_status: string;
  sequence_started_at: string | null;
  last_cap_hit_at: string | null;
  packets_used_this_month: number;
  packets_reset_date: string;
}

/**
 * Everyone email-eligible at all — not just those enrolled in the
 * day-based sequence. The day-based sequence, cap_followup, and
 * packet_back_monthly are three independent candidate sources per user
 * (see resolveSequenceDecision); sequence candidates additionally require
 * sequence_started_at, checked per user below, not here.
 */
async function loadEmailEligibleProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await getServiceClient()
    .from("profiles")
    .select(
      "id, email, full_name, created_at, subscription_status, sequence_started_at, last_cap_hit_at, packets_used_this_month, packets_reset_date"
    )
    .eq("marketing_opt_out", false);
  if (error) throw error;

  // adrdefi exclusion happens here, client-side, rather than as a DB
  // filter, so an EMAIL_TEST_ALLOWLIST address (typically an adrdefi
  // address, backdated for Phase 6 testing) isn't excluded by the same
  // filter it's specifically meant to bypass. See lib/emailTestAllowlist.ts.
  return ((data ?? []) as ProfileRow[]).filter(
    (p) => isEmailTestAllowlisted(p.email) || !p.email.toLowerCase().includes("adrdefi")
  );
}

interface PacketActivationRow {
  user_id: string;
  created_at: string;
  child_name: string;
  theme: string;
}

interface ActivationInfo {
  firstActivatedAtISO: string;
  hasPacketThisUTCQuotaMonth: boolean;
  latestChildName: string;
  latestTheme: string;
}

/**
 * One pass over every completed packet for the candidate users, producing
 * both "first ever" (for checkin_day1 / general activation) and "any this
 * UTC quota month" (for packet_back_monthly eligibility) plus the most
 * recent child name/theme (for packet_back_monthly's copy) — all from a
 * single query, since rows arrive ordered oldest-first.
 */
async function loadPacketActivationInfo(userIds: string[], currentPeriod: string): Promise<Map<string, ActivationInfo>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await getServiceClient()
    .from("packets")
    .select("user_id, created_at, child_name, theme")
    .not("generated_content", "is", null)
    .in("user_id", userIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const result = new Map<string, ActivationInfo>();
  for (const row of (data ?? []) as PacketActivationRow[]) {
    const rowPeriod = utcQuotaMonth(new Date(row.created_at));
    const existing = result.get(row.user_id);
    if (!existing) {
      result.set(row.user_id, {
        firstActivatedAtISO: row.created_at,
        hasPacketThisUTCQuotaMonth: rowPeriod === currentPeriod,
        latestChildName: row.child_name,
        latestTheme: row.theme,
      });
    } else {
      existing.latestChildName = row.child_name;
      existing.latestTheme = row.theme;
      if (rowPeriod === currentPeriod) existing.hasPacketThisUTCQuotaMonth = true;
    }
  }
  return result;
}

interface ResultEntry {
  userId: string;
  email: string;
  dayN: number | null;
  activated: boolean;
  status:
    | "sent"
    | "would_send"
    | "failed"
    | "already_claimed"
    | "due_not_ready"
    | "skipped_run_cap"
    | "none_due";
  emailKey: EmailKey | null;
  reason: string;
  candidates: Candidate[];
}

/** Why a winner exists but isn't ready to actually send this run. */
function explainNotReady(
  winner: Candidate,
  isScheduledHour: boolean,
  currentPacificHour: number,
  sequenceEnabled: boolean,
  monthlyEnabled: boolean
): string {
  const reasons: string[] = [];
  if (winner.emailKey === "packet_back_monthly") {
    if (!monthlyEnabled) reasons.push("EMAIL_MONTHLY_ENABLED is off");
  } else if (!sequenceEnabled) {
    reasons.push("EMAIL_SEQUENCE_ENABLED is off");
  }
  if (winner.emailKey !== "welcome_1" && !isScheduledHour) {
    reasons.push(`waiting for the 8am Pacific run (current Pacific hour is ${currentPacificHour})`);
  }
  return reasons.length > 0 ? reasons.join("; ") : "not ready";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentPacificHour = pacificHour(now);
  const isScheduledHour = currentPacificHour === 8;
  const currentPeriod = utcQuotaMonth(now);

  const queryDryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const forceMonthly = req.nextUrl.searchParams.get("forceMonthly") === "1";

  const sequenceEnabled = process.env.EMAIL_SEQUENCE_ENABLED === "true" && !queryDryRun;
  const monthlyEnabled = process.env.EMAIL_MONTHLY_ENABLED === "true" && !queryDryRun;
  const monthlyStartPeriod = process.env.EMAIL_MONTHLY_START || null;

  let profiles = await loadEmailEligibleProfiles();

  // forceMonthly is a testing-only override (still requires CRON_SECRET,
  // same as every other request here) — restrict the whole run to
  // allowlisted recipients, not just the monthly candidate, so a forced
  // test run can never reach a real user through any of the three
  // candidate sources.
  if (forceMonthly) {
    profiles = profiles.filter((p) => isEmailTestAllowlisted(p.email));
  }

  const userIds = profiles.map((p) => p.id);

  const [sendRows, activationByUser] = await Promise.all([
    getEmailSendRowsForUsers(userIds),
    loadPacketActivationInfo(userIds, currentPeriod),
  ]);

  const { attemptedByUser, sentCapFollowupAtByUser, capFollowupPeriodsByUser, monthlyPeriodsByUser } =
    deriveAttemptedState(sendRows);

  const decisions = profiles.map((profile) => {
    const activation = activationByUser.get(profile.id) ?? null;
    const hitPeriod = profile.last_cap_hit_at ? utcQuotaMonth(new Date(profile.last_cap_hit_at)) : null;

    const state: UserSequenceState = {
      userId: profile.id,
      email: profile.email,
      isPaid: isPaidStatus(profile.subscription_status),
      sequenceStartedAtISO: profile.sequence_started_at,
      attemptedKeys: attemptedByUser.get(profile.id) ?? new Set<EmailKey>(),
      sentCapFollowupAtISO: sentCapFollowupAtByUser.get(profile.id) ?? null,
      firstActivatedPacketAtISO: activation?.firstActivatedAtISO ?? null,
      passesSequenceGate: passesSequenceGate(profile.email, profile.created_at),
      lastCapHitAtISO: profile.last_cap_hit_at,
      stillCapped: isStillCapped(profile.packets_used_this_month, profile.packets_reset_date, now, FREE_PACKET_LIMIT),
      capFollowupAttemptedForHitPeriod: hitPeriod
        ? (capFollowupPeriodsByUser.get(profile.id)?.has(hitPeriod) ?? false)
        : false,
      hasPacketThisUTCQuotaMonth: activation?.hasPacketThisUTCQuotaMonth ?? false,
      monthlyAttemptedForCurrentPeriod: monthlyPeriodsByUser.get(profile.id)?.has(currentPeriod) ?? false,
    };

    const decision = resolveSequenceDecision(
      state,
      now,
      isScheduledHour,
      sequenceEnabled,
      monthlyEnabled,
      monthlyStartPeriod,
      forceMonthly
    );
    return { profile, activation, decision };
  });

  const results: ResultEntry[] = [];
  let sendsThisRun = 0;

  for (const { profile, activation, decision } of decisions) {
    const { winner, candidates, dayN, activated } = decision;

    if (!winner) {
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "none_due",
        emailKey: null,
        reason: "no email due today",
        candidates,
      });
      continue;
    }

    if (!winner.readyToSend) {
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "due_not_ready",
        emailKey: winner.emailKey,
        reason: `${winner.detail} (${explainNotReady(winner, isScheduledHour, currentPacificHour, sequenceEnabled, monthlyEnabled)})`,
        candidates,
      });
      continue;
    }

    if (sendsThisRun >= MAX_SENDS_PER_RUN) {
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "skipped_run_cap",
        emailKey: winner.emailKey,
        reason: `${winner.detail} (this run already hit its ${MAX_SENDS_PER_RUN}-send cap; will retry next run)`,
        candidates,
      });
      continue;
    }

    // Explicit ?dryRun=1 forces report-only even for a winner that's
    // otherwise readyToSend (its own switch is on and the hour matches) —
    // sequenceEnabled/monthlyEnabled above already fold queryDryRun in, so
    // this branch only ever fires from that same override, kept separate
    // here for a clearer status/reason.
    if (queryDryRun) {
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "would_send",
        emailKey: winner.emailKey,
        reason: winner.detail,
        candidates,
      });
      continue;
    }

    // ─── Real send: claim first, then send, then finalize the ledger row ───
    sendsThisRun += 1;

    try {
      const content =
        winner.emailKey === "packet_back_monthly"
          ? buildPacketBackMonthlyEmail({
              userId: profile.id,
              fullName: profile.full_name,
              childName: activation?.latestChildName ?? "your kid",
              theme: activation?.latestTheme ?? "whatever they're into",
            })
          : TEMPLATE_BUILDERS[winner.emailKey]?.({ userId: profile.id, fullName: profile.full_name });

      if (!content) {
        results.push({
          userId: profile.id,
          email: profile.email,
          dayN,
          activated,
          status: "failed",
          emailKey: winner.emailKey,
          reason: `no template builder wired for ${winner.emailKey}`,
          candidates,
        });
        continue;
      }

      const claimed = await claimEmailSend(profile.id, winner.sendKey);
      if (!claimed) {
        results.push({
          userId: profile.id,
          email: profile.email,
          dayN,
          activated,
          status: "already_claimed",
          emailKey: winner.emailKey,
          reason: `email_sends row already exists for "${winner.sendKey}" — not sending again`,
          candidates,
        });
        continue;
      }

      const headers = buildMarketingEmailHeaders(profile.id);
      const sendResult = await sendMarketingEmail({
        to: profile.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        headers,
      });

      if (sendResult.error) {
        await markEmailSendFailed(claimed.id, JSON.stringify(sendResult.error));
        results.push({
          userId: profile.id,
          email: profile.email,
          dayN,
          activated,
          status: "failed",
          emailKey: winner.emailKey,
          reason: sendResult.error.message ?? "Resend returned an error",
          candidates,
        });
      } else {
        await markEmailSendSent(claimed.id, sendResult.data?.id ?? null);
        results.push({
          userId: profile.id,
          email: profile.email,
          dayN,
          activated,
          status: "sent",
          emailKey: winner.emailKey,
          reason: winner.detail,
          candidates,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "failed",
        emailKey: winner.emailKey,
        reason: message,
        candidates,
      });
    }
  }

  const summary = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ResultEntry["status"], number>
  );

  return NextResponse.json({
    queryDryRun,
    sequenceEnabled,
    monthlyEnabled,
    forceMonthly,
    ranAt: now.toISOString(),
    currentPacificHour,
    isScheduledHour,
    currentPeriod,
    considered: profiles.length,
    summary,
    results,
  });
}

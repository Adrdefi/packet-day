import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isPaidStatus } from "@/lib/isPaid";
import type { EmailKey } from "@/lib/emailKeys";
import {
  pacificHour,
  resolveSequenceDecision,
  type Candidate,
  type UserSequenceState,
} from "@/lib/emailSequence";
import { claimEmailSend, getEmailSendRowsForUsers, markEmailSendFailed, markEmailSendSent } from "@/lib/emailSends";
import { buildMarketingEmailHeaders } from "@/lib/emailFooter";
import { sendMarketingEmail } from "@/lib/resend";
import { isEmailTestAllowlisted } from "@/lib/emailTestAllowlist";
import {
  buildCheckinDay1Email,
  buildFaq5Email,
  buildNudge2Email,
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

// Every email this route is allowed to actually send in Phase 4. cap_followup
// and packet_back_monthly are deliberately absent — resolveSequenceDecision
// never generates them as candidates yet, but if that ever changed, the
// dispatch lookup below would come back undefined and getTemplateBuilder
// throws rather than silently mis-sending, so a plug-in-once-Phase-5-lands
// mistake fails loudly instead of quietly.
const TEMPLATE_BUILDERS: Partial<Record<EmailKey, (params: EmailTemplateParams) => EmailContent>> = {
  welcome_1: buildWelcome1Email,
  nudge_2: buildNudge2Email,
  story_3: buildStory3Email,
  faq_5: buildFaq5Email,
  checkin_day1: buildCheckinDay1Email,
  plans_4: buildPlans4Email,
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
  subscription_status: string;
  sequence_started_at: string;
}

interface PacketActivationRow {
  user_id: string;
  created_at: string;
}

async function loadEnrolledProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await getServiceClient()
    .from("profiles")
    .select("id, email, full_name, subscription_status, sequence_started_at")
    .not("sequence_started_at", "is", null)
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

async function loadFirstActivationPerUser(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await getServiceClient()
    .from("packets")
    .select("user_id, created_at")
    .not("generated_content", "is", null)
    .in("user_id", userIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const firstByUser = new Map<string, string>();
  for (const row of (data ?? []) as PacketActivationRow[]) {
    if (!firstByUser.has(row.user_id)) firstByUser.set(row.user_id, row.created_at);
  }
  return firstByUser;
}

interface ResultEntry {
  userId: string;
  email: string;
  dayN: number;
  activated: boolean;
  status:
    | "sent"
    | "would_send"
    | "failed"
    | "already_claimed"
    | "due_waiting_for_hour"
    | "skipped_run_cap"
    | "none_due";
  emailKey: EmailKey | null;
  reason: string;
  candidates: Candidate[];
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentPacificHour = pacificHour(now);
  const isScheduledHour = currentPacificHour === 8;

  const dryRun = process.env.EMAIL_SEQUENCE_ENABLED !== "true" || req.nextUrl.searchParams.get("dryRun") === "1";

  const profiles = await loadEnrolledProfiles();
  const userIds = profiles.map((p) => p.id);

  const [sendRows, firstActivationByUser] = await Promise.all([
    getEmailSendRowsForUsers(userIds),
    loadFirstActivationPerUser(userIds),
  ]);

  const attemptedByUser = new Map<string, Set<EmailKey>>();
  const sentCapFollowupAtByUser = new Map<string, string>();
  for (const row of sendRows) {
    if (!attemptedByUser.has(row.user_id)) attemptedByUser.set(row.user_id, new Set());
    attemptedByUser.get(row.user_id)!.add(row.email_key as EmailKey);
    if (row.email_key === "cap_followup" && row.status === "sent") {
      sentCapFollowupAtByUser.set(row.user_id, row.created_at);
    }
  }

  const decisions = profiles.map((profile) => {
    const state: UserSequenceState = {
      userId: profile.id,
      email: profile.email,
      isPaid: isPaidStatus(profile.subscription_status),
      sequenceStartedAtISO: profile.sequence_started_at,
      attemptedKeys: attemptedByUser.get(profile.id) ?? new Set<EmailKey>(),
      sentCapFollowupAtISO: sentCapFollowupAtByUser.get(profile.id) ?? null,
      firstActivatedPacketAtISO: firstActivationByUser.get(profile.id) ?? null,
    };
    return { profile, decision: resolveSequenceDecision(state, now, isScheduledHour) };
  });

  const results: ResultEntry[] = [];
  let sendsThisRun = 0;

  for (const { profile, decision } of decisions) {
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
        status: "due_waiting_for_hour",
        emailKey: winner.emailKey,
        reason: `${winner.detail} (waiting for the 8am Pacific run — current Pacific hour is ${currentPacificHour})`,
        candidates,
      });
      continue;
    }

    if (!dryRun && sendsThisRun >= MAX_SENDS_PER_RUN) {
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

    if (dryRun) {
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

    const builder = TEMPLATE_BUILDERS[winner.emailKey];
    if (!builder) {
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "failed",
        emailKey: winner.emailKey,
        reason: `no template builder wired for ${winner.emailKey} yet`,
        candidates,
      });
      continue;
    }

    const claimed = await claimEmailSend(profile.id, winner.emailKey);
    if (!claimed) {
      results.push({
        userId: profile.id,
        email: profile.email,
        dayN,
        activated,
        status: "already_claimed",
        emailKey: winner.emailKey,
        reason: "email_sends row already exists for this (user, key) — not sending again",
        candidates,
      });
      continue;
    }

    try {
      const content = builder({ userId: profile.id, fullName: profile.full_name });
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
      await markEmailSendFailed(claimed.id, message);
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
    dryRun,
    ranAt: now.toISOString(),
    currentPacificHour,
    isScheduledHour,
    considered: profiles.length,
    summary,
    results,
  });
}

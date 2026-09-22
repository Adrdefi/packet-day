import type { EmailKey } from "@/lib/emailKeys";
import type { EmailSendRow } from "@/lib/emailSends";

// ─── Pacific calendar time ──────────────────────────────────────────────────
// Every "day N" / "hour 8" / "day of month" computation in this file is
// anchored to America/Los_Angeles, DST aware via the IANA tz database
// Node's Intl already ships with — no extra dependency, no manual offset
// math.

const PACIFIC_TZ = "America/Los_Angeles";

const pacificDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PACIFIC_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const pacificHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  hour: "2-digit",
  hourCycle: "h23",
});

const pacificDayOfMonthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  day: "numeric",
});

/** "YYYY-MM-DD" for the given instant, read in Pacific time. */
export function pacificDateKey(date: Date): string {
  return pacificDateFormatter.format(date);
}

/** 0-23, the Pacific-time hour of the given instant. */
export function pacificHour(date: Date): number {
  return parseInt(pacificHourFormatter.format(date), 10);
}

/** 1-31, the Pacific-time day-of-month of the given instant. */
export function pacificDayOfMonth(date: Date): number {
  return parseInt(pacificDayOfMonthFormatter.format(date), 10);
}

function dateKeyToUTCms(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Whole Pacific calendar days between two instants (laterISO minus
 * earlierISO), e.g. 11:59pm and 12:01am Pacific on consecutive calendar
 * dates are 1 day apart here even though under 3 minutes of wall clock
 * separate them — "day N" counts calendar days, not 24h periods.
 */
export function pacificCalendarDaysBetween(laterISO: string, earlierISO: string): number {
  const laterMs = dateKeyToUTCms(pacificDateKey(new Date(laterISO)));
  const earlierMs = dateKeyToUTCms(pacificDateKey(new Date(earlierISO)));
  return Math.round((laterMs - earlierMs) / 86400000);
}

function withinLastNDays(iso: string, now: Date, days: number): boolean {
  return now.getTime() - new Date(iso).getTime() <= days * 86400000;
}

// ─── UTC quota month (billing/usage boundary — NOT Pacific) ────────────────
// check_and_increment_packet_usage and get_my_packet_usage both key off
// `date_trunc('month', now())` under this project's UTC database session
// timezone (confirmed via `show timezone`) — i.e. the plain UTC calendar
// month, not Pacific. cap_followup and packet_back_monthly's period keys
// and "still capped" / "no packet this month" checks all use this same
// boundary on purpose, so a cap hit at 6pm Pacific on Sept 30 (already
// 1am UTC Oct 1) keys to October, matching what the quota system itself
// would consider October usage.

/** "YYYY-MM" for the given instant, in UTC. */
export function utcQuotaMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/**
 * Mirrors check_and_increment_packet_usage's lazy reset exactly: the
 * stored packets_used_this_month only actually reflects the current UTC
 * month if packets_reset_date is that month; otherwise the real, current
 * usage is 0 even though the column hasn't been written yet (it only
 * updates on the user's next generation call). packetsResetDateISO is a
 * plain date ("YYYY-MM-DD"), already first-of-month, as written by that
 * function.
 */
export function isStillCapped(packetsUsedThisMonth: number, packetsResetDateISO: string, now: Date, freeLimit: number): boolean {
  const resetMonth = packetsResetDateISO.slice(0, 7);
  const currentMonth = utcQuotaMonth(now);
  const effectiveUsed = resetMonth < currentMonth ? 0 : packetsUsedThisMonth;
  return effectiveUsed >= freeLimit;
}

/** The UTC quota month immediately after the given instant's — "YYYY-09" -> "YYYY-10", "YYYY-12" -> "YYYY+1-01". Used by ?forceMonthly=1 to simulate the 1st of next month without waiting for it. */
export function nextUtcQuotaMonth(date: Date): string {
  const [y, m] = utcQuotaMonth(date).split("-").map(Number);
  // Date.UTC's month argument is 0-indexed, so passing the 1-indexed
  // current month `m` directly already lands one month ahead (and
  // Date.UTC itself rolls a 13th "month" over into January of next year).
  return utcQuotaMonth(new Date(Date.UTC(y, m, 1)));
}

export type PeriodicEmailBase = "cap_followup" | "packet_back_monthly";

/** "cap_followup:2026-10" / "packet_back_monthly:2026-10" — the actual email_sends key for a periodic email. A fresh period claims its own slot instead of being blocked forever by the unique constraint after the first send. */
export function buildPeriodicSendKey(base: PeriodicEmailBase, period: string): string {
  return `${base}:${period}`;
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export const CATCH_UP_DAYS = 2;
export const MONTHLY_CATCH_UP_DAYS = 1; // packet_back_monthly: due Pacific day 1, catch-up through day 2 — its own, shorter window
export const ACTIVATION_WINDOW_DAYS = 14; // "within the first 14 days" -> firstActivatedDayN in [0, 13]

export type ScheduledEmailKey = "nudge_2" | "story_3" | "faq_5" | "plans_4";

interface ScheduleEntry {
  emailKey: ScheduledEmailKey;
  dueDay: number;
}

export const NOT_ACTIVATED_SCHEDULE: readonly ScheduleEntry[] = [
  { emailKey: "nudge_2", dueDay: 2 },
  { emailKey: "story_3", dueDay: 5 },
  { emailKey: "faq_5", dueDay: 9 },
];

export const ACTIVATED_SCHEDULE: readonly ScheduleEntry[] = [
  { emailKey: "story_3", dueDay: 5 },
  { emailKey: "plans_4", dueDay: 9 },
  { emailKey: "faq_5", dueDay: 13 },
];

// Lower number = higher priority when more than one email is due the same
// Pacific day (CLAUDE.md rule a/e): cap_followup, then packet_back_monthly,
// then every day-based sequence email (the welcome_1 backstop, then
// checkin_day1, then the rest of the schedule) — matching CLAUDE.md rule b.
const PRIORITY_CAP_FOLLOWUP = 1;
const PRIORITY_PACKET_BACK_MONTHLY = 2;
const PRIORITY_BACKSTOP_WELCOME_1 = 3;
const PRIORITY_CHECKIN_DAY1 = 4;
const PRIORITY_SCHEDULED = 5;

export interface UserSequenceState {
  userId: string;
  email: string;
  isPaid: boolean;

  // Day-based sequence. Null when this user was never enrolled (no
  // welcome_1 was ever eligible for them) — cap_followup and
  // packet_back_monthly don't require this at all.
  sequenceStartedAtISO: string | null;
  /** Every email_key this user already has ANY email_sends row for (pending, sent, or failed), one-shot sequence keys only (bare, e.g. "checkin_day1") — no retries, so any of these is permanently off the table. */
  attemptedKeys: ReadonlySet<EmailKey>;
  /** created_at of this user's most recent 'sent' cap_followup row, ANY period. Null if never sent. Backs rules c and d. */
  sentCapFollowupAtISO: string | null;
  /** created_at of this user's first packet with generated_content present, or null if they haven't activated. Also doubles as packet_back_monthly's "has ever completed a packet" check. */
  firstActivatedPacketAtISO: string | null;

  // cap_followup
  /** Same allowlist/launch-cutoff gate as welcome_1 (lib/emailSequenceGate.ts) — cap_followup never reaches someone who wouldn't have been enrolled in the sequence at all. */
  passesSequenceGate: boolean;
  lastCapHitAtISO: string | null;
  stillCapped: boolean;
  /** True if a cap_followup:<UTC month of lastCapHitAtISO> row already exists — this exact hit has already been followed up on (or is in flight). */
  capFollowupAttemptedForHitPeriod: boolean;

  // packet_back_monthly
  /** True if this user has a completed (generated_content present) packet created in the current UTC quota month. */
  hasPacketThisUTCQuotaMonth: boolean;
  /** True if a packet_back_monthly:<current UTC month> row already exists. */
  monthlyAttemptedForCurrentPeriod: boolean;
}

export interface Candidate {
  emailKey: EmailKey;
  /** The actual email_sends key to claim — equals emailKey for a one-shot sequence email, period-composed for cap_followup/packet_back_monthly. */
  sendKey: string;
  priority: number;
  dueDay: number | null;
  /** False when this candidate is due today but not currently allowed to actually send — either the wrong Pacific hour, or its own switch (EMAIL_SEQUENCE_ENABLED / EMAIL_MONTHLY_ENABLED) is off. Still "due," just not executed this run. */
  readyToSend: boolean;
  detail: string;
}

export interface SequenceDecision {
  userId: string;
  /** Whole Pacific days since sequence_started_at, or null if this user was never enrolled in the day-based sequence at all. */
  dayN: number | null;
  activated: boolean;
  candidates: Candidate[];
  /** Highest-priority candidate this run, or null if nothing is due. */
  winner: Candidate | null;
}

/**
 * Pure decision function — no DB, no network, no Date.now(), no
 * process.env (the caller passes `now` and both enabled switches as
 * explicit booleans) — so it's directly testable and so a dry run and a
 * real run compute the identical decision from the identical inputs.
 */
export function resolveSequenceDecision(
  state: UserSequenceState,
  now: Date,
  isScheduledHour: boolean,
  sequenceEnabled: boolean,
  monthlyEnabled: boolean,
  monthlyStartPeriod: string | null,
  /** The UTC quota month packet_back_monthly evaluates against — normally utcQuotaMonth(now); the caller passes nextUtcQuotaMonth(now) instead when simulating ?forceMonthly=1. Never affects cap_followup, which always computes its own period from `now` directly. */
  monthlyPeriod: string,
  /** ?forceMonthly=1: bypasses EMAIL_MONTHLY_START and the Pacific-hour-8 gate for packet_back_monthly only — day-of-month is still simulated as day 1. Never affects cap_followup or the day-based sequence. */
  forceMonthly: boolean
): SequenceDecision {
  const activated = state.firstActivatedPacketAtISO !== null;
  const candidates: Candidate[] = [];

  // ─── cap_followup ─────────────────────────────────────────────────────────
  if (
    state.passesSequenceGate &&
    !state.isPaid &&
    state.lastCapHitAtISO &&
    state.stillCapped &&
    !state.capFollowupAttemptedForHitPeriod
  ) {
    const hitPeriod = utcQuotaMonth(new Date(state.lastCapHitAtISO));
    const currentPeriod = utcQuotaMonth(now);
    // The hit must belong to the CURRENT UTC quota month, not just be
    // recent — this is what keeps a hit right at a month boundary from
    // straddling into a period its own catch-up window would otherwise
    // still cover (see CLAUDE.md).
    if (hitPeriod === currentPeriod) {
      const daysSinceHit = pacificCalendarDaysBetween(now.toISOString(), state.lastCapHitAtISO);
      if (daysSinceHit >= 0 && daysSinceHit <= CATCH_UP_DAYS) {
        candidates.push({
          emailKey: "cap_followup",
          sendKey: buildPeriodicSendKey("cap_followup", hitPeriod),
          priority: PRIORITY_CAP_FOLLOWUP,
          dueDay: 0,
          readyToSend: sequenceEnabled && isScheduledHour,
          detail: `cap hit ${daysSinceHit} day(s) ago (period ${hitPeriod}), still capped`,
        });
      }
    }
  }

  // ─── packet_back_monthly ────────────────────────────────────────────────
  if (!state.isPaid && activated && !state.hasPacketThisUTCQuotaMonth && !state.monthlyAttemptedForCurrentPeriod) {
    // forceMonthly bypasses both the launch-style EMAIL_MONTHLY_START gate
    // and the Pacific-hour-8 gate (readyToSend below) — it does NOT bypass
    // EMAIL_MONTHLY_ENABLED (still folded into readyToSend) or the caller's
    // own dry-run override, and it never touches cap_followup or the
    // day-based sequence.
    const startOk = forceMonthly || (monthlyStartPeriod !== null && monthlyPeriod >= monthlyStartPeriod);
    if (startOk) {
      const dayOfMonth = forceMonthly ? 1 : pacificDayOfMonth(now);
      if (dayOfMonth >= 1 && dayOfMonth <= 1 + MONTHLY_CATCH_UP_DAYS) {
        candidates.push({
          emailKey: "packet_back_monthly",
          sendKey: buildPeriodicSendKey("packet_back_monthly", monthlyPeriod),
          priority: PRIORITY_PACKET_BACK_MONTHLY,
          dueDay: 1,
          readyToSend: monthlyEnabled && (forceMonthly || isScheduledHour),
          detail: `monthly re-engagement, period ${monthlyPeriod}, Pacific day-of-month ${forceMonthly ? "1 (forced)" : dayOfMonth}`,
        });
      }
    }
  }

  // ─── Day-based sequence (welcome_1 backstop, checkin_day1, schedule) ──────
  // Requires actual enrollment — cap_followup and packet_back_monthly above
  // never do.
  let dayN: number | null = null;
  if (state.sequenceStartedAtISO) {
    dayN = pacificCalendarDaysBetween(now.toISOString(), state.sequenceStartedAtISO);

    // Backstop for a welcome_1 the confirm route stamped but never
    // successfully sent (timeout, transient Resend error,
    // EMAIL_SEQUENCE_ENABLED was off at signup time, etc.). Treated as due
    // day 0 with the same CATCH_UP_DAYS window as every other scheduled
    // email — not unconditional — so that turning EMAIL_SEQUENCE_ENABLED on
    // never floods a backlog of stale welcomes accumulated while it was
    // off: any stamp that's aged past the window simply stops being
    // backstop-eligible, permanently.
    if (!state.attemptedKeys.has("welcome_1") && dayN <= CATCH_UP_DAYS) {
      candidates.push({
        emailKey: "welcome_1",
        sendKey: "welcome_1",
        priority: PRIORITY_BACKSTOP_WELCOME_1,
        dueDay: 0,
        readyToSend: sequenceEnabled,
        detail: `backstop: sequence started day ${dayN} ago, no welcome_1 row yet (within its ${CATCH_UP_DAYS}-day catch-up window)`,
      });
    }

    if (activated) {
      const firstActivatedDayN = pacificCalendarDaysBetween(state.firstActivatedPacketAtISO!, state.sequenceStartedAtISO);

      const checkinEligible =
        firstActivatedDayN < ACTIVATION_WINDOW_DAYS &&
        !state.attemptedKeys.has("checkin_day1") &&
        !state.sentCapFollowupAtISO; // rule c: skip checkin_day1 if cap_followup was already sent

      if (checkinEligible) {
        const dueDay = firstActivatedDayN + 1;
        if (dayN >= dueDay && dayN <= dueDay + CATCH_UP_DAYS) {
          candidates.push({
            emailKey: "checkin_day1",
            sendKey: "checkin_day1",
            priority: PRIORITY_CHECKIN_DAY1,
            dueDay,
            readyToSend: sequenceEnabled && isScheduledHour,
            detail: `activated track: activated on day ${firstActivatedDayN}, checkin_day1 due day ${dueDay}`,
          });
        }
      }

      for (const entry of ACTIVATED_SCHEDULE) {
        if (state.attemptedKeys.has(entry.emailKey)) continue;
        if (dayN < entry.dueDay || dayN > entry.dueDay + CATCH_UP_DAYS) continue;
        if (entry.emailKey === "plans_4") {
          if (state.isPaid) continue; // rule f: never send plans_4 to paying users
          if (state.sentCapFollowupAtISO && withinLastNDays(state.sentCapFollowupAtISO, now, 7)) continue; // rule d
        }
        candidates.push({
          emailKey: entry.emailKey,
          sendKey: entry.emailKey,
          priority: PRIORITY_SCHEDULED,
          dueDay: entry.dueDay,
          readyToSend: sequenceEnabled && isScheduledHour,
          detail: `activated track: day ${dayN}, ${entry.emailKey} due day ${entry.dueDay}`,
        });
      }
    } else {
      for (const entry of NOT_ACTIVATED_SCHEDULE) {
        if (state.attemptedKeys.has(entry.emailKey)) continue;
        if (dayN < entry.dueDay || dayN > entry.dueDay + CATCH_UP_DAYS) continue;
        candidates.push({
          emailKey: entry.emailKey,
          sendKey: entry.emailKey,
          priority: PRIORITY_SCHEDULED,
          dueDay: entry.dueDay,
          readyToSend: sequenceEnabled && isScheduledHour,
          detail: `not-activated track: day ${dayN}, ${entry.emailKey} due day ${entry.dueDay}`,
        });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);

  return {
    userId: state.userId,
    dayN,
    activated,
    candidates,
    winner: candidates[0] ?? null,
  };
}

// ─── Send-row parsing (pure, DB-free — takes already-fetched rows) ─────────

export interface AttemptedState {
  attemptedByUser: Map<string, Set<EmailKey>>;
  sentCapFollowupAtByUser: Map<string, string>;
  capFollowupPeriodsByUser: Map<string, Set<string>>;
  monthlyPeriodsByUser: Map<string, Set<string>>;
}

/**
 * Turns a flat list of email_sends rows into the per-user lookups
 * resolveSequenceDecision's inputs need. A cap_followup or
 * packet_back_monthly row is recognized by prefix (its bare key, or
 * `${key}:<period>`) — not an exact match — so a period-composed key
 * still backs rules c and d and the "already sent this period" checks.
 * Pure and DB-free so it's directly unit-testable against synthetic rows.
 */
export function deriveAttemptedState(rows: readonly EmailSendRow[]): AttemptedState {
  const attemptedByUser = new Map<string, Set<EmailKey>>();
  const sentCapFollowupAtByUser = new Map<string, string>();
  const capFollowupPeriodsByUser = new Map<string, Set<string>>();
  const monthlyPeriodsByUser = new Map<string, Set<string>>();

  for (const row of rows) {
    const isCapFollowup = row.email_key.startsWith("cap_followup");
    const isMonthly = row.email_key.startsWith("packet_back_monthly");

    if (!isCapFollowup && !isMonthly) {
      if (!attemptedByUser.has(row.user_id)) attemptedByUser.set(row.user_id, new Set());
      attemptedByUser.get(row.user_id)!.add(row.email_key as EmailKey);
      continue;
    }

    const colonIdx = row.email_key.indexOf(":");
    const period = colonIdx === -1 ? null : row.email_key.slice(colonIdx + 1);

    if (isCapFollowup) {
      if (row.status === "sent") {
        const existing = sentCapFollowupAtByUser.get(row.user_id);
        if (!existing || new Date(row.created_at).getTime() > new Date(existing).getTime()) {
          sentCapFollowupAtByUser.set(row.user_id, row.created_at);
        }
      }
      if (period) {
        if (!capFollowupPeriodsByUser.has(row.user_id)) capFollowupPeriodsByUser.set(row.user_id, new Set());
        capFollowupPeriodsByUser.get(row.user_id)!.add(period);
      }
    } else if (period) {
      if (!monthlyPeriodsByUser.has(row.user_id)) monthlyPeriodsByUser.set(row.user_id, new Set());
      monthlyPeriodsByUser.get(row.user_id)!.add(period);
    }
  }

  return { attemptedByUser, sentCapFollowupAtByUser, capFollowupPeriodsByUser, monthlyPeriodsByUser };
}

import type { EmailKey } from "@/lib/emailKeys";

// ─── Pacific calendar time ──────────────────────────────────────────────────
// Every "day N" / "hour 8" computation in this file is anchored to
// America/Los_Angeles, DST aware via the IANA tz database Node's Intl
// already ships with — no extra dependency, no manual offset math.

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

/** "YYYY-MM-DD" for the given instant, read in Pacific time. */
export function pacificDateKey(date: Date): string {
  return pacificDateFormatter.format(date);
}

/** 0-23, the Pacific-time hour of the given instant. */
export function pacificHour(date: Date): number {
  return parseInt(pacificHourFormatter.format(date), 10);
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

// ─── Schedule ────────────────────────────────────────────────────────────────

export const CATCH_UP_DAYS = 2;
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
// Pacific day (CLAUDE.md rule a/e). cap_followup will slot in at priority 0
// (ahead of the welcome_1 backstop, per rule b) once Phase 5 builds it —
// nothing here needs to change to add that, just a new candidate push above
// this file's existing ones with priority -1.
const PRIORITY_BACKSTOP_WELCOME_1 = 1;
const PRIORITY_CHECKIN_DAY1 = 2;
const PRIORITY_SCHEDULED = 3;

export interface UserSequenceState {
  userId: string;
  email: string;
  isPaid: boolean;
  sequenceStartedAtISO: string;
  /** Every email_key this user already has ANY email_sends row for (pending, sent, or failed) — no retries, so any of these is permanently off the table. */
  attemptedKeys: ReadonlySet<EmailKey>;
  /** created_at of this user's cap_followup row, only if its status is 'sent'. Null otherwise (never sent, or Phase 5 not built yet). Backs rules c and d. */
  sentCapFollowupAtISO: string | null;
  /** created_at of this user's first packet with generated_content present, or null if they haven't activated. */
  firstActivatedPacketAtISO: string | null;
}

export interface Candidate {
  emailKey: EmailKey;
  priority: number;
  dueDay: number | null;
  /** False for a scheduled-track or checkin_day1 candidate outside the 8am Pacific window this run — still "due" today, just not sent yet. Always true for the welcome_1 backstop. */
  readyToSend: boolean;
  detail: string;
}

export interface SequenceDecision {
  userId: string;
  dayN: number;
  activated: boolean;
  candidates: Candidate[];
  /** Highest-priority candidate this run, or null if nothing is due. */
  winner: Candidate | null;
}

/**
 * Pure decision function — no DB, no network, no Date.now() (the caller
 * passes `now`) — so it's directly testable and so a dry run and a real
 * run compute the identical decision from the identical inputs.
 */
export function resolveSequenceDecision(state: UserSequenceState, now: Date, isScheduledHour: boolean): SequenceDecision {
  const dayN = pacificCalendarDaysBetween(now.toISOString(), state.sequenceStartedAtISO);
  const activated = state.firstActivatedPacketAtISO !== null;
  const candidates: Candidate[] = [];

  // Backstop for a welcome_1 the confirm route stamped but never
  // successfully sent (timeout, transient Resend error, EMAIL_SEQUENCE_ENABLED
  // was off at signup time, etc.). Treated as due day 0 with the same
  // CATCH_UP_DAYS window as every other scheduled email — not unconditional
  // — so that turning EMAIL_SEQUENCE_ENABLED on never floods a backlog of
  // stale welcomes accumulated while it was off: any stamp that's aged
  // past the window simply stops being backstop-eligible, permanently.
  if (!state.attemptedKeys.has("welcome_1") && dayN <= CATCH_UP_DAYS) {
    candidates.push({
      emailKey: "welcome_1",
      priority: PRIORITY_BACKSTOP_WELCOME_1,
      dueDay: 0,
      readyToSend: true,
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
          priority: PRIORITY_CHECKIN_DAY1,
          dueDay,
          readyToSend: isScheduledHour,
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
        priority: PRIORITY_SCHEDULED,
        dueDay: entry.dueDay,
        readyToSend: isScheduledHour,
        detail: `activated track: day ${dayN}, ${entry.emailKey} due day ${entry.dueDay}`,
      });
    }
  } else {
    for (const entry of NOT_ACTIVATED_SCHEDULE) {
      if (state.attemptedKeys.has(entry.emailKey)) continue;
      if (dayN < entry.dueDay || dayN > entry.dueDay + CATCH_UP_DAYS) continue;
      candidates.push({
        emailKey: entry.emailKey,
        priority: PRIORITY_SCHEDULED,
        dueDay: entry.dueDay,
        readyToSend: isScheduledHour,
        detail: `not-activated track: day ${dayN}, ${entry.emailKey} due day ${entry.dueDay}`,
      });
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

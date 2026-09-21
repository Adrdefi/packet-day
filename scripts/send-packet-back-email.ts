/**
 * ONE-TIME campaign: "Your free packet is back" — sent to free-tier users
 * who generated a packet in September 2026 and haven't generated one yet
 * in October (their new free packet is unused). Not part of the app, not
 * wired to any route or cron — run by hand, once, from a developer machine.
 *
 * USAGE
 * -----
 *   node scripts/run-ts.mjs scripts/send-packet-back-email.ts -- --dry-run
 *   node scripts/run-ts.mjs scripts/send-packet-back-email.ts -- --test adrdefi@gmail.com
 *   node scripts/run-ts.mjs scripts/send-packet-back-email.ts -- --schedule
 *
 *   --dry-run       (default) Query, apply overrides, print every recipient
 *                   plus one rendered example. Sends nothing.
 *   --test <email>  Render using the first recipient's data, send ONE real
 *                   email immediately to <email>, subject prefixed "[TEST] ".
 *   --schedule      Sends each email individually (not batched) with
 *                   scheduledAt 2026-10-01T15:00:00Z. Requires typing the
 *                   recipient count to confirm. Logs every send to
 *                   scripts/packet-back-sent.json and refuses to re-send to
 *                   any email already in that file.
 *   --include-new   Also include recipients the query found who are NOT in
 *                   OVERRIDES below (normally excluded — see "NEW" logic).
 *
 * ENV
 * ---
 * .env.local has trailing inline "# ..." comments on some lines that
 * Next.js strips but a naive script does not — loadEnvSafely() below
 * strips them explicitly before anything reads process.env. If a Supabase
 * query fails with what looks like an auth error (stale service-role key
 * has happened before on this machine), the script stops and prints the
 * raw error rather than retrying or working around it.
 *
 * RECIPIENTS
 * ----------
 * profiles where subscription_status is not 'pro', with at least one
 * packet created in September 2026 (UTC) and ZERO packets created in
 * October 2026 (UTC), excluding any email containing "adrdefi". Queried
 * fresh at run time — never hardcoded. child_name/theme come from each
 * recipient's most recent September packet.
 *
 * OVERRIDES win over whatever the database has for first name / theme.
 * Anyone the query returns who is NOT in OVERRIDES is printed as NEW and
 * excluded from sending unless --include-new is passed — their raw data
 * needs a human look first, since it was never reviewed the way the
 * OVERRIDES list was.
 */

import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import readline from "node:readline/promises";

// ─── Env ──────────────────────────────────────────────────────────────────

const __filenameEsm = fileURLToPath(import.meta.url);
const __dirnameEsm = path.dirname(__filenameEsm);

function stripInlineComment(value: string | undefined): string {
  if (!value) return "";
  const idx = value.indexOf(" #");
  return (idx === -1 ? value : value.slice(0, idx)).trim();
}

function loadEnvSafely(): void {
  loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
  // dotenv's own parsing may or may not have stripped a trailing " #..."
  // comment depending on version/quoting — strip again explicitly so a
  // corrupted key is never trusted, matching CLAUDE.md's warning.
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"]) {
    process.env[key] = stripInlineComment(process.env[key]);
  }
}

loadEnvSafely();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY after loading .env.local. Stopping."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

// ─── Constants ────────────────────────────────────────────────────────────

const FROM = "Natalie at Packet Day <hello@packetday.com>";
const REPLY_TO = "hello@packetday.com";
const SUBJECT = "Your free packet is back \u{1F389}"; // 🎉
const LIST_UNSUBSCRIBE = "<mailto:hello@packetday.com?subject=stop>";
const SCHEDULED_AT = "2026-10-01T15:00:00Z"; // 8am Pacific
const SENT_LOG_PATH = path.join(__dirnameEsm, "packet-back-sent.json");

const SEPT_START = "2026-09-01T00:00:00Z";
const SEPT_END = "2026-10-01T00:00:00Z";
const OCT_START = "2026-10-01T00:00:00Z";
const OCT_END = "2026-11-01T00:00:00Z";

// ─── Overrides (win over the database) ─────────────────────────────────────
// firstName: string overrides the DB-derived first name. null means "no
// first name" — greet with "Hi there," instead. Omitted entirely means
// "use whatever the database has."

interface Override {
  firstName?: string | null;
  theme?: string;
}

const OVERRIDES: Record<string, Override> = {
  "bridget_riggs@hotmail.com": { firstName: "Bridget", theme: "bicycles" },
  "itschelseaduke@gmail.com": { firstName: "Chelsea", theme: "Fortnite art, Pokémon, and basketball" },
  "anniedgorence@gmail.com": { firstName: null, theme: "Paw Patrol, spaceships, race cars, and swords" },
  "booandbabyboo2@gmail.com": { theme: "being a realtor" },
  "brandtweisman@gmail.com": { theme: "baseball, music, and Fortnite" },
  "erica.broughton@gmail.com": { theme: "songwriting and music" },
  "lubeck5@sio.midco.net": { theme: "Minecraft, football, and fishing" },
  "missmeganmichele@gmail.com": { theme: "Halloween" },
  "paola_estrada01@yahoo.com": { theme: "Halloween" },
  "pjpayne@cctonline.net": { theme: "gymnastics and roller skating" },
  "priebek07@gmail.com": { theme: "video games, space, and hockey" },
  "sdlover16@yahoo.com": { theme: "Super Kitties" },
  "nattie.riggs@icloud.com": { theme: "dancing in ballet class and baking" },
  "nattiepattieg@gmail.com": { theme: "Fortnite" },
  "riggs.natalie@outlook.com": { theme: "Lego and ballet" },
};

// ─── Possessive helper ──────────────────────────────────────────────────────

function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

// ─── Query ────────────────────────────────────────────────────────────────

interface RawCandidate {
  email: string;
  dbFirstName: string | null;
  childName: string;
  dbTheme: string;
}

function checkFatal(error: { message?: string; code?: string } | null, context: string): void {
  if (!error) return;
  const msg = (error.message ?? "").toLowerCase();
  const looksLikeAuthError =
    msg.includes("jwt") ||
    msg.includes("invalid api key") ||
    msg.includes("apikey") ||
    msg.includes("unauthorized") ||
    error.code === "401" ||
    error.code === "PGRST301";

  if (looksLikeAuthError) {
    console.error(
      `STOP: ${context} failed with what looks like an auth error — not working around it (this has happened before with a stale local SUPABASE_SERVICE_ROLE_KEY):`
    );
  } else {
    console.error(`STOP: ${context} failed:`);
  }
  console.error(error);
  process.exit(1);
}

async function fetchCandidates(): Promise<RawCandidate[]> {
  const { data: septPackets, error: septErr } = await supabase
    .from("packets")
    .select("user_id, child_name, theme, created_at")
    .gte("created_at", SEPT_START)
    .lt("created_at", SEPT_END)
    .order("created_at", { ascending: false });
  checkFatal(septErr, "September packets query");

  const { data: octPackets, error: octErr } = await supabase
    .from("packets")
    .select("user_id")
    .gte("created_at", OCT_START)
    .lt("created_at", OCT_END);
  checkFatal(octErr, "October packets query");

  const octUserIds = new Set((octPackets ?? []).map((p) => p.user_id as string));

  // septPackets is already ordered newest-first, so the first row seen per
  // user_id is their most recent September packet.
  const mostRecentSept = new Map<string, { child_name: string; theme: string }>();
  for (const p of septPackets ?? []) {
    const userId = p.user_id as string;
    if (!mostRecentSept.has(userId) && !octUserIds.has(userId)) {
      mostRecentSept.set(userId, { child_name: p.child_name as string, theme: p.theme as string });
    }
  }

  const eligibleUserIds = [...mostRecentSept.keys()];
  if (eligibleUserIds.length === 0) return [];

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, subscription_status")
    .in("id", eligibleUserIds);
  checkFatal(profErr, "profiles query");

  const candidates: RawCandidate[] = [];
  for (const profile of profiles ?? []) {
    if (profile.subscription_status === "pro") continue;
    const email = (profile.email as string | null) ?? "";
    if (!email || email.toLowerCase().includes("adrdefi")) continue;

    const packet = mostRecentSept.get(profile.id as string);
    if (!packet) continue;

    const fullName = (profile.full_name as string | null) ?? "";
    const dbFirstName = fullName.trim().split(/\s+/)[0] || null;

    candidates.push({
      email,
      dbFirstName,
      childName: packet.child_name,
      dbTheme: packet.theme,
    });
  }

  candidates.sort((a, b) => a.email.localeCompare(b.email));
  return candidates;
}

// ─── Resolve overrides + NEW detection ─────────────────────────────────────

interface Resolved {
  email: string;
  firstName: string | null;
  childName: string;
  possessiveChild: string;
  theme: string;
  greeting: string;
  isNew: boolean;
  dbFirstName: string | null;
  dbTheme: string;
}

function resolveRecipient(raw: RawCandidate): Resolved {
  const override = OVERRIDES[raw.email.toLowerCase()];
  const isNew = !override;

  const firstName =
    override && Object.prototype.hasOwnProperty.call(override, "firstName")
      ? (override.firstName ?? null)
      : raw.dbFirstName;

  const theme = override?.theme ?? raw.dbTheme;
  const possessiveChild = possessive(raw.childName);
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return {
    email: raw.email,
    firstName,
    childName: raw.childName,
    possessiveChild,
    theme,
    greeting,
    isNew,
    dbFirstName: raw.dbFirstName,
    dbTheme: raw.dbTheme,
  };
}

// ─── Email rendering ────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const GENERATE_URL = "https://www.packetday.com/generate?utm_source=email&utm_campaign=packet_back";
const UPGRADE_URL = "https://www.packetday.com/dashboard?upgrade=yearly&utm_source=email&utm_campaign=packet_back";

function renderPlainText(r: Resolved): string {
  return `${r.greeting}

Quick note from me, Natalie. It's a new month, which means your free Packet Day packet is back!

Last month ${r.childName} got a packet all about ${r.theme}. What are they into this week? Dinosaurs, space, a new video game, that one book they won't put down? Tell us, and we'll turn it into a full day of learning in about a minute.

[ Make ${r.possessiveChild} packet ]  → ${GENERATE_URL}

Thanks so much for giving Packet Day a try. It means the world to our little family.

Natalie
Co-founder, Packet Day

P.S. If one packet a month isn't enough, Unlimited is just $9 a month billed yearly, and covers every kid in your house. [See Unlimited] → ${UPGRADE_URL}

Reply "stop" and I won't email you again.`;
}

function renderHtml(r: Resolved): string {
  const greeting = escapeHtml(r.greeting);
  const childName = escapeHtml(r.childName);
  const theme = escapeHtml(r.theme);
  const possessiveChild = escapeHtml(r.possessiveChild);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFBF7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:32px 40px 8px 40px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:20px;font-weight:700;color:#4A7C59;letter-spacing:-0.2px;">Packet Day</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#1A1A2E;">
            <p style="margin:0 0 14px 0;">${greeting}</p>
            <p style="margin:0 0 14px 0;">Quick note from me, Natalie. It's a new month, which means your free Packet Day packet is back!</p>
            <p style="margin:0 0 14px 0;">Last month ${childName} got a packet all about ${theme}. What are they into this week? Dinosaurs, space, a new video game, that one book they won't put down? Tell us, and we'll turn it into a full day of learning in about a minute.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 40px 16px 40px;">
            <a href="${GENERATE_URL}" style="display:inline-block;background-color:#4A7C59;color:#FDFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">Make ${possessiveChild} packet</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 0 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#1A1A2E;">
            <p style="margin:0 0 14px 0;">Thanks so much for giving Packet Day a try. It means the world to our little family.</p>
            <p style="margin:0 0 2px 0;">Natalie</p>
            <p style="margin:0 0 16px 0;font-size:14px;color:#6B6B7A;">Co-founder, Packet Day</p>
            <p style="margin:0 0 14px 0;font-size:14px;color:#1A1A2E;">P.S. If one packet a month isn't enough, Unlimited is just $9 a month billed yearly, and covers every kid in your house. <a href="${UPGRADE_URL}" style="color:#4A7C59;font-weight:700;text-decoration:underline;">See Unlimited</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 32px 40px;">
            <hr style="border:none;border-top:1px solid #F0EAE0;margin:0 0 16px 0;" />
            <p style="margin:0;font-size:12px;color:#9A9AAF;">Reply "stop" and I won't email you again.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function renderEmail(r: Resolved): { subject: string; html: string; text: string } {
  return { subject: SUBJECT, html: renderHtml(r), text: renderPlainText(r) };
}

// ─── Sent log (for --schedule only) ────────────────────────────────────────

interface SentEntry {
  email: string;
  resendId: string | null;
  sentAt: string;
}

function loadSentLog(): Record<string, SentEntry> {
  if (!existsSync(SENT_LOG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SENT_LOG_PATH, "utf-8"));
  } catch (err) {
    console.error(`STOP: ${SENT_LOG_PATH} exists but couldn't be parsed as JSON — refusing to guess:`, err);
    process.exit(1);
  }
}

function saveSentLog(log: Record<string, SentEntry>): void {
  writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2) + "\n", "utf-8");
}

// ─── Modes ──────────────────────────────────────────────────────────────────

function printDryRun(finalList: Resolved[], newOnes: Resolved[]): void {
  console.log(`Recipients (${finalList.length}):\n`);
  for (const r of finalList) {
    console.log(`- ${r.email}`);
    console.log(`    greeting: ${r.greeting}`);
    console.log(`    child: ${r.childName}`);
    console.log(`    possessive: ${r.possessiveChild}`);
    console.log(`    theme: ${r.theme}`);
  }

  if (newOnes.length > 0) {
    console.log(
      `\nNEW — found by the query but NOT in OVERRIDES, excluded unless --include-new (${newOnes.length}):\n`
    );
    for (const r of newOnes) {
      console.log(`- ${r.email}`);
      console.log(`    db first name: ${r.dbFirstName ?? "(none)"}`);
      console.log(`    child: ${r.childName}`);
      console.log(`    db theme: ${r.dbTheme}`);
    }
  } else {
    console.log(`\nNo NEW recipients outside the override list.`);
  }

  if (finalList.length > 0) {
    const example = finalList[0];
    const { subject, text } = renderEmail(example);
    console.log(`\n--- Example rendering (${example.email}) ---`);
    console.log(`Subject: ${subject}`);
    console.log("");
    console.log(text);
  }

  console.log(`\nTotal final recipient count: ${finalList.length}`);
}

async function runTest(finalList: Resolved[], testEmail: string): Promise<void> {
  if (finalList.length === 0) {
    console.error("No recipients found to source template data from. Nothing sent.");
    process.exit(1);
  }
  const template = finalList[0];
  const { subject, html, text } = renderEmail(template);

  const result = await resend.emails.send({
    from: FROM,
    to: testEmail,
    replyTo: REPLY_TO,
    subject: `[TEST] ${subject}`,
    html,
    text,
    headers: { "List-Unsubscribe": LIST_UNSUBSCRIBE },
  });

  if (result.error) {
    console.error("Resend error:", result.error);
    process.exit(1);
  }

  console.log(`Sent test email to ${testEmail} using template data from ${template.email}.`);
  console.log(`Resend id: ${result.data?.id}`);
}

async function runSchedule(finalList: Resolved[]): Promise<void> {
  if (finalList.length === 0) {
    console.log("No recipients to schedule.");
    return;
  }

  const sentLog = loadSentLog();
  const alreadySent = finalList.filter((r) => r.email.toLowerCase() in sentLog);
  const toSend = finalList.filter((r) => !(r.email.toLowerCase() in sentLog));

  if (alreadySent.length > 0) {
    console.log(
      `${alreadySent.length} recipient(s) already present in ${SENT_LOG_PATH} — skipping to guarantee no double send.`
    );
  }

  if (toSend.length === 0) {
    console.log("Nothing left to schedule.");
    return;
  }

  console.log(`About to schedule ${toSend.length} email(s) for ${SCHEDULED_AT}.`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type the recipient count (${toSend.length}) to confirm: `);
  rl.close();

  if (answer.trim() !== String(toSend.length)) {
    console.error("Confirmation did not match the recipient count. Aborting — nothing sent.");
    process.exit(1);
  }

  for (const r of toSend) {
    const { subject, html, text } = renderEmail(r);
    const result = await resend.emails.send({
      from: FROM,
      to: r.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
      scheduledAt: SCHEDULED_AT,
      headers: { "List-Unsubscribe": LIST_UNSUBSCRIBE },
    });

    if (result.error) {
      console.error(`FAILED for ${r.email} (no retry):`, result.error);
      continue;
    }

    sentLog[r.email.toLowerCase()] = {
      email: r.email,
      resendId: result.data?.id ?? null,
      sentAt: new Date().toISOString(),
    };
    saveSentLog(sentLog);
    console.log(`Scheduled ${r.email} -> Resend id ${result.data?.id}`);
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const includeNew = args.includes("--include-new");

  let mode: "dry-run" | "test" | "schedule" = "dry-run";
  let testEmail: string | null = null;

  if (args.includes("--schedule")) {
    mode = "schedule";
  } else {
    const testIdx = args.indexOf("--test");
    if (testIdx !== -1) {
      mode = "test";
      testEmail = args[testIdx + 1] ?? null;
      if (!testEmail) {
        console.error("--test requires an email argument, e.g. --test adrdefi@gmail.com");
        process.exit(1);
      }
    }
  }

  const candidates = await fetchCandidates();
  const resolved = candidates.map(resolveRecipient);
  const known = resolved.filter((r) => !r.isNew);
  const newOnes = resolved.filter((r) => r.isNew);
  const finalList = includeNew ? resolved : known;

  if (mode === "dry-run") {
    printDryRun(finalList, newOnes);
    return;
  }

  if (mode === "test") {
    await runTest(finalList, testEmail as string);
    return;
  }

  if (mode === "schedule") {
    await runSchedule(finalList);
    return;
  }
}

// Guarded the same way scripts/sweep-packets.ts is — ESM-native
// import.meta.url check, not require.main, since this file runs compiled
// to ESM (see scripts/run-ts.mjs's header).
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  main().catch((err) => {
    console.error("send-packet-back-email failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

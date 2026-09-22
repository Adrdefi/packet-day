import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { EmailKey } from "@/lib/emailKeys";

// Service-role client — email_sends is RLS'd to service_role only (migration
// 015). Same local-getServiceClient() pattern as lib/unsubscribe.ts and
// app/api/generate-packet/route.ts.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

const UNIQUE_VIOLATION = "23505";

export interface ClaimedEmailSend {
  id: string;
}

/**
 * Atomically claims the (user_id, email_key) slot by inserting a 'pending'
 * row. The table's unique (user_id, email_key) constraint IS the claim: a
 * second concurrent or later attempt at the same pair always loses this
 * insert, so at most one caller ever proceeds to actually send. Returns
 * null when the slot was already claimed (by any status — pending, sent,
 * or failed); the caller must treat that as "someone else has this, don't
 * send." No retries — this is by design, see CLAUDE.md's Email sequence
 * section.
 */
export async function claimEmailSend(userId: string, emailKey: EmailKey): Promise<ClaimedEmailSend | null> {
  const { data, error } = await getServiceClient()
    .from("email_sends")
    .insert({ user_id: userId, email_key: emailKey, status: "pending" })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;
    throw error;
  }
  return { id: data.id as string };
}

export async function markEmailSendSent(id: string, resendId: string | null): Promise<void> {
  const { error } = await getServiceClient().from("email_sends").update({ status: "sent", resend_id: resendId }).eq("id", id);
  if (error) throw error;
}

export async function markEmailSendFailed(id: string, errorMessage: string): Promise<void> {
  const { error } = await getServiceClient().from("email_sends").update({ status: "failed", error: errorMessage }).eq("id", id);
  if (error) throw error;
}

export interface EmailSendRow {
  user_id: string;
  email_key: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
}

/**
 * Bulk read for the cron route's collision/dedupe checks — one query for
 * every user this run is considering, rather than one query per user.
 */
export async function getEmailSendRowsForUsers(userIds: string[]): Promise<EmailSendRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await getServiceClient()
    .from("email_sends")
    .select("user_id, email_key, status, created_at")
    .in("user_id", userIds);
  if (error) throw error;
  return (data ?? []) as EmailSendRow[];
}

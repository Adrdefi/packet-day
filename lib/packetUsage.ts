import type { createClient } from "@/lib/supabase/server";
import { isPaidStatus } from "@/lib/isPaid";
import { resolveMascotUrl } from "@/lib/resolveMascotUrl";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface PlanState {
  isPaid: boolean;
  packetsUsed: number;
  /** First of the current quota month, e.g. "2026-09-01". */
  resetDate: string;
  /** Free tier AND this month's packet already used. Never true for a paid account. */
  capped: boolean;
}

/**
 * The one shared read of plan + this month's usage, for server code only
 * (app/dashboard/page.tsx calls it directly; client pages get it through
 * GET /api/plans). Reads the same month boundary check_and_increment_packet_usage
 * uses (get_my_packet_usage, migration 014): profiles.packets_used_this_month
 * and packets_reset_date only actually reset on a user's next generation, so
 * reading them raw shows last month's count until then. Falls back to the raw
 * columns if the RPC errors, so a page never breaks over this.
 */
export async function getPlanState(
  supabase: ServerSupabase,
  userId: string,
  logTag: string
): Promise<PlanState> {
  const [{ data: profile }, { data: usageRows, error: usageError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_status, packets_used_this_month, packets_reset_date")
      .eq("id", userId)
      .single(),
    supabase.rpc("get_my_packet_usage"),
  ]);

  if (usageError) {
    console.error(`[${logTag}] get_my_packet_usage failed, falling back to raw profile columns:`, usageError.message);
  }
  const usage = usageRows?.[0];

  // Anyone not on pro is on the free tier, cancelled included, since
  // PACKET_LIMITS treats cancelled the same as free (1 packet/month).
  const isPaid = isPaidStatus(profile?.subscription_status);
  const packetsUsed: number = usage?.packets_used ?? profile?.packets_used_this_month ?? 0;
  const resetDate: string =
    usage?.reset_date ?? profile?.packets_reset_date ?? new Date().toISOString().slice(0, 10);

  return { isPaid, packetsUsed, resetDate, capped: !isPaid && packetsUsed >= 1 };
}

/**
 * The newest hosted mascot image for this user (optionally for one child),
 * or null. Filters to https URLs in the query itself so old base64 mascots
 * (up to ~900KB each) are never pulled over the wire, then applies
 * resolveMascotUrl's rules so an expired replicate.delivery link is skipped.
 */
export async function getLatestMascotUrl(
  supabase: ServerSupabase,
  userId: string,
  childId?: string | null
): Promise<string | null> {
  let query = supabase
    .from("packets")
    .select("mascot_image_url")
    .eq("user_id", userId)
    .like("mascot_image_url", "https://%")
    .order("created_at", { ascending: false })
    .limit(5);
  if (childId) query = query.eq("child_id", childId);

  const { data } = await query;
  for (const row of data ?? []) {
    const url = resolveMascotUrl(row.mascot_image_url);
    if (url) return url;
  }
  return null;
}

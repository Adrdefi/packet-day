import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChildCard from "@/components/dashboard/ChildCard";
import PacketList from "@/components/dashboard/PacketList";
import UsageBanner from "@/components/dashboard/UsageBanner";
import type { Child, Packet } from "@/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: children },
    { data: packets },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("children")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("packets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("subscription_status, packets_used_this_month")
      .eq("id", user.id)
      .single(),
  ]);

  const childList = (children as Child[]) ?? [];
  const packetList = (packets as Packet[]) ?? [];
  const isFree = (profile?.subscription_status ?? "free") === "free";

  return (
    <div className="space-y-8">
      {/* ── Two-column grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Left: My Kids ──────────────────────────────────────────── */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-2xl font-bold text-dark">
            My Kids
          </h2>

          {childList.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
              <div className="text-4xl mb-3">👧</div>
              <p className="text-sm text-muted">No kids added yet.</p>
            </div>
          )}

          {childList.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}

          <Link
            href="/dashboard/children/new"
            className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-border bg-white hover:border-sage/50 hover:bg-sage/5 text-muted hover:text-sage font-semibold text-sm py-4 rounded-xl transition-colors"
          >
            + Add Another Child
          </Link>
        </section>

        {/* ── Right: Recent Packets ───────────────────────────────────── */}
        <section className="lg:col-span-3 space-y-4">
          <h2 className="font-display text-2xl font-bold text-dark">
            Recent Packets
          </h2>
          <PacketList packets={packetList} children={childList} />
        </section>
      </div>

      {/* ── Free tier usage banner ──────────────────────────────────── */}
      {isFree && (
        <UsageBanner used={profile?.packets_used_this_month ?? 0} limit={3} />
      )}
    </div>
  );
}

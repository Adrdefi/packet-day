import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChildCard from "@/components/dashboard/ChildCard";
import PacketList from "@/components/dashboard/PacketList";
import UsageBanner from "@/components/dashboard/UsageBanner";
import UpgradeCelebration from "@/components/UpgradeCelebration";
import type { Child, Packet } from "@/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const params = await searchParams;
  const showCelebration = params.upgraded === "true";
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
      {showCelebration && <UpgradeCelebration />}
      {/* ── Two-column grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Left: My Kids ──────────────────────────────────────────── */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-2xl font-bold text-dark">
            My Kids
          </h2>

          {childList.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-border p-10 text-center">
              <div className="text-6xl mb-4">🌱</div>
              <h3 className="font-display text-xl font-bold text-dark mb-2">
                Your first learner is waiting!
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-6 max-w-xs mx-auto">
                Add a child profile to start generating personalized packets.
              </p>
              <Link
                href="/dashboard/children/new"
                className="inline-block bg-sage text-cream font-bold text-sm py-3 px-6 rounded-xl hover:bg-sage-dark transition-colors"
              >
                Add My First Child →
              </Link>
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

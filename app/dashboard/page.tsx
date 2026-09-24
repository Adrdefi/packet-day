import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChildCard from "@/components/dashboard/ChildCard";
import PacketList from "@/components/dashboard/PacketList";
import UpgradeModalController from "@/components/dashboard/UpgradeModalController";
import UpgradeCelebration from "@/components/UpgradeCelebration";
import { AddChildUpgradeButton } from "@/components/dashboard/UpgradeButtons";
import { getPlanState } from "@/lib/packetUsage";
import { nextFreeDateLabel } from "@/lib/nextFreeDate";
import type { Child, Packet } from "@/types";

export const metadata = { title: "Dashboard" };

type UpgradePlan = "yearly" | "monthly";

function parseUpgradePlan(value: string | undefined): UpgradePlan | null {
  return value === "yearly" || value === "monthly" ? value : null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; upgrade?: string }>;
}) {
  const params = await searchParams;
  const showCelebration = params.upgraded === "true";
  const requestedUpgradePlan = parseUpgradePlan(params.upgrade);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: children },
    { data: packets },
    plan,
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
    // Same plan + usage read as GET /api/plans (lib/packetUsage.ts), so the
    // dashboard, the generate page and the result screen agree on who is
    // out of packets this month.
    getPlanState(supabase, user.id, "dashboard"),
  ]);

  const childList = (children as Child[]) ?? [];
  const packetList = (packets as Packet[]) ?? [];
  // Anyone not on pro is on the free tier, cancelled included.
  const isFree = !plan.isPaid;
  const { packetsUsed, resetDate, capped } = plan;
  // Free plan has room for one child profile; the database enforces it too
  // (migration 018), this just opens the upgrade modal instead of a form
  // that would be refused.
  const atChildLimit = isFree && childList.length >= 1;
  // Fresh server read above (profile.subscription_status) decides this, not
  // client state — a paid user's ?upgrade= is ignored entirely.
  const deepLinkPlan = isFree ? requestedUpgradePlan : null;

  return (
    <div className="space-y-8">
      {showCelebration && <UpgradeCelebration />}
      {/* Owns the one upgrade modal (kid cards, Add Another Child, the usage
          banner it renders after the grid, and ?upgrade= deep links). Paid
          accounts get the grid only. */}
      <UpgradeModalController
        isFree={isFree}
        used={packetsUsed}
        limit={1}
        resetDate={resetDate}
        nextFreeDate={nextFreeDateLabel(resetDate)}
        capped={capped}
        deepLinkPlan={deepLinkPlan}
      >
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
            <ChildCard key={child.id} child={child} capped={capped} />
          ))}

          {atChildLimit ? (
            <AddChildUpgradeButton />
          ) : (
            <Link
              href="/dashboard/children/new"
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-border bg-white hover:border-sage/50 hover:bg-sage/5 text-muted hover:text-sage font-semibold text-sm py-4 rounded-xl transition-colors"
            >
              + Add Another Child
            </Link>
          )}
        </section>

        {/* ── Right: Recent Packets ───────────────────────────────────── */}
        <section className="lg:col-span-3 space-y-4">
          <h2 className="font-display text-2xl font-bold text-dark">
            Recent Packets
          </h2>
          <PacketList packets={packetList} kids={childList} />
        </section>
      </div>
      </UpgradeModalController>
    </div>
  );
}

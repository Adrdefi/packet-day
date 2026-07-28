import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/dashboard/TopBar";
import SignOutButton from "@/components/dashboard/SignOutButton";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, subscription_status")
    .eq("id", user.id)
    .single();

  const planLabel = profile?.subscription_status === "pro" ? "Unlimited" : "Free";

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <TopBar
        fullName={profile?.full_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        subscriptionStatus={profile?.subscription_status ?? "free"}
      />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        <div className="max-w-lg space-y-6">
          <h1 className="font-display text-2xl font-bold text-dark">My Account</h1>

          <div className="bg-white rounded-xl border border-border p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                Email
              </p>
              <p className="text-dark font-semibold">{user.email}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                Plan
              </p>
              <p className="text-dark font-semibold">{planLabel}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-dark mb-1">Manage your kids</p>
              <p className="text-xs text-muted">
                Add, edit, or generate packets for your children from the dashboard.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-bold text-sage hover:text-sage-dark transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-border p-6">
            <SignOutButton />
          </div>
        </div>
      </main>
    </div>
  );
}

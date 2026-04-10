import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/dashboard/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, subscription_status, onboarding_completed")
    .eq("id", user.id)
    .single();

  // Guard: send incomplete accounts back to onboarding
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <TopBar
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
        subscriptionStatus={profile.subscription_status}
      />
      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

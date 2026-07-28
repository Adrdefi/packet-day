"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 text-sm font-bold text-coral hover:text-coral-dark transition-colors"
    >
      <span aria-hidden="true">↪</span>
      Sign Out
    </button>
  );
}

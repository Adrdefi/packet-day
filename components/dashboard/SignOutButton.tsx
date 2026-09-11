"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SignOutButtonProps {
  /** "quiet" is a small, unobtrusive text link for chrome like the onboarding header. */
  variant?: "default" | "quiet";
}

export default function SignOutButton({ variant = "default" }: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (variant === "quiet") {
    return (
      <button
        onClick={handleSignOut}
        className="text-xs text-muted hover:text-dark transition-colors underline underline-offset-2"
      >
        Log out
      </button>
    );
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

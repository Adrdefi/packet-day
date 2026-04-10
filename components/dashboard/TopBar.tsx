"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "🌞" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "☀️" };
  if (hour >= 17 && hour < 22) return { text: "Good evening", emoji: "🌙" };
  return { text: "Hey there", emoji: "⭐" };
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  fullName: string | null;
  avatarUrl: string | null;
  subscriptionStatus: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopBar({
  fullName,
  avatarUrl,
  subscriptionStatus,
}: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { text: greetingText, emoji: greetingEmoji } = getGreeting();
  const firstName = fullName?.split(" ")[0] ?? "there";
  const initial = firstName[0]?.toUpperCase() ?? "?";
  const isFree = subscriptionStatus === "free";

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-display font-bold text-lg text-dark hover:text-sage transition-colors shrink-0"
        >
          <span>📦</span>
          <span className="hidden sm:inline">Packet Day</span>
        </Link>

        {/* Greeting */}
        <div className="flex-1 px-2">
          <p className="font-semibold text-dark text-sm sm:text-base leading-tight">
            {greetingText}, {firstName}! {greetingEmoji}
          </p>
        </div>

        {/* Date — desktop only */}
        <p className="hidden md:block text-sm text-muted shrink-0">
          {formatDate()}
        </p>

        {/* Avatar / user menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="User menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="w-9 h-9 rounded-full bg-sage overflow-hidden flex items-center justify-center text-cream font-bold text-sm hover:bg-sage-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={firstName}
                className="w-full h-full object-cover"
              />
            ) : (
              initial
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-50"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-dark truncate">
                  {fullName ?? firstName}
                </p>
                <p className="text-xs text-muted mt-0.5 capitalize">
                  {subscriptionStatus} plan
                </p>
              </div>

              <Link
                href="/account"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark hover:bg-cream transition-colors"
              >
                <span aria-hidden="true">👤</span>
                My Account
              </Link>

              <Link
                href={isFree ? "/pricing" : "/api/billing-portal"}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark hover:bg-cream transition-colors"
              >
                <span aria-hidden="true">💳</span>
                Manage Billing
              </Link>

              <div className="border-t border-border">
                <button
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-coral hover:bg-coral/5 transition-colors"
                >
                  <span aria-hidden="true">↪</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

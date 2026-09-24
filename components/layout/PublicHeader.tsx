"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "@/components/layout/Wordmark";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { label: "Sample", href: "/sample" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

// Marketing pages are static, so the session is read in the browser.
// getSession() reads the local auth cookie rather than calling Supabase.
function useIsLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return loggedIn;
}

export default function PublicHeader() {
  const pathname = usePathname();
  const loggedIn = useIsLoggedIn();
  const [scrolled, setScrolled] = useState(false);
  // The menu remembers the path it was opened on, so any route change closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const mobileOpen = openedOn === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll and listen for Escape while the mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function closeMobile() {
    setOpenedOn(null);
  }

  return (
    <>
      <header
        className={[
          "sticky top-0 z-50 transition-shadow duration-200",
          "bg-cream border-b",
          scrolled ? "shadow-md border-border" : "border-transparent",
        ].join(" ")}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center min-h-11 font-display font-bold text-dark hover:text-sage transition-colors shrink-0"
          >
            <Wordmark size="xl" hideTextOnSmallPhones />
          </Link>

          {/* Center links, desktop only */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center h-11 text-sm font-semibold text-dark/70 hover:text-sage transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center justify-end gap-2 md:gap-5">
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center h-11 shrink-0 bg-sage text-cream text-sm font-bold px-4 md:px-5 rounded-full hover:bg-sage-dark transition-colors"
              >
                My dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden md:inline-flex items-center h-11 shrink-0 text-sm font-semibold text-dark/70 hover:text-sage transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center h-11 shrink-0 bg-sage text-cream text-sm font-bold px-4 md:px-5 rounded-full hover:bg-sage-dark transition-colors"
                >
                  Try it free
                </Link>
              </>
            )}

            {/* Hamburger, mobile only */}
            <button
              type="button"
              onClick={() => setOpenedOn(pathname)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="md:hidden flex items-center justify-center w-11 h-11 shrink-0 rounded-xl hover:bg-cream-dark transition-colors"
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
                <rect y="0" width="22" height="2.5" rx="1.25" fill="currentColor" />
                <rect y="6.75" width="16" height="2.5" rx="1.25" fill="currentColor" />
                <rect y="13.5" width="22" height="2.5" rx="1.25" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full screen overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-cream flex flex-col md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Overlay header */}
          <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border shrink-0">
            <Link
              href="/"
              onClick={closeMobile}
              className="flex items-center min-h-11 font-display font-bold text-dark"
            >
              <Wordmark size="xl" />
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close menu"
              autoFocus
              className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-cream-dark transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav aria-label="Main" className="flex-1 flex flex-col px-6 py-8 gap-2 overflow-y-auto">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className="flex items-center h-14 font-display text-2xl font-bold text-dark hover:text-sage transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Bottom CTAs */}
          <div className="px-6 pb-10 space-y-3">
            {loggedIn ? (
              <Link
                href="/dashboard"
                onClick={closeMobile}
                className="block w-full text-center bg-sage text-cream font-bold py-4 rounded-xl hover:bg-sage-dark transition-colors text-base"
              >
                My dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={closeMobile}
                  className="block w-full text-center bg-sage text-cream font-bold py-4 rounded-xl hover:bg-sage-dark transition-colors text-base"
                >
                  Try It Free, No Card Needed ✨
                </Link>
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="block w-full text-center border border-border text-dark font-semibold py-4 rounded-xl hover:bg-cream-dark transition-colors text-base"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

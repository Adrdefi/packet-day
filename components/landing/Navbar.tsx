"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <nav
        className={[
          "fixed top-0 left-0 right-0 z-50 transition-shadow duration-200",
          "bg-cream border-b border-transparent",
          scrolled ? "shadow-md border-border" : "",
        ].join(" ")}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold text-xl text-dark hover:text-sage transition-colors shrink-0"
          >
            <span>📦</span>
            <span>Packet Day</span>
          </Link>

          {/* Center links — desktop only */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-sm font-semibold text-dark/70 hover:text-sage transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Desktop CTA */}
            <Link
              href="/signup"
              className="hidden md:inline-flex shrink-0 bg-sage text-cream text-sm font-bold px-5 py-3 rounded-full hover:bg-sage-dark transition-colors"
            >
              Try It Free
            </Link>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl hover:bg-cream-dark transition-colors"
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
                <rect y="0" width="22" height="2.5" rx="1.25" fill="currentColor" />
                <rect y="6.75" width="16" height="2.5" rx="1.25" fill="currentColor" />
                <rect y="13.5" width="22" height="2.5" rx="1.25" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-cream flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Overlay header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-border shrink-0">
            <Link
              href="/"
              onClick={closeMobile}
              className="flex items-center gap-2 font-display font-bold text-xl text-dark"
            >
              <span>📦</span>
              <span>Packet Day</span>
            </Link>
            <button
              onClick={closeMobile}
              aria-label="Close menu"
              className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-cream-dark transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 flex flex-col px-6 py-8 gap-2">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={closeMobile}
                className="flex items-center h-14 font-display text-2xl font-bold text-dark hover:text-sage transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Bottom CTAs */}
          <div className="px-6 pb-10 space-y-3">
            <Link
              href="/signup"
              onClick={closeMobile}
              className="block w-full text-center bg-sage text-cream font-bold py-4 rounded-xl hover:bg-sage-dark transition-colors text-base"
            >
              Try It Free — No Card Needed ✨
            </Link>
            <Link
              href="/login"
              onClick={closeMobile}
              className="block w-full text-center border border-border text-dark font-semibold py-4 rounded-xl hover:bg-cream-dark transition-colors text-base"
            >
              Log In
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

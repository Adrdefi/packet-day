"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
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

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "How It Works", href: "#how-it-works" },
            { label: "Reviews", href: "#reviews" },
            { label: "Pricing", href: "#pricing" },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-semibold text-dark/70 hover:text-sage transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/signup"
          className="shrink-0 bg-sage text-cream text-sm font-bold px-5 py-2.5 rounded-full hover:bg-sage-dark transition-colors"
        >
          Try It Free
        </Link>
      </div>
    </nav>
  );
}

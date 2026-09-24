"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Sections that already carry their own signup button; the bar steps aside
// while any of them is on screen, and never sits on top of the footer.
const HIDE_WHEN_VISIBLE = ["pricing", "final-cta", "site-footer"];

// Phones only. Appears once the hero's main button has scrolled above the
// viewport, so there's always a way to sign up without scrolling back.
export default function MobileStickyCta() {
  const [pastHero, setPastHero] = useState(false);
  const [blockers, setBlockers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const heroCta = document.getElementById("hero-cta");
    const heroObserver = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    if (heroCta) heroObserver.observe(heroCta);

    const blockObserver = new IntersectionObserver((entries) => {
      setBlockers((prev) => {
        const next = new Set(prev);
        for (const entry of entries) {
          if (entry.isIntersecting) next.add(entry.target.id);
          else next.delete(entry.target.id);
        }
        return next;
      });
    });
    for (const id of HIDE_WHEN_VISIBLE) {
      const el = document.getElementById(id);
      if (el) blockObserver.observe(el);
    }

    return () => {
      heroObserver.disconnect();
      blockObserver.disconnect();
    };
  }, []);

  const visible = pastHero && blockers.size === 0;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={[
        "md:hidden fixed inset-x-0 bottom-0 z-40 bg-cream/95 backdrop-blur border-t border-border",
        "px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        "transition-transform duration-200",
        visible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
    >
      <Link
        href="/signup"
        className="flex items-center justify-center w-full h-12 bg-sage text-cream font-bold text-base rounded-full hover:bg-sage-dark transition-colors shadow-sm"
      >
        Make a free packet
      </Link>
    </div>
  );
}

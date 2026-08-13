"use client";

import { useEffect, useState } from "react";
import { TESTIMONIALS } from "@/lib/testimonials";

const QUOTES = TESTIMONIALS.filter((t) => t.verified);

export default function RotatingQuote() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const q = QUOTES[index];

  return (
    <div
      className="mt-auto transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <blockquote className="text-cream/90 text-sm leading-relaxed mb-3 italic">
        &ldquo;{q.abridgedQuote ?? q.quote}&rdquo;
      </blockquote>
      <div className="text-cream/60 text-xs font-semibold">
        — {q.name}, {q.credential}
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mt-4">
        {QUOTES.map((quote, i) => (
          <button
            key={quote.id}
            onClick={() => setIndex(i)}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-5 bg-cream" : "w-1.5 bg-cream/30",
            ].join(" ")}
            aria-label={`Quote ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

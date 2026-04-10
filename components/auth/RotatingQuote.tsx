"use client";

import { useEffect, useState } from "react";

const QUOTES = [
  {
    quote:
      "I had a stomach bug and literally could not get off the couch. Generated three packets from my phone in under five minutes. They did school for the entire day.",
    name: "Jessica M.",
    detail: "Mom of 3 · Grades 1, 3, 6",
  },
  {
    quote:
      "My 7-year-old wants rainbows and unicorns. My 10-year-old wants 'only military history.' They each get exactly what they want and I'm not planning two different school days anymore.",
    name: "Danielle K.",
    detail: "Mom of 4 · Grades 2, 4, 6, 8",
  },
  {
    quote:
      "I was super skeptical about AI-generated anything for my kids. Then my daughter got a packet themed around horses and the AI actually knew things. I was sold.",
    name: "Rachel T.",
    detail: "Mom of 2 · Grades K, 4",
  },
  {
    quote:
      "Within a week, every mom in my co-op had signed up. One texted me at 9pm: 'I just generated a packet about marine biology while lying in bed and I'm emotional about it.'",
    name: "Sarah W.",
    detail: "Co-op organizer · 6 years homeschooling",
  },
];

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
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="text-honey text-sm">
            ⭐
          </span>
        ))}
      </div>
      <blockquote className="text-cream/90 text-sm leading-relaxed mb-3 italic">
        &ldquo;{q.quote}&rdquo;
      </blockquote>
      <div className="text-cream/60 text-xs font-semibold">
        — {q.name}, {q.detail}
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mt-4">
        {QUOTES.map((_, i) => (
          <button
            key={i}
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

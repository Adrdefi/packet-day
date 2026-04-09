"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What ages/grades does Packet Day work for?",
    a: "Kindergarten through 8th grade. The AI generates content specifically for your child's grade level, so the math, reading, and science all match where they are — not a generic worksheet pack. Our own kids (ages 8 and 10) are our daily test pilots!",
  },
  {
    q: "Wait, the packets are made by AI? Are they actually good?",
    a: "Yes — and that's what makes them special. The AI doesn't pull from a pre-made library. It creates original, grade-aligned content from scratch every time, which means your child gets custom material that's tailored to their exact interests and level. You get full answer keys so you can check the quality yourself. We wouldn't put our own kids' names on something we didn't trust.",
  },
  {
    q: "Will this actually keep my kids busy or will they be done in 20 minutes?",
    a: "Each packet is designed for 4–6 hours of engaged learning with PE breaks woven between subjects. That's a full school day — not a 20-minute worksheet they'll blow through before you finish your coffee.",
  },
  {
    q: "My kid is obsessed with something super specific. Will it work?",
    a: "The more specific, the better! That's the beauty of AI — there's no fixed theme list. \"Sharks\" works. \"Marine biology of the Mariana Trench\" works better. \"Only the Megalodon\" — perfect. \"Volcanoes but also unicorns\" — Vivian tested that one. It works. The AI thrives on specificity, so lean into whatever your kid is nerding out about this week.",
  },
  {
    q: "Is this a full curriculum replacement?",
    a: "Packet Day is your backup plan and supplement — not a year-long curriculum. Think of it as the tool that saves you on the hard days, fills gaps between units, or keeps learning going when life throws a curveball. (Which it does. A lot.)",
  },
  {
    q: "I have kids in different grades. Does that work?",
    a: "That's exactly what we built this for! Create a separate profile for each child, and the AI generates grade-appropriate packets for all of them — each with their own theme. Oliver gets his shark packet, Vivian gets her volcano packet, and you get your coffee.",
  },
  {
    q: "Will my kid get the same packet twice?",
    a: "Nope. Every packet is generated fresh by the AI. Even if your kid asks for \"dinosaurs\" five days in a row, they'll get five completely different packets with different problems, passages, and activities. The AI doesn't repeat itself.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. No contracts, no guilt trips, no sneaky cancellation hoops. If it's not working for your family, cancel in one click. You keep access through the end of your billing period.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-white px-6">
      <div className="max-w-3xl mx-auto">
        {/* Label */}
        <div className="text-center mb-4">
          <span className="inline-block bg-sage/10 text-sage text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            You&apos;re Wondering...
          </span>
        </div>

        <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center mb-12">
          Totally fair questions
        </h2>

        <div className="divide-y divide-border">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-4 py-5 text-left group"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-dark text-base leading-snug group-hover:text-sage transition-colors">
                    {faq.q}
                  </span>
                  <span
                    className={[
                      "text-sage mt-0.5 shrink-0 text-xl font-bold transition-transform duration-200",
                      isOpen ? "rotate-45" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-5 text-dark/70 text-sm leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

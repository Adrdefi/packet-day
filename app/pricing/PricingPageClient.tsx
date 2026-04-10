"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FREE_FEATURES = [
  "3 AI-generated packets per month",
  "1 child profile",
  "All core subjects included",
  "Print-ready PDFs",
];

const PRO_FEATURES = [
  "Unlimited AI-generated packets",
  "Unlimited child profiles",
  "Infinite themes — anything they dream up",
  "Answer keys for every packet",
  "Supply lists with household items only",
  "First access to new features",
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel straight from your billing portal — no hoops, no guilt. Your Pro access continues until the end of the billing period.",
  },
  {
    q: "What happens to my packets if I cancel?",
    a: "They're yours. All packets you've generated remain in your account and are still printable.",
  },
  {
    q: "Do you offer refunds?",
    a: "If something went wrong or you're not happy, email us within 7 days and we'll make it right.",
  },
  {
    q: "What's the difference between annual and monthly?",
    a: "Annual billing saves you 25% — that's $27 back in your pocket each year. Monthly gives you flexibility if you want to try it first.",
  },
  {
    q: "Can I use Packet Day for more than one kid?",
    a: "Free plan supports 1 child profile. Pro unlocks unlimited profiles — one for every kid in your house.",
  },
];

interface Props {
  annualPriceId: string;
  monthlyPriceId: string;
}

export default function PricingPageClient({ annualPriceId, monthlyPriceId }: Props) {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const proPrice = isAnnual ? 9 : 12;
  const billingNote = isAnnual ? "Billed annually — save 25%" : "Billed monthly";
  const activePriceId = isAnnual ? annualPriceId : monthlyPriceId;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: activePriceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?next=/pricing");
          return;
        }
        setError(data.error ?? "Something went sideways. Let's try that again.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went sideways. Let's try that again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-display text-xl font-bold text-sage">
          Packet Day
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold text-dark/70 hover:text-dark transition-colors"
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 text-center">
        <span className="inline-block bg-honey/20 text-honey-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          Simple Pricing
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-4 max-w-2xl mx-auto">
          Costs less than the drive-thru.
          <br className="hidden md:block" />
          Does way more for your day.
        </h1>
        <p className="text-dark/60 text-lg max-w-md mx-auto">
          Start free. Upgrade when you&apos;re ready. No pressure, no nonsense.
        </p>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-2 mb-12 px-6">
        <button
          onClick={() => setIsAnnual(true)}
          aria-pressed={isAnnual}
          className={[
            "text-sm font-bold px-5 py-3 rounded-full transition-colors min-w-[110px]",
            isAnnual ? "bg-sage text-cream" : "bg-white text-dark/60 hover:text-dark border border-border",
          ].join(" ")}
        >
          Annual{" "}
          <span className={["text-xs font-semibold ml-1", isAnnual ? "text-honey-light" : "text-sage"].join(" ")}>
            save 25%
          </span>
        </button>
        <button
          onClick={() => setIsAnnual(false)}
          aria-pressed={!isAnnual}
          className={[
            "text-sm font-bold px-5 py-3 rounded-full transition-colors min-w-[110px]",
            !isAnnual ? "bg-sage text-cream" : "bg-white text-dark/60 hover:text-dark border border-border",
          ].join(" ")}
        >
          Monthly
        </button>
      </div>

      {/* Pricing cards */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-border p-8 flex flex-col">
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-dark mb-1">Free</h2>
              <p className="text-sm text-muted mb-6">Dip your toes in — no card needed</p>
              <div className="mb-1">
                <span className="font-display text-5xl font-bold text-dark">$0</span>
                <span className="text-muted text-lg ml-1">/mo</span>
              </div>
              <p className="text-xs text-muted mb-8">Always free</p>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-dark/80">
                    <span className="text-sage mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/signup"
              className="block text-center bg-cream border-2 border-sage text-sage font-bold py-3 px-6 rounded-xl hover:bg-sage hover:text-cream transition-colors"
            >
              Start Free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-sage rounded-2xl p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-honey text-dark text-xs font-bold px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-cream mb-1">Unlimited</h2>
              <p className="text-sm text-cream/75 mb-6">Every kid. Every day. Every wild idea.</p>
              <div className="mb-1">
                <span className="font-display text-5xl font-bold text-cream">${proPrice}</span>
                <span className="text-cream/75 text-lg ml-1">/mo</span>
              </div>
              <p className="text-xs text-cream/60 mb-8">{billingNote}</p>
              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-cream/90">
                    <span className="text-honey mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {error && (
              <p className="text-coral-light text-sm mb-3 font-medium">{error}</p>
            )}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="block w-full text-center bg-cream text-sage font-bold py-3 px-6 rounded-xl hover:bg-cream-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecting…" : "Get Unlimited →"}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-muted mt-8 max-w-md mx-auto">
          That&apos;s less than $0.30/day for a full day of personalized, AI-crafted learning for every kid in your house.
        </p>
      </section>

      {/* Feature comparison table */}
      <section className="px-6 pb-20 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-bold text-dark text-center mb-8">
          What&apos;s included
        </h2>
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 bg-cream-dark px-6 py-3 text-xs font-bold uppercase tracking-wide text-muted">
            <span className="col-span-1">Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-sage">Unlimited</span>
          </div>
          {[
            ["Packets per month", "3", "Unlimited"],
            ["Child profiles", "1", "Unlimited"],
            ["All subjects", "✓", "✓"],
            ["Print-ready PDFs", "✓", "✓"],
            ["Answer keys", "—", "✓"],
            ["Supply lists", "—", "✓"],
            ["Any theme", "✓", "✓"],
            ["Early feature access", "—", "✓"],
          ].map(([feature, free, pro], i) => (
            <div
              key={feature}
              className={[
                "grid grid-cols-3 px-6 py-4 text-sm",
                i % 2 === 0 ? "bg-white" : "bg-cream/50",
              ].join(" ")}
            >
              <span className="text-dark/80 font-medium">{feature}</span>
              <span
                className={[
                  "text-center",
                  free === "—" ? "text-muted" : "text-dark/70",
                ].join(" ")}
              >
                {free}
              </span>
              <span
                className={[
                  "text-center font-semibold",
                  pro === "—" ? "text-muted" : "text-sage",
                ].join(" ")}
              >
                {pro}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-bold text-dark text-center mb-8">
          Questions we get a lot
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-dark hover:text-sage transition-colors"
              >
                {item.q}
                <span
                  className={[
                    "text-sage ml-4 shrink-0 transition-transform",
                    openFaq === i ? "rotate-45" : "",
                  ].join(" ")}
                >
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-sm text-dark/70 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-sage py-16 px-6 text-center">
        <h2 className="font-display text-3xl font-bold text-cream mb-3">
          Ready to make today a good one?
        </h2>
        <p className="text-cream/75 mb-8">
          Join families who stopped dreading the hard days.
        </p>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-honey hover:bg-honey-dark text-dark font-bold py-4 px-8 rounded-xl transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Redirecting…" : `Get Unlimited for $${proPrice}/mo →`}
        </button>
      </section>
    </div>
  );
}

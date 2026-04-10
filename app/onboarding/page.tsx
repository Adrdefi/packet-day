"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ChildForm, { type ChildFormData } from "@/components/ChildForm";

// ─── Confetti burst ───────────────────────────────────────────────────────────

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        color: [
          "#4A7C59",
          "#D4A843",
          "#E07A5F",
          "#6A9E78",
          "#E6C26B",
          "#ECA08A",
        ][Math.floor(Math.random() * 6)],
        delay: `${Math.random() * 0.8}s`,
        width: `${6 + Math.random() * 6}px`,
        height: `${8 + Math.random() * 10}px`,
        duration: `${1.2 + Math.random() * 0.6}s`,
      })),
    []
  );

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm animate-confetti"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const STEPS = [
  { n: 1 as const, label: "You" },
  { n: 2 as const, label: "Your learner" },
  { n: 3 as const, label: "All set!" },
];

function ProgressBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-start w-full max-w-xs mx-auto mb-10">
      {STEPS.map((step, idx) => {
        const done = current > step.n;
        const active = current === step.n;
        return (
          <div key={step.n} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${
                    done
                      ? "bg-sage text-cream"
                      : active
                      ? "bg-sage text-cream ring-4 ring-sage/20"
                      : "bg-cream-dark text-muted border border-border"
                  }
                `}
              >
                {done ? "✓" : step.n}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${
                  active
                    ? "text-sage"
                    : done
                    ? "text-sage/70"
                    : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-4 mx-1.5 rounded-full transition-colors duration-500 ${
                  current > step.n ? "bg-sage" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingChild, setSavingChild] = useState(false);
  const [savedChild, setSavedChild] = useState<{
    name: string;
    avatar: string;
  } | null>(null);
  const [nameError, setNameError] = useState("");

  // Load profile on mount — prefill name, guard against already-onboarded users
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) return router.replace("/dashboard");

      if (profile?.full_name) {
        // Pre-fill with first name only
        setFirstName(profile.full_name.split(" ")[0]);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark onboarding complete as soon as we reach step 3
  useEffect(() => {
    if (step === 3 && userId) {
      supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId)
        .then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, userId]);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");

    if (!firstName.trim()) {
      return setNameError(
        "Tell us your name — we promise to use it kindly."
      );
    }

    setSavingName(true);
    await supabase
      .from("profiles")
      .update({ full_name: firstName.trim() })
      .eq("id", userId!);
    setSavingName(false);
    setStep(2);
  }

  async function handleStep2(data: ChildFormData) {
    setSavingChild(true);
    await supabase.from("children").insert({
      user_id: userId!,
      name: data.name,
      grade_level: data.grade_level,
      learning_style: data.learning_style,
      favorite_subjects: data.favorite_subjects,
      special_notes: data.special_notes || null,
      avatar_emoji: data.avatar_emoji,
    });
    setSavedChild({ name: data.name, avatar: data.avatar_emoji });
    setSavingChild(false);
    setStep(3);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-lg text-dark hover:text-sage transition-colors"
        >
          <span>📦</span>
          <span>Packet Day</span>
        </Link>
        <span className="text-xs text-muted">Setting up your account</span>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-lg">
          <ProgressBar current={step} />

          {/* ── Step 1 — Welcome ─────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-3xl font-bold text-dark mb-3 text-center">
                Welcome to Packet Day! 📦
              </h1>
              <p className="text-dark/60 text-sm text-center mb-8 leading-relaxed max-w-sm mx-auto">
                We&apos;re so glad you&apos;re here. Packet Day was built by a
                homeschool family for homeschool families. Let&apos;s set up your
                first child.
              </p>

              <form onSubmit={handleStep1} className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="first-name"
                    className="text-sm font-semibold text-dark"
                  >
                    What should we call you?
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    placeholder="Your first name"
                    autoFocus
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
                  />
                </div>

                {nameError && (
                  <p className="text-sm text-coral bg-coral/10 rounded-xl px-4 py-3 leading-snug">
                    {nameError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingName}
                  className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 text-sm"
                >
                  {savingName ? "One moment…" : "Let's Go →"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 2 — Child profile ───────────────────────────────── */}
          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl font-bold text-dark mb-3 text-center">
                Tell us about your first learner
              </h1>
              <p className="text-dark/60 text-sm text-center mb-8">
                The more you share, the better the packets.
              </p>
              <ChildForm
                onSubmit={handleStep2}
                loading={savingChild}
                submitLabel="Save and Continue →"
              />
            </div>
          )}

          {/* ── Step 3 — All set! ────────────────────────────────────── */}
          {step === 3 && savedChild && (
            <div className="relative text-center pt-4">
              <ConfettiBurst />

              <div className="relative z-10">
                {/* Avatar circle */}
                <div className="w-24 h-24 rounded-full bg-sage/10 border-4 border-sage/20 flex items-center justify-center text-5xl mx-auto mb-5 shadow-sm">
                  {savedChild.avatar}
                </div>

                <p className="text-sm font-semibold text-sage mb-1">
                  🎉 You&apos;re all set!
                </p>
                <h1 className="font-display text-3xl font-bold text-dark mb-3">
                  Meet {savedChild.avatar} {savedChild.name}!
                </h1>
                <p className="text-dark/60 text-sm mb-10">
                  Your first packet is just one click away.
                </p>

                <Link
                  href="/generate"
                  className="block w-full bg-sage text-cream font-bold py-4 rounded-xl hover:bg-sage-dark transition-colors text-sm mb-4"
                >
                  Generate {savedChild.name}&apos;s First Packet →
                </Link>

                <Link
                  href="/dashboard"
                  className="text-sm text-muted hover:text-dark transition-colors underline underline-offset-2"
                >
                  Go to my dashboard first
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

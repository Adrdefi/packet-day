"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#E07A5F" };
  if (score === 2) return { score, label: "Fair", color: "#D4A843" };
  if (score === 3) return { score, label: "Good", color: "#6A9E78" };
  return { score: 4, label: "Strong", color: "#4A7C59" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i <= score ? color : "#E5E7EB" }}
          />
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color }}>
        {label}
        {score <= 1 && " — try adding numbers or symbols"}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(
        signupError.message.includes("already registered")
          ? "Looks like you already have an account. Try logging in instead."
          : signupError.message
      );
      setLoading(false);
    } else {
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-dark mb-2">
        Start your free account
      </h1>
      <p className="text-dark/60 text-sm mb-8">
        3 free packets every month. No credit card needed.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold text-dark">
            Your name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Natalie"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-dark">
            Your email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-dark">
            Create a password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
          />
          <PasswordStrengthBar password={password} />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-coral bg-coral/10 rounded-xl px-4 py-3 leading-snug">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 text-sm"
        >
          {loading ? "Creating your account…" : "Create My Account →"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-sage font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

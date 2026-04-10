"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (resetError) {
      setError("Something went sideways. Try again in a moment.");
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center text-4xl mb-6">
          📨
        </div>
        <h1 className="font-display text-3xl font-bold text-dark mb-3">
          Check your inbox
        </h1>
        <p className="text-dark/70 leading-relaxed mb-2">
          We sent a reset link to
        </p>
        <p className="font-bold text-sage text-sm mb-6 break-all">{email}</p>
        <p className="text-dark/60 text-sm leading-relaxed mb-8">
          Click the link in the email to choose a new password. It expires in
          1 hour.
        </p>
        <Link
          href="/login"
          className="text-sm text-sage font-semibold hover:underline"
        >
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-dark mb-2">
        Let&apos;s get you back in
      </h1>
      <p className="text-dark/60 text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link right away.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        {error && (
          <p className="text-sm text-coral bg-coral/10 rounded-xl px-4 py-3 leading-snug">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 text-sm"
        >
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Remembered it?{" "}
        <Link href="/login" className="text-sage font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}

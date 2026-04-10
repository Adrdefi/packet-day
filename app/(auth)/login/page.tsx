"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const linkExpired = searchParams.get("error") === "link-expired";

  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    linkExpired ? "That link has expired. Log in below to get back in." : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      const msg = loginError.message ?? "";
      let friendly = "Something went sideways. Let's try that again.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        friendly = "Wrong email or password. Give it another try — or reset your password below.";
      } else if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed")) {
        friendly = "Check your inbox — you need to confirm your email before logging in.";
      } else if (msg.includes("Too many requests") || msg.includes("rate")) {
        friendly = "Too many attempts. Take a quick breather and try again in a minute.";
      }
      setError(friendly);
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold text-dark mb-2">
        Welcome back
      </h1>
      <p className="text-dark/60 text-sm mb-8">
        Good to see you again. Let&apos;s get you in.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-dark">
              Your password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-sage hover:underline font-semibold"
            >
              Forgot your password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
          />
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
          {loading ? "Logging you in…" : "Log In →"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        New here?{" "}
        <Link href="/signup" className="text-sage font-semibold hover:underline">
          Create a free account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

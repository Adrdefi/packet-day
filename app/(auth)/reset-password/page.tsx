"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Exchange the one-time code from the email link for a live session
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError(
        "This link isn't valid. Request a new one from the forgot-password page."
      );
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchErr }) => {
      if (exchErr) {
        setError(
          "This link has expired. Request a new one — they only last 1 hour."
        );
      } else {
        setReady(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match. Give it another go.");
      return;
    }
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setError("Something went wrong updating your password. Try again?");
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  // Success
  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center text-4xl mb-6">
          ✅
        </div>
        <h1 className="font-display text-3xl font-bold text-dark mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-dark/70 text-sm leading-relaxed">
          Your password has been updated. Taking you to your dashboard…
        </p>
      </div>
    );
  }

  // Invalid / expired link
  if (!ready && error) {
    return (
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-coral/10 rounded-full flex items-center justify-center text-4xl mb-6">
          🔗
        </div>
        <h1 className="font-display text-3xl font-bold text-dark mb-3">
          Link expired
        </h1>
        <p className="text-dark/70 text-sm leading-relaxed mb-8">{error}</p>
        <Link
          href="/forgot-password"
          className="inline-block bg-sage text-cream font-bold py-3 px-6 rounded-xl hover:bg-sage-dark transition-colors text-sm"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  // Verifying code
  if (!ready) {
    return (
      <div className="text-center text-muted text-sm">Verifying your link…</div>
    );
  }

  // Password form
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-dark mb-2">
        Choose a new password
      </h1>
      <p className="text-dark/60 text-sm mb-8">
        Make it a good one — you won&apos;t have to do this again for a while.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-dark">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="text-sm font-semibold text-dark">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Same as above"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={[
              "w-full rounded-xl border px-4 py-3 text-dark text-sm placeholder:text-muted",
              "focus:outline-none focus:ring-2 bg-white",
              confirm && confirm !== password
                ? "border-coral focus:ring-coral"
                : "border-border focus:ring-sage focus:border-sage",
            ].join(" ")}
          />
          {confirm && confirm !== password && (
            <p className="text-xs text-coral font-medium">
              Passwords don&apos;t match yet
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-coral bg-coral/10 rounded-xl px-4 py-3 leading-snug">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password || !confirm}
          className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 text-sm"
        >
          {loading ? "Updating…" : "Update My Password →"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

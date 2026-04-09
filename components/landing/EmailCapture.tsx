"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "sample_packet" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Try again?");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Something went sideways. Try again?");
      setStatus("error");
    }
  }

  return (
    <section className="py-20 bg-cream-dark px-6">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-3">
          Get a free sample packet before you sign up
        </h2>
        <p className="text-dark/70 mb-8 leading-relaxed">
          We&apos;ll send you a complete Dinosaur Day packet for a 3rd grader so you can see exactly
          what your kids will get.
        </p>

        {status === "success" ? (
          <div className="bg-sage/10 border border-sage/30 rounded-2xl px-8 py-6">
            <p className="text-2xl mb-2">📦</p>
            <p className="font-bold text-sage text-lg">Check your inbox!</p>
            <p className="text-dark/70 text-sm mt-1">
              Your sample packet is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={status === "loading"}
              className="flex-1 rounded-xl border border-border bg-white px-5 py-3.5 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 bg-sage text-cream font-bold px-6 py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 text-sm"
            >
              {status === "loading" ? "Sending..." : "Send Me the Sample"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-coral text-sm mt-3">{errorMsg}</p>
        )}

        {status !== "success" && (
          <p className="text-xs text-muted mt-4">
            No spam. Just one beautiful packet. Unsubscribe anytime.
          </p>
        )}
      </div>
    </section>
  );
}

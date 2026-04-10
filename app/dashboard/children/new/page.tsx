"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ChildForm, { type ChildFormData } from "@/components/ChildForm";

export default function NewChildPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: ChildFormData) {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { error: insertError } = await supabase.from("children").insert({
      user_id: user.id,
      name: data.name,
      grade_level: data.grade_level,
      learning_style: data.learning_style,
      favorite_subjects: data.favorite_subjects,
      special_notes: data.special_notes || null,
      avatar_emoji: data.avatar_emoji,
    });

    if (insertError) {
      setError("Something went sideways. Let's try that again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark transition-colors"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold text-dark mt-4 mb-1">
          Add a Child
        </h1>
        <p className="text-dark/60 text-sm">
          Tell us about your learner so we can make great packets for them.
        </p>
      </div>

      {error && (
        <p className="text-sm text-coral bg-coral/10 rounded-xl px-4 py-3 mb-6 leading-snug">
          {error}
        </p>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <ChildForm
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Add Child →"
        />
      </div>
    </div>
  );
}

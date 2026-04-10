"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ChildForm, { type ChildFormData } from "@/components/ChildForm";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

export default function NewChildPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: ChildFormData) {
    setLoading(true);

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
      toast.error("Something went sideways. Let's try that again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
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

        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <ChildForm
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="Add Child →"
          />
        </div>
      </div>
    </>
  );
}

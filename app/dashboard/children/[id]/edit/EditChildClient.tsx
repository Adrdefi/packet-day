"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ChildForm, { type ChildFormData } from "@/components/ChildForm";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { Child } from "@/types";

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({
  childName,
  packetCount,
  onConfirm,
  onCancel,
  loading,
}: {
  childName: string;
  packetCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="bg-white rounded-2xl border border-border shadow-xl max-w-sm w-full p-6 space-y-4">
        <p className="text-4xl text-center" aria-hidden="true">
          😬
        </p>
        <h2
          id="delete-dialog-title"
          className="font-display text-xl font-bold text-dark text-center"
        >
          Delete {childName}&apos;s profile?
        </h2>
        <p className="text-sm text-muted text-center leading-relaxed">
          {packetCount > 0
            ? <>This will also delete all <strong className="text-dark">{packetCount} packet{packetCount === 1 ? "" : "s"}</strong> you&apos;ve generated for them. This can&apos;t be undone.</>
            : <>This will permanently remove {childName}&apos;s profile. This can&apos;t be undone.</>
          }
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-border text-dark font-semibold py-2.5 rounded-xl hover:bg-cream transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-coral text-cream font-bold py-2.5 rounded-xl hover:bg-coral-dark transition-colors text-sm disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function EditChildClient({
  child,
  packetCount,
}: {
  child: Child;
  packetCount: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();

  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(data: ChildFormData) {
    setSaving(true);

    const { error: updateError } = await supabase
      .from("children")
      .update({
        name: data.name,
        grade_level: data.grade_level,
        learning_style: data.learning_style,
        favorite_subjects: data.favorite_subjects,
        special_notes: data.special_notes || null,
        avatar_emoji: data.avatar_emoji,
      })
      .eq("id", child.id);

    if (updateError) {
      toast.error("Something went sideways saving the profile. Let's try that again.");
      setSaving(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("children")
      .delete()
      .eq("id", child.id);

    if (deleteError) {
      toast.error("Couldn't delete the profile. Try again in a moment.");
      setDeleting(false);
      setShowDeleteDialog(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {showDeleteDialog && (
        <DeleteDialog
          childName={child.name}
          packetCount={packetCount}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          loading={deleting}
        />
      )}

      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark transition-colors"
          >
            ← Back to dashboard
          </Link>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-12 h-12 rounded-full bg-sage/10 border-2 border-sage/20 flex items-center justify-center text-2xl shrink-0">
              {child.avatar_emoji}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-dark leading-tight">
                Edit {child.name}
              </h1>
              <p className="text-dark/60 text-sm mt-0.5">
                Update {child.name}&apos;s profile anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 mb-6">
          <ChildForm
            onSubmit={handleSubmit}
            loading={saving}
            submitLabel="Save Changes →"
            defaultValues={{
              name: child.name,
              grade_level: child.grade_level,
              learning_style: child.learning_style,
              favorite_subjects: child.favorite_subjects,
              special_notes: child.special_notes ?? "",
              avatar_emoji: child.avatar_emoji,
            }}
          />
        </div>

        {/* Danger zone */}
        <div className="border border-coral/20 rounded-xl p-5 bg-coral/5">
          <h3 className="text-sm font-bold text-dark mb-1">Danger zone</h3>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            Deleting {child.name}&apos;s profile will remove all their past
            packets too. This can&apos;t be undone.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="text-sm font-semibold text-coral hover:text-coral-dark transition-colors underline underline-offset-2"
          >
            Delete {child.name}&apos;s profile
          </button>
        </div>
      </div>
    </>
  );
}

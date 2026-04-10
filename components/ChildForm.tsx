"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChildFormData = {
  name: string;
  grade_level: string; // 'K' | '1' ... '8' — matches DB check constraint
  learning_style: string; // 'visual' | 'hands-on' | 'reader' | 'mixed'
  favorite_subjects: string[];
  special_notes: string;
  avatar_emoji: string;
};

interface ChildFormProps {
  onSubmit: (data: ChildFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  defaultValues?: Partial<ChildFormData>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "1st Grade" },
  { value: "2", label: "2nd Grade" },
  { value: "3", label: "3rd Grade" },
  { value: "4", label: "4th Grade" },
  { value: "5", label: "5th Grade" },
  { value: "6", label: "6th Grade" },
  { value: "7", label: "7th Grade" },
  { value: "8", label: "8th Grade" },
];

const LEARNING_STYLES = [
  {
    value: "visual",
    icon: "👁️",
    label: "Visual Learner",
    description: "Loves diagrams, colors, and seeing ideas on paper",
  },
  {
    value: "hands-on",
    icon: "🔨",
    label: "Hands-On Learner",
    description: "Needs to touch, build, and experiment to understand",
  },
  {
    value: "reader",
    icon: "📚",
    label: "Reader",
    description: "Thrives with books, written instructions, and quiet focus",
  },
  {
    value: "mixed",
    icon: "🌀",
    label: "Mixed",
    description: "Changes day to day — let the AI decide what fits",
  },
];

const SUBJECTS = [
  "Math",
  "Reading & Writing",
  "Science",
  "History & Social Studies",
  "Art & Music",
  "Nature & Outdoors",
  "Creative Writing",
  "Physical Education",
];

const AVATAR_EMOJIS = [
  "🌟", "🦋", "🦕", "🚀", "🌈",
  "🦁", "🐢", "🌊", "🦖", "🔭",
  "🎨", "⚽️", "🎤", "🍔", "🦻",
  "🍚", "🎸", "🦸", "🦉", "🌎",
  "🐝", "🎹", "🐋", "🦴", "🐨",
];

// ─── Inline field error ────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-coral font-medium mt-1.5">
      <span aria-hidden="true">⚠</span>
      {message}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChildForm({
  onSubmit,
  loading = false,
  submitLabel = "Save →",
  defaultValues = {},
}: ChildFormProps) {
  const [name, setName] = useState(defaultValues.name ?? "");
  const [gradeLevel, setGradeLevel] = useState(defaultValues.grade_level ?? "");
  const [learningStyle, setLearningStyle] = useState(
    defaultValues.learning_style ?? ""
  );
  const [subjects, setSubjects] = useState<string[]>(
    defaultValues.favorite_subjects ?? []
  );
  const [notes, setNotes] = useState(defaultValues.special_notes ?? "");
  const [avatar, setAvatar] = useState(defaultValues.avatar_emoji ?? "🌟");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function toggleSubject(subject: string) {
    clearError("subjects");
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all fields and collect errors
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "What's your child's name?";
    if (!gradeLevel) errors.grade = "Pick a grade level to continue.";
    if (!learningStyle) errors.style = "Choose a learning style — even Mixed works great!";
    if (subjects.length === 0) errors.subjects = "Pick at least one favorite subject.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await onSubmit({
      name: name.trim(),
      grade_level: gradeLevel,
      learning_style: learningStyle,
      favorite_subjects: subjects,
      special_notes: notes.trim(),
      avatar_emoji: avatar,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Avatar emoji picker ─────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-dark mb-3">
          Pick an avatar
        </label>
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              className={`
                text-2xl h-12 rounded-xl border-2 transition-all duration-150
                ${
                  avatar === emoji
                    ? "border-sage bg-sage/10 scale-110 shadow-sm"
                    : "border-border bg-white hover:border-sage/40 hover:bg-sage/5"
                }
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* ── Child's name ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="child-name" className="text-sm font-semibold text-dark">
          Child&apos;s name
        </label>
        <input
          id="child-name"
          type="text"
          placeholder="Emma"
          required
          value={name}
          onChange={(e) => { setName(e.target.value); clearError("name"); }}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage ${
            fieldErrors.name ? "border-coral" : "border-border"
          }`}
        />
        {fieldErrors.name && <FieldError message={fieldErrors.name} />}
      </div>

      {/* ── Grade level ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="grade-level"
          className="text-sm font-semibold text-dark"
        >
          Grade level
        </label>
        <div className="relative">
          <select
            id="grade-level"
            required
            value={gradeLevel}
            onChange={(e) => { setGradeLevel(e.target.value); clearError("grade"); }}
            className={`w-full appearance-none rounded-xl border bg-white px-4 py-3 pr-10 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage cursor-pointer ${
              fieldErrors.grade ? "border-coral" : "border-border"
            }`}
          >
            <option value="" disabled>
              Select a grade…
            </option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
            <svg
              width="14"
              height="8"
              viewBox="0 0 14 8"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 1L7 7L13 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        {fieldErrors.grade && <FieldError message={fieldErrors.grade} />}
      </div>

      {/* ── Learning style ──────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-dark mb-3">
          Learning style
        </label>
        <div className="grid grid-cols-2 gap-3">
          {LEARNING_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => { setLearningStyle(style.value); clearError("style"); }}
              className={`
                flex flex-col gap-1.5 p-4 rounded-xl border-2 text-left transition-all duration-150
                ${
                  learningStyle === style.value
                    ? "border-sage bg-sage/10 shadow-sm"
                    : fieldErrors.style
                    ? "border-coral/50 bg-coral/5 hover:border-coral/70"
                    : "border-border bg-white hover:border-sage/40"
                }
              `}
            >
              <span className="text-2xl leading-none">{style.icon}</span>
              <span className="text-sm font-bold text-dark leading-tight">
                {style.label}
              </span>
              <span className="text-xs text-muted leading-snug">
                {style.description}
              </span>
            </button>
          ))}
        </div>
        {fieldErrors.style && <FieldError message={fieldErrors.style} />}
      </div>

      {/* ── Favorite subjects ───────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-dark mb-3">
          Favorite subjects{" "}
          <span className="font-normal text-muted">(pick any that fit)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => {
            const selected = subjects.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                className={`
                  px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-150
                  ${
                    selected
                      ? "bg-sage text-cream border-sage"
                      : fieldErrors.subjects
                      ? "bg-white text-dark border-coral/40 hover:border-coral"
                      : "bg-white text-dark border-border hover:border-sage/50"
                  }
                `}
              >
                {subject}
              </button>
            );
          })}
        </div>
        {fieldErrors.subjects && <FieldError message={fieldErrors.subjects} />}
      </div>

      {/* ── Special notes ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="special-notes"
          className="text-sm font-semibold text-dark"
        >
          Special notes{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="special-notes"
          placeholder="Emma loves dinosaurs and hates worksheets. She gets frustrated with long math problems but loves puzzles."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage resize-none"
        />
      </div>

      {/* ── Submit ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {loading ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

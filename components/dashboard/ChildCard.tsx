import Link from "next/link";
import type { Child } from "@/types";

const GRADE_LABELS: Record<string, string> = {
  K: "Kindergarten",
  "1": "1st Grade",
  "2": "2nd Grade",
  "3": "3rd Grade",
  "4": "4th Grade",
  "5": "5th Grade",
  "6": "6th Grade",
  "7": "7th Grade",
  "8": "8th Grade",
};

const STYLE_LABELS: Record<string, { icon: string; label: string }> = {
  visual: { icon: "👁️", label: "Visual" },
  "hands-on": { icon: "🔨", label: "Hands-On" },
  reader: { icon: "📚", label: "Reader" },
  mixed: { icon: "🌀", label: "Mixed" },
};

export default function ChildCard({ child }: { child: Child }) {
  const style = STYLE_LABELS[child.learning_style] ?? {
    icon: "🌀",
    label: child.learning_style,
  };
  const grade = GRADE_LABELS[child.grade_level] ?? child.grade_level;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      {/* Avatar + info */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-sage/10 border-2 border-sage/20 flex items-center justify-center text-3xl shrink-0">
          {child.avatar_emoji}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold text-dark truncate leading-tight">
            {child.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-muted">{grade}</span>
            <span className="text-muted text-xs" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-xs bg-sage/10 text-sage-dark px-2 py-0.5 rounded-full font-semibold">
              {style.icon} {style.label}
            </span>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <Link
        href={`/generate?child=${child.id}`}
        className="block w-full text-center bg-sage text-cream font-bold py-3 rounded-xl hover:bg-sage-dark transition-colors text-sm"
      >
        Generate Today&apos;s Packet →
      </Link>

      {/* Edit link */}
      <div className="text-center">
        <Link
          href={`/dashboard/children/${child.id}/edit`}
          className="text-xs text-muted hover:text-dark transition-colors underline underline-offset-2"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}

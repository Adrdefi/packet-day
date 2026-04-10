import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ViewCounter } from "./ViewCounter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  subject: string;
  title: string;
  description: string;
  instructions: string[];
  estimated_minutes: number;
  materials?: string[];
}

interface PacketData {
  id: string;
  theme: string;
  grade_level: string;
  packet_length: "half" | "full";
  share_token: string;
  created_at: string;
  generated_content: {
    title: string;
    activities: Activity[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const SUBJECT_EMOJIS: Record<string, string> = {
  math: "🔢",
  reading: "📖",
  writing: "✏️",
  science: "🔬",
  history: "🏛️",
  art: "🎨",
  music: "🎵",
  "pe": "🏃",
  "physical education": "🏃",
  movement: "🏃",
  creative: "🌟",
};

function subjectEmoji(subject: string): string {
  const key = subject.toLowerCase();
  for (const [k, v] of Object.entries(SUBJECT_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return "📚";
}

function subjectColor(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("math")) return "bg-honey/20 text-honey-dark border-honey/30";
  if (s.includes("read") || s.includes("writ") || s.includes("creative"))
    return "bg-sage/15 text-sage-dark border-sage/30";
  if (s.includes("sci") || s.includes("nature"))
    return "bg-sage/10 text-sage-dark border-sage/20";
  if (s.includes("hist") || s.includes("social"))
    return "bg-dark/10 text-dark border-dark/20";
  if (s.includes("art") || s.includes("music"))
    return "bg-honey/15 text-honey-dark border-honey/25";
  if (s.includes("pe") || s.includes("physical") || s.includes("movement"))
    return "bg-coral/10 text-coral-dark border-coral/20";
  return "bg-sage/10 text-sage-dark border-sage/20";
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}): Promise<Metadata> {
  const { shareToken } = await params;
  const supabase = await createClient();

  const { data: packet } = await supabase
    .from("packets")
    .select("theme, grade_level, generated_content")
    .eq("share_token", shareToken)
    .single();

  if (!packet) {
    return { title: "Packet Not Found" };
  }

  const gradeLabel = GRADE_LABELS[packet.grade_level] ?? `Grade ${packet.grade_level}`;
  const title = `${packet.theme} Learning Packet — ${gradeLabel} • Packet Day`;
  const description = `A full day of personalized learning about ${packet.theme}, created by AI for a homeschool family. Free to try.`;
  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og-packet?theme=${encodeURIComponent(packet.theme)}&grade=${encodeURIComponent(gradeLabel)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const supabase = await createClient();

  const { data: packet } = await supabase
    .from("packets")
    .select(
      "id, theme, grade_level, packet_length, share_token, created_at, generated_content"
    )
    .eq("share_token", shareToken)
    .single();

  if (!packet) notFound();

  const p = packet as PacketData;
  const activities = p.generated_content.activities ?? [];
  const preview = activities.slice(0, 2);
  const locked = activities.slice(2);
  const gradeLabel = GRADE_LABELS[p.grade_level] ?? `Grade ${p.grade_level}`;
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/packets/${p.share_token}`;

  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const pinterestShare = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(`${p.theme} learning packet for ${gradeLabel} — made with Packet Day`)}`;
  const smsShare = `sms:?body=${encodeURIComponent(`Check out this ${p.theme} learning packet I made with Packet Day! ${shareUrl}`)}`;

  return (
    <>
      {/* View counter — increments on mount, no visible output */}
      <ViewCounter packetId={p.id} />

      <div className="min-h-screen bg-cream">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="font-display text-lg font-bold text-sage">
              Packet Day
            </Link>
            <Link
              href="/signup"
              className="bg-sage text-cream text-sm font-bold px-4 py-2 rounded-lg hover:bg-sage-dark transition-colors"
            >
              Try it free →
            </Link>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
          {/* ── Cover ────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-8">
            {/* Colored header strip */}
            <div className="h-3 bg-gradient-to-r from-sage via-honey to-coral" />

            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                      Homeschool Learning Packet
                    </span>
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-dark leading-tight mb-2">
                    {p.generated_content.title}
                  </h1>
                  <div className="flex flex-wrap gap-2 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <span>🎓</span> {gradeLabel}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span>🗓️</span> {formatDate(p.created_at)}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span>⏱️</span>{" "}
                      {p.packet_length === "half" ? "Half day" : "Full day"}
                    </span>
                  </div>
                </div>

                {/* Share icons */}
                <div className="flex items-center gap-2">
                  <a
                    href={fbShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Facebook"
                    className="w-9 h-9 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 flex items-center justify-center transition-colors text-[#1877F2] text-lg"
                  >
                    f
                  </a>
                  <a
                    href={pinterestShare}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Pinterest"
                    className="w-9 h-9 rounded-full bg-[#E60023]/10 hover:bg-[#E60023]/20 flex items-center justify-center transition-colors text-[#E60023] font-bold"
                  >
                    P
                  </a>
                  <a
                    href={smsShare}
                    aria-label="Share via text message"
                    className="w-9 h-9 rounded-full bg-sage/10 hover:bg-sage/20 flex items-center justify-center transition-colors text-sage text-base"
                  >
                    💬
                  </a>
                </div>
              </div>

              {/* Theme pill */}
              <div className="inline-flex items-center gap-2 bg-sage/10 text-sage-dark rounded-full px-4 py-1.5 text-sm font-semibold">
                <span>✨</span>
                <span>Theme: {p.theme}</span>
              </div>
            </div>
          </div>

          {/* ── Activity preview ──────────────────────────────────────────── */}
          <h2 className="font-display text-xl font-bold text-dark mb-4">
            A peek inside this packet
          </h2>

          <div className="space-y-4 mb-4">
            {preview.map((activity, i) => (
              <ActivityPreviewCard key={i} activity={activity} />
            ))}
          </div>

          {/* ── Locked activities ─────────────────────────────────────────── */}
          {locked.length > 0 && (
            <div className="relative mb-10">
              {/* Blurred ghost cards */}
              <div className="space-y-4 blur-sm pointer-events-none select-none opacity-70">
                {locked.slice(0, 2).map((activity, i) => (
                  <ActivityPreviewCard key={i} activity={activity} />
                ))}
              </div>

              {/* Lock overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-cream/80 to-cream rounded-2xl">
                <div className="bg-white border border-border rounded-2xl shadow-lg px-8 py-6 text-center max-w-sm mx-auto">
                  <div className="text-3xl mb-3">🔒</div>
                  <p className="font-semibold text-dark mb-1">
                    See {locked.length} more activit{locked.length === 1 ? "y" : "ies"} in this packet
                  </p>
                  <p className="text-sm text-muted mb-4">
                    Create a free account to generate full packets like this one.
                  </p>
                  <Link
                    href="/signup"
                    className="block bg-sage text-cream font-bold px-6 py-3 rounded-xl hover:bg-sage-dark transition-colors text-sm"
                  >
                    Generate a Packet Like This for FREE →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Big CTA ───────────────────────────────────────────────────── */}
          <div className="bg-white border border-border rounded-2xl p-8 md:p-10 text-center mb-10">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-dark mb-3">
              Generate a Packet Like This for FREE
            </h2>
            <p className="text-muted max-w-lg mx-auto mb-6 leading-relaxed">
              Packet Day creates personalized, printable learning packets for
              your child in seconds. Pick any theme — your kid&apos;s favorite
              topic, today&apos;s mood, or whatever gets them out of bed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="bg-sage text-cream font-bold px-8 py-3.5 rounded-xl hover:bg-sage-dark transition-colors text-base"
              >
                Start free — 3 packets on us →
              </Link>
              <Link
                href="/"
                className="border border-border text-dark font-semibold px-8 py-3.5 rounded-xl hover:border-sage/50 transition-colors text-base"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div className="text-center text-sm text-muted pb-6">
            <span>Created with </span>
            <Link href="/" className="font-semibold text-sage hover:underline">
              Packet Day
            </Link>
            <span> · AI-powered learning for homeschool families</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Activity preview card ────────────────────────────────────────────────────

function ActivityPreviewCard({ activity }: { activity: Activity }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <span className="text-xl">{subjectEmoji(activity.subject)}</span>
        <span
          className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${subjectColor(activity.subject)}`}
        >
          {activity.subject}
        </span>
        <span className="ml-auto text-xs text-muted">
          ~{activity.estimated_minutes} min
        </span>
      </div>
      <div className="px-5 py-4">
        <h3 className="font-bold text-dark text-base mb-1">{activity.title}</h3>
        <p className="text-sm text-muted leading-relaxed">{activity.description}</p>
      </div>
    </div>
  );
}

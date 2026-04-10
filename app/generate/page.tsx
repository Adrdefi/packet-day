"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Child, PacketContent } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { emoji: "🐋", text: "Deep Sea Creatures" },
  { emoji: "🚀", text: "Space Exploration" },
  { emoji: "🦕", text: "Megalodons" },
  { emoji: "⚔️", text: "Medieval Knights" },
  { emoji: "🌋", text: "Volcanoes" },
  { emoji: "🎮", text: "Minecraft Biomes" },
  { emoji: "🐝", text: "Bee Colonies" },
  { emoji: "🏰", text: "Ancient Castles" },
  { emoji: "🎵", text: "Music Through History" },
  { emoji: "🦸", text: "Real-Life Superheroes" },
  { emoji: "🍰", text: "Baking Science" },
  { emoji: "🦋", text: "Butterfly Migration" },
  { emoji: "🔭", text: "Stargazing" },
  { emoji: "🌿", text: "Backyard Bugs" },
  { emoji: "🐊", text: "Swamp Ecosystems" },
  { emoji: "🏄", text: "Surf & Wave Physics" },
];

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

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "form" | "generating" | "result";

interface SavedPacket {
  id: string;
  child_name: string;
  theme: string;
  packet_length: string;
  share_token: string;
  pdf_url: string | null;
  created_at: string;
  generated_content: PacketContent;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 5-color rotation matching the PDF design
const ACTIVITY_COLORS = [
  { bar: "#4A7C59", text: "#FDFBF7", bg: "#EFF6F1" }, // sage
  { bar: "#D4A843", text: "#1A1A2E", bg: "#FDF8EC" }, // honey
  { bar: "#E07A5F", text: "#FDFBF7", bg: "#FDF1EE" }, // coral
  { bar: "#7B68EE", text: "#FFFFFF", bg: "#F4F2FF" }, // purple
  { bar: "#5BC0EB", text: "#1A1A2E", bg: "#EBF8FE" }, // sky blue
] as const;

function subjectEmoji(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("math")) return "🔢";
  if (s.includes("read")) return "📚";
  if (s.includes("writ")) return "✏️";
  if (s.includes("sci")) return "🔬";
  if (s.includes("hist") || s.includes("social")) return "🌍";
  if (s.includes("art")) return "🎨";
  if (s.includes("music")) return "🎵";
  if (s.includes("pe") || s.includes("physical") || s.includes("movement")) return "⚽";
  if (s.includes("creative")) return "💡";
  if (s.includes("nature") || s.includes("outdoor")) return "🌿";
  if (s.includes("independent") || s.includes("afternoon")) return "⭐";
  return "📖";
}

function formatResultDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        color: ["#4A7C59", "#D4A843", "#E07A5F", "#6A9E78", "#E6C26B"][
          Math.floor(Math.random() * 5)
        ],
        delay: `${Math.random() * 0.6}s`,
        width: `${5 + Math.random() * 5}px`,
        height: `${7 + Math.random() * 8}px`,
        duration: `${1.1 + Math.random() * 0.5}s`,
      })),
    []
  );

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm animate-confetti"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div className="bg-white border-b border-border sticky top-0 z-40 print:hidden">
      <div className="max-w-3xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-display font-bold text-dark hover:text-sage transition-colors"
        >
          <span>📦</span>
          <span className="hidden sm:inline">Packet Day</span>
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-dark transition-colors"
        >
          ← Dashboard
        </Link>
      </div>
    </div>
  );
}

// ─── Loading view ─────────────────────────────────────────────────────────────

function LoadingView({
  childName,
  childEmoji,
  theme,
  progress,
  msgIndex,
}: {
  childName: string;
  childEmoji: string;
  theme: string;
  progress: number;
  msgIndex: number;
}) {
  const messages = [
    `Picking the best activities for ${childName}...`,
    `Weaving "${theme}" through every lesson...`,
    "Crafting age-appropriate instructions...",
    "Making the math problems feel connected...",
    "Adding fun details only a homeschool mom would think of...",
    "Checking the instructions are easy to follow...",
    "Putting the finishing touches on your packet...",
    "Almost ready...",
  ];

  return (
    <div className="fixed inset-0 bg-cream z-50 flex flex-col items-center justify-center px-6 text-center">
      {/* Pulsing avatar */}
      <div className="w-24 h-24 rounded-full bg-sage/10 border-4 border-sage/20 flex items-center justify-center text-5xl mb-6 animate-pulse">
        {childEmoji}
      </div>

      <h2 className="font-display text-2xl font-bold text-dark mb-2">
        Creating {childName}&apos;s packet...
      </h2>

      {/* Rotating message */}
      <p
        key={msgIndex}
        className="text-muted text-sm mb-8 min-h-[20px]"
      >
        {messages[msgIndex % messages.length]}
      </p>

      {/* Progress bar — animates via CSS transition */}
      <div className="w-full max-w-sm h-2 bg-border rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-sage rounded-full"
          style={{
            width: `${progress}%`,
            transition:
              progress >= 100
                ? "width 0.4s ease"
                : "width 20s cubic-bezier(0.1, 0.6, 0.3, 1)",
          }}
        />
      </div>

      <p className="text-xs text-muted/70">
        Great packets take about 60 seconds. Worth it. ✨
      </p>
    </div>
  );
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  index,
}: {
  activity: PacketContent["activities"][number];
  index: number;
}) {
  const color = ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];

  return (
    <div className="rounded-2xl border border-border shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none">
      {/* Colored header bar */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: color.bar }}
      >
        <span className="text-3xl leading-none shrink-0">
          {subjectEmoji(activity.subject)}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold uppercase tracking-wider mb-0.5"
            style={{ color: color.text, opacity: 0.8 }}
          >
            {activity.subject}
          </p>
          <h3
            className="font-display font-bold text-base leading-snug"
            style={{ color: color.text }}
          >
            {activity.title}
          </h3>
        </div>
        <span
          className="text-xs font-semibold shrink-0 px-2.5 py-1 rounded-full"
          style={{
            color: color.text,
            backgroundColor: "rgba(0,0,0,0.15)",
          }}
        >
          ⏱ {activity.estimated_minutes} min
        </span>
      </div>

      {/* Content */}
      <div
        className="p-5 flex flex-col gap-3"
        style={{ backgroundColor: color.bg }}
      >
        <p className="text-sm text-dark/75 leading-relaxed">
          {activity.description}
        </p>

        {activity.materials && activity.materials.length > 0 && (
          <p className="text-xs text-muted">
            📎 {activity.materials.join(" · ")}
          </p>
        )}

        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
            How to do it
          </p>
          <ol className="space-y-2">
            {activity.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-dark leading-snug">
                <span
                  className="w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: color.bar + "25",
                    color: color.bar,
                  }}
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({
  packet,
  childEmoji,
  onGenerateAnother,
}: {
  packet: SavedPacket;
  childEmoji: string;
  onGenerateAnother: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://packetday.com"}/packets/${packet.share_token}`;

  async function downloadPDF() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate-pdf?packetId=${packet.id}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ??
        "packet.pdf";

      // iOS Safari doesn't support the `download` attribute on anchor tags.
      // Detect iOS and fall back to opening the PDF in a new tab.
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isIOS) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
      // Delay revoke so the browser has time to open it
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error("Couldn't build the PDF right now. Try again, or use the Print button as a backup.");
    } finally {
      setDownloading(false);
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3500);
    } catch {
      // fallback: ignore
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <TopBar />

      <div className="relative">
        <ConfettiBurst />

        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">{childEmoji}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-dark mb-1 leading-tight">
              {packet.generated_content.packet_title ?? packet.generated_content.title}
            </h1>
            <p className="text-muted text-sm">
              {formatResultDate(packet.created_at)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-6 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-sage text-cream font-bold px-6 py-3 rounded-xl hover:bg-sage-dark transition-colors text-sm"
            >
              🖨️ Print This Packet
            </button>
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 bg-honey text-dark font-bold px-6 py-3 rounded-xl hover:bg-honey-dark transition-colors text-sm disabled:opacity-70 disabled:cursor-wait min-w-[180px] justify-center"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Preparing your PDF...
                </>
              ) : (
                <>📤 Download PDF</>
              )}
            </button>
            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 border border-border bg-white text-dark font-semibold px-6 py-3 rounded-xl hover:border-sage/50 transition-colors text-sm min-w-[180px] justify-center"
            >
              🔗 {shareToast ? "Link copied!" : "Copy Share Link"}
            </button>
          </div>

          {/* Share toast + social icons */}
          <div className="flex flex-col items-center gap-3 mb-10 print:hidden">
            {shareToast && (
              <div className="flex items-center gap-2 bg-sage text-cream text-sm font-semibold px-5 py-2.5 rounded-full shadow-md animate-fade-in">
                <span>📦</span>
                <span>Link copied! Share it with your homeschool friends.</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Share:</span>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 flex items-center justify-center font-bold text-[#1877F2] transition-colors"
                aria-label="Share on Facebook"
              >
                f
              </a>
              <a
                href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(`${packet.generated_content.packet_title ?? packet.generated_content.title} — made with Packet Day`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#E60023]/10 hover:bg-[#E60023]/20 flex items-center justify-center font-bold text-[#E60023] transition-colors"
                aria-label="Share on Pinterest"
              >
                P
              </a>
              <a
                href={`sms:?body=${encodeURIComponent(`Check out this learning packet I made with Packet Day! ${shareUrl}`)}`}
                className="w-8 h-8 rounded-full bg-sage/10 hover:bg-sage/20 flex items-center justify-center transition-colors"
                aria-label="Share via text message"
              >
                💬
              </a>
            </div>
          </div>

          {/* Activity cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {packet.generated_content.activities.map((activity, i) => (
              <ActivityCard key={i} activity={activity} index={i} />
            ))}
          </div>

          {/* Secondary actions */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-border print:hidden">
            <button
              onClick={onGenerateAnother}
              className="text-sm font-semibold text-sage hover:text-sage-dark transition-colors underline underline-offset-2"
            >
              Generate another packet
            </button>
            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-dark transition-colors underline underline-offset-2"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main form content ────────────────────────────────────────────────────────

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("form");
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [packetsUsed, setPacketsUsed] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");

  // Form fields
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [theme, setTheme] = useState("");
  const [packetLength, setPacketLength] = useState<"half" | "full">("full");
  const [todayNote, setTodayNote] = useState("");
  const [error, setError] = useState("");

  // Result
  const [result, setResult] = useState<SavedPacket | null>(null);

  // Loading state
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  // Rotating suggestion
  const [suggIdx, setSuggIdx] = useState(
    () => Math.floor(Math.random() * SUGGESTIONS.length)
  );

  const preSelectedId = searchParams.get("child");

  // Load children + profile
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const [{ data: childrenData }, { data: profileData }] =
        await Promise.all([
          supabase
            .from("children")
            .select("*")
            .eq("user_id", user.id)
            .order("display_order"),
          supabase
            .from("profiles")
            .select("subscription_status, packets_used_this_month")
            .eq("id", user.id)
            .single(),
        ]);

      const kids = (childrenData as Child[]) ?? [];
      setChildren(kids);
      setPacketsUsed(profileData?.packets_used_this_month ?? 0);
      setSubscriptionStatus(profileData?.subscription_status ?? "free");

      if (preSelectedId) {
        const match = kids.find((c) => c.id === preSelectedId);
        if (match) setSelectedChild(match);
      }

      setLoadingData(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cycle theme suggestions every 5 seconds
  useEffect(() => {
    const t = setInterval(
      () => setSuggIdx((v) => (v + 1) % SUGGESTIONS.length),
      5000
    );
    return () => clearInterval(t);
  }, []);

  // Progress bar + message cycling during generation
  useEffect(() => {
    if (phase !== "generating") return;

    setProgress(0);
    setMsgIndex(0);

    // Trigger CSS transition to 88% — the transition-duration handles timing
    const triggerPct = setTimeout(() => setProgress(88), 80);

    const msgTimer = setInterval(
      () => setMsgIndex((v) => (v + 1) % 8),
      3000
    );

    return () => {
      clearTimeout(triggerPct);
      clearInterval(msgTimer);
    };
  }, [phase]);

  async function handleGenerate() {
    if (!selectedChild || !theme.trim()) return;

    setError("");
    setPhase("generating");

    try {
      const res = await fetch("/api/generate-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChild.id,
          theme: theme.trim(),
          packetLength,
          specialNotes: todayNote.trim() || undefined,
          date: new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Quota error has a human-readable `message`; other errors use `error`
        throw new Error(
          data.message ?? data.error ?? "Something went sideways generating your packet."
        );
      }

      // Snap to 100% then show result
      setProgress(100);
      await new Promise((r) => setTimeout(r, 700));
      setResult(data.packet as SavedPacket);
      setPhase("result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went sideways. Let's try that again."
      );
      setPhase("form");
      setProgress(0);
    }
  }

  function resetForm() {
    setPhase("form");
    setTheme("");
    setTodayNote("");
    setResult(null);
    setProgress(0);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (phase === "generating" && selectedChild) {
    return (
      <LoadingView
        childName={selectedChild.name}
        childEmoji={selectedChild.avatar_emoji}
        theme={theme}
        progress={progress}
        msgIndex={msgIndex}
      />
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────

  if (phase === "result" && result && selectedChild) {
    return (
      <ResultView
        packet={result}
        childEmoji={selectedChild.avatar_emoji}
        onGenerateAnother={resetForm}
      />
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  const isFree = subscriptionStatus === "free";
  const atLimit = isFree && packetsUsed >= 3;
  const canGenerate = !!selectedChild && !!theme.trim() && !atLimit;
  const suggestion = SUGGESTIONS[suggIdx];

  return (
    <div className="min-h-screen bg-cream">
      <TopBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-10">
        {/* Heading */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-dark mb-1.5">
            What are we learning today?
          </h1>
          {!loadingData && isFree && (
            <p className="text-sm text-muted">
              {atLimit
                ? "You've used all 3 free packets this month."
                : `${packetsUsed} of 3 free packets used this month.`}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-coral/10 border border-coral/30 rounded-xl px-4 py-3 text-sm text-coral-dark leading-snug">
            {error}
          </div>
        )}

        {/* ── 1. Choose a learner ────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-dark">
            1. Choose a learner
          </h2>

          {loadingData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-border/40 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : children.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted mb-3">
                You haven&apos;t added any children yet.
              </p>
              <Link
                href="/dashboard/children/new"
                className="text-sm font-semibold text-sage underline underline-offset-2 hover:text-sage-dark"
              >
                Add your first learner →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {children.map((child) => {
                const selected = selectedChild?.id === child.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChild(child)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      selected
                        ? "border-sage bg-sage/5 shadow-sm"
                        : "border-border bg-white hover:border-sage/40"
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-sage rounded-full flex items-center justify-center text-cream text-xs font-bold">
                        ✓
                      </div>
                    )}
                    <div className="text-3xl mb-2 leading-none">
                      {child.avatar_emoji}
                    </div>
                    <div className="font-display font-bold text-dark text-base leading-tight">
                      {child.name}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {GRADE_LABELS[child.grade_level] ?? child.grade_level}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 2. Theme ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <label
            htmlFor="theme-input"
            className="block font-display text-xl font-bold text-dark"
          >
            2. What are they obsessed with right now?
          </label>
          <input
            id="theme-input"
            type="text"
            placeholder="Dinosaurs, Minecraft, Taylor Swift, baking science..."
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canGenerate && handleGenerate()}
            className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-dark text-base placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
          />
          <p className="text-xs text-muted">
            The more specific the better.{" "}
            <span className="font-semibold text-dark">&ldquo;Megalodons&rdquo;</span>{" "}
            beats{" "}
            <span className="font-semibold text-dark">&ldquo;dinosaurs&rdquo;</span>{" "}
            every time.
          </p>
          {/* Rotating suggestion */}
          <button
            type="button"
            onClick={() => setTheme(suggestion.text)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage bg-sage/8 hover:bg-sage/15 px-3.5 py-1.5 rounded-full transition-colors border border-sage/20"
          >
            <span>{suggestion.emoji}</span>
            <span>Try: {suggestion.text}</span>
          </button>
        </section>

        {/* ── 3. Packet length ───────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-dark">
            3. How much time do you have?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  value: "half",
                  label: "Half Day",
                  desc: "3–4 activities · 1–2 hours",
                  emoji: "🌤",
                },
                {
                  value: "full",
                  label: "Full Day",
                  desc: "5–6 activities · 3–4 hours",
                  emoji: "☀️",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPacketLength(opt.value)}
                className={`flex flex-col gap-1 p-5 rounded-xl border-2 text-left transition-all duration-150 ${
                  packetLength === opt.value
                    ? "border-sage bg-sage/5 shadow-sm"
                    : "border-border bg-white hover:border-sage/40"
                }`}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span className="font-display font-bold text-dark mt-1 text-base">
                  {opt.label}
                </span>
                <span className="text-xs text-muted">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── 4. Today's note ────────────────────────────────────── */}
        <section className="space-y-3">
          <label
            htmlFor="today-note"
            className="block font-display text-xl font-bold text-dark"
          >
            4. Anything else?{" "}
            <span className="text-muted font-normal text-lg">Optional</span>
          </label>
          <textarea
            id="today-note"
            placeholder={`${selectedChild?.name ?? "Emma"} is tired and had a rough morning. Keep it gentle and fun.`}
            rows={3}
            value={todayNote}
            onChange={(e) => setTodayNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-dark text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage resize-none"
          />
        </section>

        {/* ── Generate button ────────────────────────────────────── */}
        <div className="space-y-3 pb-12">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full bg-sage text-cream font-bold py-4 rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base"
          >
            {selectedChild
              ? `Generate ${selectedChild.name}'s Packet • 🚀`
              : "Generate Packet • 🚀"}
          </button>

          {/* Cost badge */}
          <p className="text-center text-xs text-muted">
            {atLimit ? (
              <>
                <span className="text-coral font-semibold">
                  You&apos;re out of free packets this month.{" "}
                </span>
                <Link
                  href="/pricing"
                  className="text-coral font-semibold underline underline-offset-2 hover:text-coral-dark"
                >
                  Upgrade →
                </Link>
              </>
            ) : isFree ? (
              `Uses 1 of your ${3 - packetsUsed} remaining free packet${3 - packetsUsed === 1 ? "" : "s"}`
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-sage rounded-full inline-block" />
                Unlimited — Pro plan
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <p className="text-muted text-sm">Loading...</p>
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}

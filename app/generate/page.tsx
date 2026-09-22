"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Child, PacketContent } from "@/types";
import Wordmark from "@/components/layout/Wordmark";
import { SITE_URL } from "@/lib/site";
import { resolveMascotUrl } from "@/lib/resolveMascotUrl";
import { isPaidStatus } from "@/lib/isPaid";
import { nextFreeDateLabel } from "@/lib/nextFreeDate";
import { safeNext } from "@/lib/safeNext";
import UpgradeModal from "@/components/UpgradeModal";
import PostPacketNudge from "@/components/PostPacketNudge";

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

// ─── Recovery copy ──────────────────────────────────────────────────────────
// Shown when a client-side generation failure is resolved by finding the
// packet the server actually finished (see attemptRecovery in
// GenerateContent), plus the one generic-failure string handleGenerate
// falls back to everywhere else. All four generation-outcome strings live
// here so they can be edited without hunting through the component.
// "Ceiling hit" and "still working" must both read as uncertain, not as a
// broken-product apology — the server may genuinely still be working, and
// "found" must read as good news, not as an apology for something that
// wasn't actually broken.

const GENERATION_COPY = {
  found: "Found it. Your packet finished while your screen was off.",
  stillWorking: "Still working. Hang tight — bigger packets can take a couple of minutes.",
  ceilingHit: "We couldn't confirm that one. Check your recent packets, or try again.",
  genuineFailure: "Something went sideways. Let's try that again.",
} as const;

// Measured from two real full-day generations on 2026-09-14 (~106s and
// ~109s from request start to the packet row existing in the DB). Real
// iPhone repro runs on 2026-09-15 (piano, full-day) came in faster —
// 85-89s — so this has real margin already; not a computed p95 either way
// (sample's too small), and not to be re-tuned until packet_delivered vs.
// packet_recovered gives a real distribution to tune it against. The
// ceiling leaves real margin over the slowest measurement while staying
// well under the route's own 300s maxDuration, so a request that's
// genuinely never coming back doesn't leave the user waiting for the full
// server-side cap.
const RECOVERY_POLL_INTERVAL_MS = 4000;
const RECOVERY_CEILING_MS = 180_000;
// How many polls attemptRecovery runs with nothing found before it admits
// (via the UI copy) that something might be wrong. Purely a display
// decision — the query and the ceiling check above run on the same
// schedule regardless of this value, so it can never delay an actual
// recovery, only how soon the copy stops looking like a normal
// generation. Chosen so a healthy stream surviving a benign background
// blip (the common case — most traffic is iOS, and backgrounding during a
// ~90s wait is routine) almost always wins before this is ever reached.
const RECOVERY_SPEAK_AFTER_POLLS = 2;

// ─── Pending-request persistence ────────────────────────────────────────────
// Survives a page reload mid-generation (the in-memory refs don't). Does NOT
// need to survive closing the tab — sessionStorage is cleared by the browser
// when the tab closes, which is exactly the lifetime a pending generation
// request should have. The ceiling check on read is a second, explicit layer
// on top of that for the same-tab case: a reload minutes later, on a session
// old enough that generation has certainly already resolved one way or
// another, should find nothing rather than start a phantom recovery poll.

const PENDING_REQUEST_STORAGE_KEY = "packetday:pendingGeneration";

interface PendingRequest {
  requestId: string;
  startedAt: number;
}

function readPendingRequest(): PendingRequest | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REQUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.requestId === "string" && typeof parsed?.startedAt === "number") {
      return parsed as PendingRequest;
    }
    return null;
  } catch {
    return null; // sessionStorage unavailable (private mode, etc.) — reload recovery just can't happen; nothing crashes
  }
}

function writePendingRequest(entry: PendingRequest): void {
  try {
    sessionStorage.setItem(PENDING_REQUEST_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // best effort only
  }
}

function clearPendingRequest(): void {
  try {
    sessionStorage.removeItem(PENDING_REQUEST_STORAGE_KEY);
  } catch {
    // best effort only
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "form" | "generating" | "result";

interface SavedPacket {
  id: string;
  child_id: string | null;
  child_name: string;
  grade_level: string;
  theme: string;
  packet_length: string;
  share_token: string;
  pdf_url: string | null;
  mascot_image_url: string | null;
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
          <Wordmark size="base" hideTextOnMobile />
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
  fixedMessage,
}: {
  childName: string;
  childEmoji: string;
  theme: string;
  progress: number;
  msgIndex: number;
  // Overrides the rotating message below — used while recovery is polling
  // for a packet after a lost connection, where the normal "Picking
  // activities..." cycle no longer describes what's actually happening.
  fixedMessage?: string;
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
        key={fixedMessage ?? msgIndex}
        className="text-muted text-sm mb-8 min-h-[20px]"
      >
        {fixedMessage ?? messages[msgIndex % messages.length]}
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
        Great packets take a minute or two. Worth it. ✨
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
  recovered,
}: {
  packet: SavedPacket;
  childEmoji: string;
  onGenerateAnother: () => void;
  // True when this packet was delivered by recovery rather than the live
  // stream — the user saw a loading screen (possibly a "Still working"
  // one) and is now landing here without ever having seen a red banner.
  // Worth a quiet, good-news toast; not worth treating as noteworthy
  // beyond that, since nothing was actually broken.
  recovered?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    if (recovered) toast.success(GENERATION_COPY.found);
    // Fire once on mount only — ResultView mounts fresh each time phase
    // transitions into "result", so this can't refire on a later re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for mascot image until it's ready (generated async after packet save)
  const [mascotImageUrl, setMascotImageUrl] = useState<string | null>(
    packet.mascot_image_url
  );
  const [mascotLoading, setMascotLoading] = useState(!packet.mascot_image_url);

  useEffect(() => {
    if (mascotImageUrl) return; // already have it

    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 60s total

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/packets/${packet.id}/mascot`);
        if (res.ok) {
          const data = await res.json();
          if (data.mascot_image_url) {
            setMascotImageUrl(data.mascot_image_url);
            setMascotLoading(false);
            clearInterval(interval);
            return;
          }
        }
      } catch {
        // network error — keep polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        setMascotLoading(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareUrl = `${SITE_URL}/packets/${packet.share_token}`;

  async function downloadPDF() {
    setDownloading(true);
    try {
      // iOS Safari doesn't support the `download` attribute on anchor tags.
      // Detect iOS and navigate directly to the API URL — bypasses the blob
      // entirely and lets Safari open the PDF natively.
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isIOS) {
        window.location.href = `/api/generate-pdf?packetId=${packet.id}`;
      } else {
        const res = await fetch(`/api/generate-pdf?packetId=${packet.id}`);
        if (!res.ok) throw new Error("PDF generation failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const filename =
          res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ??
          "packet.pdf";
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        // Delay revoke so the browser has time to open it
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch {
      toast.error("Couldn't build the PDF right now. Give it another try, or check your email, we sent you a copy.");
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
          {/* Header — celebration moment: mascot, mascot name, packet title, date */}
          <div className="text-center mb-10">
            {mascotImageUrl ? (
              // Mascot hero image
              <div className="flex flex-col items-center gap-3 mb-4">
                {resolveMascotUrl(mascotImageUrl) ? (
                  // Hosted Supabase Storage URL — safe to optimize via next/image.
                  // Props mirror the share page's mascot hero exactly: loading="eager"
                  // + fetchPriority="low" loads immediately without next/image's own
                  // preload injection (priority/preload are deliberately unset).
                  <Image
                    src={resolveMascotUrl(mascotImageUrl)!}
                    alt={packet.generated_content.mascot_name ?? "Today's mascot"}
                    width={180}
                    height={180}
                    loading="eager"
                    fetchPriority="low"
                    className="w-[180px] h-[180px] rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  // Base64 data URL or a still-live replicate.delivery link — the
                  // packet is seconds old here, so both still display fine. Neither
                  // shape is safe to hand to next/image (data URLs get zero
                  // optimization benefit; replicate.delivery isn't in remotePatterns
                  // and next/image throws on an unconfigured hostname).
                  <img
                    src={mascotImageUrl}
                    alt={packet.generated_content.mascot_name ?? "Today's mascot"}
                    fetchPriority="low"
                    className="w-[180px] h-[180px] rounded-full object-cover border-4 border-white shadow-lg"
                  />
                )}
                {packet.generated_content.mascot_name && (
                  <p className="text-base font-bold text-sage">
                    {packet.generated_content.mascot_name}
                  </p>
                )}
                {packet.generated_content.mascot_emoji_cluster && (
                  <p className="text-xl tracking-widest">
                    {packet.generated_content.mascot_emoji_cluster}
                  </p>
                )}
              </div>
            ) : mascotLoading ? (
              // Mascot generating — pulsing placeholder
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-[180px] h-[180px] rounded-full bg-sage/10 border-4 border-sage/20 flex items-center justify-center animate-pulse">
                  {packet.generated_content.mascot_emoji_cluster ? (
                    <span className="text-4xl">
                      {packet.generated_content.mascot_emoji_cluster.split(" ")[0]}
                    </span>
                  ) : (
                    <span className="text-5xl">{childEmoji}</span>
                  )}
                </div>
                <p className="text-xs text-muted animate-pulse">
                  Creating your mascot...
                </p>
              </div>
            ) : (
              // Fallback: emoji cluster or child avatar (mascot gen failed or skipped)
              <div className="mb-4">
                {packet.generated_content.mascot_emoji_cluster ? (
                  <p className="text-3xl tracking-widest mb-2">
                    {packet.generated_content.mascot_emoji_cluster}
                  </p>
                ) : (
                  <div className="text-5xl mb-2">{childEmoji}</div>
                )}
              </div>
            )}
            <h1 className="font-display text-3xl md:text-4xl font-bold text-dark mb-1 leading-tight">
              {packet.generated_content.packet_title ?? packet.generated_content.title}
            </h1>
            <p className="text-muted text-sm">
              {formatResultDate(packet.created_at)}
            </p>
          </div>

          {/* Primary action */}
          <div className="flex flex-col items-center gap-3 mb-10 print:hidden">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center justify-center gap-2 w-full max-w-md bg-sage text-cream font-bold px-6 py-4 rounded-xl hover:bg-sage-dark transition-colors text-base shadow-sm disabled:opacity-70 disabled:cursor-wait"
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
                <>📤 Download &amp; Print Your Packet</>
              )}
            </button>
            <p className="text-xs text-muted">
              Already sent to your email with the PDF attached.
            </p>

            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 border border-border bg-white text-dark font-semibold px-6 py-3 rounded-xl hover:border-sage/50 transition-colors text-sm min-w-[180px] justify-center"
            >
              🔗 {shareToast ? "Link copied!" : "Send this to a friend"}
            </button>
            {shareToast && (
              <div className="flex items-center gap-2 bg-sage text-cream text-sm font-semibold px-5 py-2.5 rounded-full shadow-md animate-fade-in">
                <span>📦</span>
                <span>Link copied! Share it with a friend who needs a good day.</span>
              </div>
            )}
          </div>

          {/* Activity cards */}
          <h2 className="text-center text-xs font-bold text-muted uppercase tracking-wider mb-4">
            Inside today&apos;s packet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {packet.generated_content.activities.map((activity, i) => (
              <ActivityCard key={i} activity={activity} index={i} />
            ))}
          </div>

          <PostPacketNudge childName={packet.child_name} />

          {/* Social share row */}
          <div className="flex flex-col items-center gap-3 mb-10 print:hidden">
            <p className="text-sm text-muted">
              Made someone&apos;s day easier? Pass it on.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted">
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
                href={`sms:?body=${encodeURIComponent(`Check out this ${packet.theme} learning packet I made with Packet Day! ${shareUrl}`)}`}
                className="w-9 h-9 rounded-full bg-sage/10 hover:bg-sage/20 flex items-center justify-center transition-colors text-sage text-base"
                aria-label="Share via text message"
              >
                💬
              </a>
            </div>
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Identifies the in-flight generate request so a lost connection (iOS
  // backgrounding mid-generation) can be matched back to its packet later —
  // see attemptRecovery below.
  const requestIdRef = useRef<string | null>(null);
  // When handleGenerate fired — the ceiling in attemptRecovery is measured
  // from here, not from whenever recovery happens to kick in (a wake five
  // minutes into generation shouldn't get a fresh 180s allowance).
  const generationStartRef = useRef<number | null>(null);
  // Captured once at mount (see load() below) so attemptRecovery can scope
  // its query by user_id without a redundant getUser() round trip on the
  // failure path. RLS is the real boundary either way — this is belt and
  // suspenders, matching how the rest of this file already queries.
  const userIdRef = useRef<string | null>(null);
  // Guards attemptRecovery against running twice concurrently — the catch
  // block and the visibilitychange listener (added in the next step) will
  // both be able to call it.
  const recoveryInFlightRef = useRef(false);
  // Flipped on unmount so an in-flight recovery poll stops touching state
  // after the component is gone (navigating away mid-poll, etc).
  const recoveryCancelledRef = useRef(false);
  const recoveryPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether *anything* has already delivered a result for the current
  // request — the live stream and a concurrently-running recovery poll (a
  // benign background/foreground blip during otherwise-healthy generation)
  // both check-and-set this immediately before rendering a result, so
  // exactly one of them wins regardless of timing.
  const deliveredRef = useRef(false);
  // Mirrors the `children` state so attemptRecovery can resolve the real
  // avatar_emoji for a recovered packet even on a fresh page load, where
  // selectedChild was never set by the form.
  const childrenRef = useRef<Child[]>([]);

  const [phase, setPhase] = useState<Phase>("form");
  // True once attemptRecovery has polled a couple of times with nothing
  // found — swaps LoadingView's rotating "Picking activities..." messages
  // for the fixed recovery copy. Deliberately NOT set the instant recovery
  // starts: a healthy stream surviving a benign background blip should
  // keep looking like a normal generation, not announce a problem that
  // may resolve within one poll. See RECOVERY_SPEAK_AFTER_POLLS.
  const [recovering, setRecovering] = useState(false);
  // Whether the packet currently in `result` was delivered by the live
  // stream or by recovery — drives ResultView's one-time "Found it..."
  // toast. Reset at the start of every new handleGenerate call.
  const [resultWasRecovered, setResultWasRecovered] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [packetsUsed, setPacketsUsed] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  // For UpgradeModal's "your next free packet arrives {date}" copy — see
  // lib/nextFreeDate.ts. Null until load() resolves.
  const [resetDate, setResetDate] = useState<string | null>(null);

  // Upgrade modal state — opened either by the 403 limit_reached response
  // (source "cap_hit") or the "Upgrade →" link in the cost badge below
  // (source "upgrade_link"). Nothing else about generation, recovery, or
  // the result view is affected by this.
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalSource, setUpgradeModalSource] = useState<"cap_hit" | "upgrade_link">(
    "upgrade_link"
  );

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
      if (!user) {
        const qs = searchParams.toString();
        const rawNext = qs ? `${pathname}?${qs}` : pathname;
        const nextParam = safeNext(rawNext);
        return router.push(nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login");
      }

      userIdRef.current = user.id;

      const [{ data: childrenData }, { data: profileData }, { data: usageRows, error: usageError }] =
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
          // Reads the same month boundary check_and_increment_packet_usage
          // uses (migration 014) — profiles.packets_used_this_month only
          // actually resets on this user's next generation, so reading it
          // raw shows last month's count until then. Falls back to the raw
          // column below if the RPC errors, so this page never breaks.
          supabase.rpc("get_my_packet_usage"),
        ]);

      if (usageError) {
        console.error("[generate] get_my_packet_usage failed, falling back to raw profile column:", usageError.message);
      }
      const usage = usageRows?.[0];

      const kids = (childrenData as Child[]) ?? [];
      setChildren(kids);
      childrenRef.current = kids;
      setPacketsUsed(usage?.packets_used ?? profileData?.packets_used_this_month ?? 0);
      setSubscriptionStatus(profileData?.subscription_status ?? "free");
      if (usage?.reset_date) setResetDate(usage.reset_date);

      if (preSelectedId) {
        const match = kids.find((c) => c.id === preSelectedId);
        if (match) setSelectedChild(match);
      }

      setLoadingData(false);

      // A generation was in flight when this tab last unloaded (a reload,
      // not a tab close — sessionStorage doesn't survive that). Check the
      // ceiling before doing anything else: a reload minutes later, on an
      // entry old enough that generation has certainly already resolved,
      // must not start a phantom recovery poll.
      const pending = readPendingRequest();
      if (pending) {
        if (Date.now() - pending.startedAt > RECOVERY_CEILING_MS) {
          clearPendingRequest();
        } else {
          requestIdRef.current = pending.requestId;
          generationStartRef.current = pending.startedAt;
          deliveredRef.current = false;
          recoveryCancelledRef.current = false;
          attemptRecovery();
        }
      }
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

  // Stop an in-flight recovery poll from touching state once this
  // component is gone.
  useEffect(() => {
    return () => {
      recoveryCancelledRef.current = true;
      if (recoveryPollTimeoutRef.current) clearTimeout(recoveryPollTimeoutRef.current);
    };
  }, []);

  // Recovery trigger #2: the page becoming visible again while a
  // generation was left in flight. This is the one that matters most —
  // it covers the case a rejected promise never happens at all (a tab
  // restored from bfcache after a suspension, where the fetch/reader is
  // just gone with no exception to catch), which would otherwise leave
  // the loading screen spinning forever. attemptRecovery's own
  // recoveryInFlightRef guard makes this a no-op if the catch block in
  // handleGenerate is already recovering — never a second, competing poll.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && phase === "generating") {
        attemptRecovery();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
    // attemptRecovery reads everything it needs through refs and stable
    // setState functions, never closed-over state — it doesn't need to be
    // a dependency, and re-subscribing on its identity would just churn
    // the listener every render for no behavioral difference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Recovery ──────────────────────────────────────────────────────────────
  //
  // Called when the client loses track of an in-flight generation (a killed
  // fetch, a page that comes back from being suspended, a reload that finds
  // a pending request in sessionStorage). The server has no concept of "the
  // client is gone" — it runs the request to completion regardless — so
  // this asks the one question that actually matters: does the packet from
  // *this* request exist yet?
  //
  // Gate: a row matching client_request_id, with generated_content present,
  // is treated as complete enough to show. Deliberately NOT gated on
  // mascot_image_url, coloring_image_url, or pdf_url:
  //   - generated_content is written once, in the same insert that writes
  //     client_request_id (app/api/generate-packet/route.ts) — there is no
  //     intermediate state where the row exists with a partial/null
  //     generated_content, so this check is a correctness guard against a
  //     future change to that insert, not something expected to ever be
  //     false in practice today.
  //   - mascot_image_url can be null in the normal, non-recovery flow too,
  //     whenever both mascot-generation attempts fail — ResultView already
  //     handles that (mascotLoading state below, its own bounded poll
  //     against /api/packets/[id]/mascot, and a graceful emoji-cluster
  //     fallback). Recovery reuses that existing, already-shipped path
  //     rather than duplicating it.
  //   - pdf_url is never read by ResultView at all (downloadPDF always
  //     calls /api/generate-pdf on demand) — gating on it would make users
  //     wait for a column that has no bearing on what they'd see.
  // "Found but incomplete" is therefore not a real third state for this
  // schema — it collapses to "found" or "not found yet."
  async function attemptRecovery() {
    if (recoveryInFlightRef.current) return; // already running — no-op
    const requestId = requestIdRef.current;
    const startedAt = generationStartRef.current;
    if (!requestId || !startedAt) return; // nothing was ever sent to recover

    recoveryInFlightRef.current = true;
    recoveryCancelledRef.current = false;
    setError("");
    setPhase("generating"); // reuse LoadingView (or the reload "checking" state)

    let pollsWithoutDelivery = 0;

    try {
      while (!recoveryCancelledRef.current) {
        if (Date.now() - startedAt > RECOVERY_CEILING_MS) {
          clearPendingRequest();
          setError(GENERATION_COPY.ceilingHit);
          setPhase("form");
          return;
        }

        const { data, error: queryError } = await supabase
          .from("packets")
          .select("*")
          .eq("client_request_id", requestId)
          .eq("user_id", userIdRef.current ?? "")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recoveryCancelledRef.current) return;

        if (!queryError && data && data.generated_content) {
          // The live stream (if it's still healthy — a benign background
          // blip, not an actual disconnect) may have delivered this exact
          // packet a moment earlier. Whichever path gets here first wins;
          // this makes the loser a no-op rather than a double-render.
          if (deliveredRef.current) return;
          deliveredRef.current = true;
          clearPendingRequest();
          track("packet_recovered");
          setResultWasRecovered(true);

          const row = data as SavedPacket;
          // We may not have a selectedChild at all (recovering after a
          // fresh page reload) — resolve the real one from the already-
          // fetched children list so ResultView gets the child's actual
          // avatar_emoji, not a placeholder, whenever possible.
          const matchedChild = childrenRef.current.find((c) => c.id === row.child_id) ?? null;
          setSelectedChild(
            matchedChild ?? {
              id: row.child_id ?? "",
              user_id: userIdRef.current ?? "",
              name: row.child_name,
              grade_level: row.grade_level as Child["grade_level"],
              learning_style: "mixed",
              favorite_subjects: [],
              special_notes: null,
              avatar_emoji: "🌟",
              display_order: 0,
              created_at: row.created_at,
            }
          );
          setResult(row);
          setPhase("result");
          return;
        }
        // A query error here isn't necessarily fatal — a flaky connection
        // is exactly the situation being recovered from. Keep polling;
        // only the ceiling above ends the loop on its own.

        pollsWithoutDelivery++;
        if (pollsWithoutDelivery >= RECOVERY_SPEAK_AFTER_POLLS) {
          // Only now admit anything might be wrong. A healthy stream
          // surviving a benign background blip has almost always already
          // won by this point; this doesn't change when the query above
          // runs or when the ceiling fires, only how soon the copy stops
          // looking like a normal generation.
          setRecovering(true);
        }

        await new Promise<void>((resolve) => {
          recoveryPollTimeoutRef.current = setTimeout(resolve, RECOVERY_POLL_INTERVAL_MS);
        });
      }
    } finally {
      recoveryInFlightRef.current = false;
      setRecovering(false);
    }
  }

  // Shows a genuine, server-declared failure immediately — no recovery
  // check, because the server has told us definitively what happened (a
  // rejected request, a quota cap, a generation error it already rolled
  // the quota back for). Recovery exists for the opposite situation: the
  // client losing track of the answer, not receiving a clear one.
  function showGenuineFailure(message: string) {
    clearPendingRequest();
    setError(message);
    setPhase("form");
    setProgress(0);
  }

  async function handleGenerate() {
    if (!selectedChild || !theme.trim()) return;

    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    requestIdRef.current = requestId;
    generationStartRef.current = startedAt;
    deliveredRef.current = false;
    recoveryCancelledRef.current = false;
    setResultWasRecovered(false);
    writePendingRequest({ requestId, startedAt });

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
          clientRequestId: requestId,
        }),
      });

      // Detect response type by Content-Type, not status code.
      // If Vercel returns a non-200 mid-stream, the body is still SSE —
      // calling res.json() on it throws "Unexpected token 'd'...".
      const isSSE = (res.headers.get("content-type") ?? "").includes("text/event-stream");

      if (!isSSE) {
        // Plain JSON error (auth 401, quota 403, validation 400, etc.) —
        // the server has spoken. Show it now, don't poll for a packet that
        // was never created (or that failed a path which already rolled
        // its own quota back).
        let message: string = GENERATION_COPY.genuineFailure;
        let errorCode: string | undefined;
        try {
          const data = await res.json();
          message = data.message ?? data.error ?? message;
          errorCode = data.error;
        } catch {
          // Body isn't valid JSON — use the default message
        }

        if (errorCode === "limit_reached") {
          // The server's own cap, not a generic failure — open the upgrade
          // modal instead of the coral error banner. No error text is set;
          // the modal is the whole response to this case.
          clearPendingRequest();
          setPhase("form");
          setProgress(0);
          setUpgradeModalSource("cap_hit");
          setUpgradeModalOpen(true);
          return;
        }

        showGenuineFailure(message);
        return;
      }

      if (!res.body) {
        // Fires immediately after the fetch resolves, before any reading —
        // a browser-capability issue, not a mid-generation connection loss.
        showGenuineFailure(GENERATION_COPY.genuineFailure);
        return;
      }

      // Read SSE stream — keeps connection alive during ~60-110s of
      // generation. reader.read() throwing below (a killed connection —
      // iOS backgrounding, a dropped cellular connection) is the case
      // recovery exists for.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Split on \n; handle \r\n by trimming each line
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trimEnd(); // strip any trailing \r
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let event: { type: string; message?: string; packet?: SavedPacket };
          try {
            event = JSON.parse(jsonStr) as typeof event;
          } catch {
            continue;
          }

          if (event.type === "complete" && event.packet) {
            // A concurrently-running recovery poll (a benign background
            // blip during otherwise-healthy generation, not an actual
            // disconnect) may already have delivered this exact packet —
            // see attemptRecovery. Whichever gets here first wins.
            if (deliveredRef.current) return;
            deliveredRef.current = true;
            clearPendingRequest();
            track("packet_delivered");
            setProgress(100);
            await new Promise((r) => setTimeout(r, 700));
            setResult(event.packet);
            setPhase("result");
            return;
          }

          if (event.type === "error") {
            // The server sent a structured error frame — it's telling us
            // definitively what happened, same as the non-SSE JSON case
            // above. Show it now rather than polling.
            showGenuineFailure(event.message ?? GENERATION_COPY.genuineFailure);
            return;
          }

          // "progress" events keep the connection warm — no UI action needed
        }
      }

      // The stream ended (done) without ever seeing a complete or error
      // event — ambiguous, not a clear failure. This is the "quietly cut
      // without throwing" shape a suspended/bfcache-restored tab can
      // produce. Ask the server rather than assuming failure.
      await attemptRecovery();
    } catch {
      // fetch() or reader.read() threw natively (iOS Safari's "Load
      // failed", Chromium's "Failed to fetch", etc.) — a killed
      // connection, not a server-declared failure. The server ran (or is
      // still running) regardless; ask it, don't guess with browser text.
      await attemptRecovery();
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
        fixedMessage={recovering ? GENERATION_COPY.stillWorking : undefined}
      />
    );
  }

  // Recovering after a fresh page reload: a generation was in flight when
  // the tab last unloaded, but this mount never had a selectedChild (the
  // form starts empty). attemptRecovery resolves the real child the moment
  // it finds the packet — until then, show a minimal, honest state rather
  // than guessing at LoadingView's child-specific copy.
  if (phase === "generating") {
    return (
      <div className="fixed inset-0 bg-cream z-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-sage/10 border-4 border-sage/20 flex items-center justify-center text-5xl mb-6 animate-pulse">
          🌟
        </div>
        <h2 className="font-display text-2xl font-bold text-dark mb-2">
          Checking on your packet...
        </h2>
        <p className="text-muted text-sm">{GENERATION_COPY.stillWorking}</p>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────

  if (phase === "result" && result && selectedChild) {
    return (
      <ResultView
        packet={result}
        childEmoji={selectedChild.avatar_emoji}
        onGenerateAnother={resetForm}
        recovered={resultWasRecovered}
      />
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  // Anyone not on pro is on the free tier — cancelled included, since
  // PACKET_LIMITS treats cancelled the same as free (1 packet/month).
  const isFree = !isPaidStatus(subscriptionStatus);
  const atLimit = isFree && packetsUsed >= 1;
  // atLimit still drives the informational copy below — it is a hint, not a
  // gate. The server's atomic check is the real enforcement; disabling the
  // button on stale client-side quota state would block a user whose
  // packets_reset_date reset is due before the server ever saw the request.
  const canGenerate = !!selectedChild && !!theme.trim();
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
                ? "You've used your free packet this month."
                : `${packetsUsed} of 1 free packet used this month.`}
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
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalSource("upgrade_link");
                    setUpgradeModalOpen(true);
                  }}
                  className="text-coral font-semibold underline underline-offset-2 hover:text-coral-dark"
                >
                  Upgrade →
                </button>
              </>
            ) : isFree ? (
              `Uses 1 of your ${1 - packetsUsed} remaining free packet${1 - packetsUsed === 1 ? "" : "s"}`
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-sage rounded-full inline-block" />
                Unlimited plan
              </span>
            )}
          </p>
        </div>
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        source={upgradeModalSource}
        capped={atLimit}
        childName={selectedChild?.name}
        nextFreeDate={resetDate ? nextFreeDateLabel(resetDate) : ""}
      />
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

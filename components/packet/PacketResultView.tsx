"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { PacketContent } from "@/types";
import { SITE_URL } from "@/lib/site";
import { resolveMascotUrl } from "@/lib/resolveMascotUrl";
import { possessive } from "@/lib/possessive";
import PostPacketNudge from "@/components/PostPacketNudge";

// The packet result screen: shown right after generation on /generate, and
// again when a parent reopens a packet from the dashboard
// (/dashboard/packets/[id]). One component so the two can never drift.

export interface SavedPacket {
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

      {/* Summary only. The worksheet itself (steps, problems, word lists)
          lives in the PDF; the raw instructions carry generator formatting
          like "||" separators that was never meant for this page. */}
      <div className="px-5 py-4" style={{ backgroundColor: color.bg }}>
        <p className="text-sm text-dark/75 leading-relaxed line-clamp-2">
          {activity.description}
        </p>
      </div>
    </div>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

export default function PacketResultView({
  packet,
  childEmoji,
  onGenerateAnother,
  recoveredMessage,
  celebrate = true,
}: {
  packet: SavedPacket;
  childEmoji: string;
  // Omitted on the dashboard revisit page, where the link goes to /generate
  // instead of resetting an in-page form.
  onGenerateAnother?: () => void;
  // Set when this packet was delivered by recovery rather than the live
  // stream: the user saw a loading screen (possibly a "Still working"
  // one) and is now landing here without ever having seen a red banner.
  // Worth a quiet, good-news toast; not worth treating as noteworthy
  // beyond that, since nothing was actually broken.
  recoveredMessage?: string;
  // A freshly made packet: confetti, and a short poll for the mascot image
  // that is still being drawn. False when reopening a packet from the
  // dashboard, where a missing mascot means it failed long ago.
  celebrate?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    if (recoveredMessage) toast.success(recoveredMessage);
    // Fire once on mount only — PacketResultView mounts fresh each time phase
    // transitions into "result", so this can't refire on a later re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for mascot image until it's ready (generated async after packet save)
  const [mascotImageUrl, setMascotImageUrl] = useState<string | null>(
    packet.mascot_image_url
  );
  const [mascotLoading, setMascotLoading] = useState(celebrate && !packet.mascot_image_url);

  useEffect(() => {
    if (mascotImageUrl || !celebrate) return; // already have it, or reopening an old packet

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

  // Fresh server read of plan + this month's usage (GET /api/plans, same
  // get_my_packet_usage check as the dashboard), never GenerateContent's
  // client state. null = still checking or the check failed: no upgrade
  // card, and "Generate another packet" stays (the generate route enforces
  // the cap on its own anyway). true = free and out of packets this month.
  const [capped, setCapped] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plans")
      .then((res) => {
        if (!res.ok) throw new Error(`plans fetch failed: ${res.status}`);
        return res.json() as Promise<{ capped?: boolean }>;
      })
      .then((data) => {
        if (!cancelled) setCapped(data.capped === true);
      })
      .catch(() => {
        // Leave null: card hidden, link shown.
      });
    return () => {
      cancelled = true;
    };
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
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="relative">
        {celebrate && <ConfettiBurst />}

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
            {/* The character is the hero: named whether or not the image made it */}
            {packet.generated_content.mascot_name && (
              <div className="mb-6">
                <p className="font-display text-3xl md:text-4xl font-bold text-sage leading-tight">
                  {packet.generated_content.mascot_name}
                </p>
                <p className="text-base text-dark/75 mt-1">
                  {packet.generated_content.mascot_name} is {possessive(packet.child_name)} guide today.
                </p>
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

            {capped === true && <PostPacketNudge childName={packet.child_name} />}

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
                href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(`${packet.generated_content.packet_title ?? packet.generated_content.title}, made with Packet Day`)}`}
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
            {capped !== true &&
              (onGenerateAnother ? (
                <button
                  onClick={onGenerateAnother}
                  className="text-sm font-semibold text-sage hover:text-sage-dark transition-colors underline underline-offset-2"
                >
                  Generate another packet
                </button>
              ) : (
                <Link
                  href={packet.child_id ? `/generate?child=${packet.child_id}` : "/generate"}
                  className="text-sm font-semibold text-sage hover:text-sage-dark transition-colors underline underline-offset-2"
                >
                  Generate another packet
                </Link>
              ))}
            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-dark transition-colors underline underline-offset-2"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UpgradeCelebration() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [confetti, setConfetti] = useState<
    Array<{ id: number; x: number; color: string; delay: number; duration: number }>
  >([]);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Remove the query param without adding to history
    router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    // Generate confetti pieces — pieces fall at a natural speed but keep
    // starting throughout a ~12s window, so the fall reads as steady rather
    // than a thin band in slow motion.
    const colors = ["#4A7C59", "#D4A843", "#E07A5F", "#FDFBF7", "#6A9E78", "#E6C26B"];
    setConfetti(
      Array.from({ length: 180 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 9,
        duration: 3 + Math.random() * 2,
      }))
    );
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-2 h-2 rounded-sm"
            style={{
              left: `${piece.x}%`,
              top: "-8px",
              backgroundColor: piece.color,
              animationName: "confettiFall",
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
              animationTimingFunction: "linear",
              animationFillMode: "forwards",
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative bg-white rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-dark/40 hover:text-dark hover:bg-cream transition-colors text-xl leading-none"
        >
          ×
        </button>

        <div className="text-6xl mb-4">🎉</div>
        <h2 className="font-display text-3xl font-bold text-dark mb-3">
          You&apos;re now Unlimited!
        </h2>
        <p className="text-dark/70 text-lg mb-8 leading-relaxed">
          Unlimited packets. All your kids. Every wild idea they have.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard/children/new"
            className="block w-full bg-sage hover:bg-sage-dark text-cream font-bold py-4 px-6 rounded-xl transition-colors text-base"
          >
            Add a Child Profile →
          </Link>
          <Link
            href="/generate"
            className="block w-full bg-cream border-2 border-sage text-sage font-bold py-4 px-6 rounded-xl hover:bg-sage hover:text-cream transition-colors text-base"
          >
            Generate Your First Packet →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

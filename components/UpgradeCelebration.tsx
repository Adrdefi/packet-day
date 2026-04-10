"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
    // Generate confetti pieces
    const colors = ["#4A7C59", "#D4A843", "#E07A5F", "#FDFBF7", "#6A9E78", "#E6C26B"];
    setConfetti(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
      }))
    );

    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
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
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="font-display text-3xl font-bold text-dark mb-3">
          You&apos;re now Pro!
        </h2>
        <p className="text-dark/70 text-lg mb-8 leading-relaxed">
          Unlimited packets. All your kids. Every wild idea they have.
        </p>
        <button
          onClick={dismiss}
          className="w-full bg-sage hover:bg-sage-dark text-cream font-bold py-4 px-6 rounded-xl transition-colors text-base"
        >
          Generate Your First Unlimited Packet →
        </button>
        <p className="text-xs text-muted mt-4">Auto-closing in 5 seconds</p>
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

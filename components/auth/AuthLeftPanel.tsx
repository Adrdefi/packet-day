import Link from "next/link";
import RotatingQuote from "./RotatingQuote";

export default function AuthLeftPanel() {
  return (
    <div className="hidden md:flex flex-col w-[420px] lg:w-[480px] shrink-0 bg-sage relative overflow-hidden p-10 min-h-screen">
      {/* Background decorative circles */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-sage-light/20 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-sage-dark/30 pointer-events-none" />
      <div className="absolute top-1/2 -right-8 w-32 h-32 rounded-full bg-honey/10 pointer-events-none" />

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display font-bold text-xl text-cream hover:text-cream/80 transition-colors relative z-10"
      >
        <span>📦</span>
        <span>Packet Day</span>
      </Link>

      {/* Illustration — stacked packet cards */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-8">
        <div className="relative w-64 h-72">
          {/* Back card */}
          <div
            className="absolute inset-0 bg-white/15 rounded-2xl border border-white/20"
            style={{ transform: "rotate(-8deg) translateY(8px)" }}
          />
          {/* Middle card */}
          <div
            className="absolute inset-0 bg-white/20 rounded-2xl border border-white/25"
            style={{ transform: "rotate(-3deg) translateY(4px)" }}
          >
            <div className="h-11 bg-honey/40 rounded-t-2xl" />
          </div>
          {/* Front card — the featured packet */}
          <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Card header */}
            <div className="h-11 bg-sage-dark flex items-center px-4 gap-2 shrink-0">
              <span className="text-base">🦕</span>
              <span className="text-cream text-sm font-bold">Dinosaur Day</span>
            </div>
            {/* Card body — skeleton lines */}
            <div className="flex-1 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sage shrink-0" />
                <div className="flex-1">
                  <div className="h-2 bg-sage/20 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-sage/10 rounded w-1/2" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-honey shrink-0" />
                <div className="flex-1">
                  <div className="h-2 bg-honey/20 rounded w-5/6 mb-1" />
                  <div className="h-2 bg-honey/10 rounded w-2/3" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-coral shrink-0" />
                <div className="flex-1">
                  <div className="h-2 bg-coral/20 rounded w-4/5 mb-1" />
                  <div className="h-2 bg-coral/10 rounded w-3/5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-dark-light shrink-0" />
                <div className="flex-1">
                  <div className="h-2 bg-dark/10 rounded w-2/3 mb-1" />
                  <div className="h-2 bg-dark/5 rounded w-1/2" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex gap-1.5">
                  {["Math", "Reading", "Science", "Art"].map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-sage/10 text-sage-dark px-2 py-0.5 rounded-full font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Card footer */}
            <div className="px-4 py-2.5 border-t border-border bg-cream">
              <p className="text-xs text-muted">✓ Answer key included · Print-ready PDF</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rotating quote */}
      <div className="relative z-10">
        <RotatingQuote />
      </div>
    </div>
  );
}

function SkeletonSection({ labelWidth }: { labelWidth: string }) {
  return (
    <section className="space-y-4">
      <div className={`h-7 bg-border/50 rounded-lg animate-pulse`} style={{ width: labelWidth }} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-border animate-pulse" />
        ))}
      </div>
    </section>
  );
}

export default function GenerateLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar skeleton */}
      <div className="bg-white border-b border-border h-14" />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-10">
        {/* Heading */}
        <div className="space-y-2">
          <div className="h-9 bg-border/50 rounded-lg animate-pulse w-3/4" />
          <div className="h-4 bg-border/30 rounded-lg animate-pulse w-1/2" />
        </div>

        {/* Child selector */}
        <SkeletonSection labelWidth="200px" />

        {/* Theme input */}
        <section className="space-y-3">
          <div className="h-7 bg-border/50 rounded-lg animate-pulse w-56" />
          <div className="h-12 bg-white rounded-xl border border-border animate-pulse" />
        </section>

        {/* Packet length */}
        <section className="space-y-3">
          <div className="h-7 bg-border/50 rounded-lg animate-pulse w-48" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-white rounded-xl border border-border animate-pulse" />
            <div className="h-24 bg-white rounded-xl border border-border animate-pulse" />
          </div>
        </section>

        {/* Generate button */}
        <div className="h-14 bg-border/40 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

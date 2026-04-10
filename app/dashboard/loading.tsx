// Next.js will render this automatically while the dashboard server component loads

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-border/60 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-border/60 rounded-lg w-2/3" />
          <div className="h-3.5 bg-border/40 rounded-lg w-1/2" />
        </div>
      </div>
      <div className="h-10 bg-border/40 rounded-xl" />
      <div className="h-4 bg-border/30 rounded-lg w-1/3 mx-auto" />
    </div>
  );
}

function SkeletonPacketRow() {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-border/60 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-border/60 rounded-lg w-3/4" />
        <div className="h-3 bg-border/40 rounded-lg w-1/3" />
      </div>
      <div className="flex gap-2 shrink-0">
        <div className="h-7 w-14 bg-border/40 rounded-lg" />
        <div className="h-7 w-14 bg-border/40 rounded-lg" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: My Kids skeleton */}
        <section className="lg:col-span-2 space-y-4">
          <div className="h-8 bg-border/50 rounded-lg w-24 animate-pulse" />
          <SkeletonCard />
          <SkeletonCard />
          <div className="h-14 bg-border/30 rounded-xl border-2 border-dashed border-border animate-pulse" />
        </section>

        {/* Right: Recent Packets skeleton */}
        <section className="lg:col-span-3 space-y-4">
          <div className="h-8 bg-border/50 rounded-lg w-40 animate-pulse" />
          <div className="bg-white rounded-xl border border-border shadow-sm px-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonPacketRow key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

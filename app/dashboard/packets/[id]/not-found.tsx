import Link from "next/link";

// Shown by app/dashboard/packets/[id]/page.tsx's notFound(): an unknown or
// malformed id, a packet that never finished generating, or someone else's
// packet (deliberately indistinguishable). Renders inside the dashboard
// layout, so the top bar stays.
export default function PacketNotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">
        📦
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-dark mb-2">
        We couldn&apos;t find that packet.
      </h1>
      <p className="text-sm text-muted leading-relaxed mb-8">
        Your packets are all on your dashboard, ready to open or print.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-sage text-cream font-bold text-sm py-3 px-6 rounded-xl hover:bg-sage-dark transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

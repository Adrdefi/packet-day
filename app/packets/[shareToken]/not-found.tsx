import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";

// Shown with a real 404 status when a share token doesn't match a packet.
export default function SharePacketNotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">📭</div>
          <h1 className="font-display text-2xl font-bold text-dark mb-3">
            Hmm, this packet link has expired or doesn&apos;t exist.
          </h1>
          <p className="text-muted text-sm leading-relaxed mb-8">
            The family who shared it may have removed it, or the link might have a typo. Either way, you can make your own!
          </p>
          <Link
            href="/signup"
            className="inline-block bg-sage text-cream font-bold py-3 px-8 rounded-xl hover:bg-sage-dark transition-colors"
          >
            Create your own free packet →
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import Wordmark from "@/components/layout/Wordmark";

export default function SiteHeader() {
  return (
    <nav className="bg-cream border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-dark hover:text-sage transition-colors shrink-0"
        >
          <Wordmark size="xl" />
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold text-dark/70 hover:text-dark transition-colors"
        >
          Log in
        </Link>
      </div>
    </nav>
  );
}

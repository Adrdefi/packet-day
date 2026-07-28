import Link from "next/link";

export default function SiteHeader() {
  return (
    <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
      <Link href="/" className="font-display text-xl font-bold text-sage">
        Packet Day
      </Link>
      <Link
        href="/login"
        className="text-sm font-semibold text-dark/70 hover:text-dark transition-colors"
      >
        Log in
      </Link>
    </nav>
  );
}

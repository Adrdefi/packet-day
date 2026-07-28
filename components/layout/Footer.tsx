import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-dark px-6 py-14">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-cream mb-2 justify-center md:justify-start">
            <span>📦</span>
            <span>Packet Day</span>
          </div>
          <p className="text-cream/50 text-xs max-w-xs">
            AI-powered learning packets, built by a homeschool family, tested on real kids,
            powered by coffee.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <Link
                key={link}
                href={`/${link.toLowerCase()}`}
                className="text-cream/50 hover:text-cream text-sm transition-colors"
              >
                {link}
              </Link>
            ))}
          </div>
          <p className="text-cream/30 text-xs">
            © 2026 Packet Day. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

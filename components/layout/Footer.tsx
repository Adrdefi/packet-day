import Link from "next/link";
import Wordmark from "./Wordmark";
import { getLiveUnitStudies } from "@/lib/unit-studies/loader";

interface FooterLink {
  label: string;
  href: string;
}

/** The unit studies link only appears once at least one unit study page is live. */
function footerLinks(): FooterLink[] {
  return [
    ...(getLiveUnitStudies().length > 0 ? [{ label: "Unit studies", href: "/unit-studies" }] : []),
    { label: "Free worksheets vs Packet Day", href: "/free-worksheets" },
    { label: "About", href: "/about" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ];
}

export default function Footer() {
  return (
    <footer className="bg-dark px-6 py-14">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 font-display font-bold text-cream mb-2 justify-center md:justify-start">
            <Wordmark size="lg" />
          </div>
          <p className="text-cream/50 text-xs max-w-xs">
            AI-powered learning packets, built by a homeschool family, tested on real kids,
            powered by coffee.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks().map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-cream/50 hover:text-cream text-sm transition-colors"
              >
                {link.label}
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

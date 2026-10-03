import Link from "next/link";
import Wordmark from "./Wordmark";
import { getLiveUnitStudies } from "@/lib/unit-studies/loader";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterGroup {
  heading: string;
  links: FooterLink[];
}

/** The unit studies link only appears once at least one unit study page is live. */
function footerGroups(): FooterGroup[] {
  return [
    {
      heading: "Explore",
      links: [
        { label: "Sample", href: "/sample" },
        ...(getLiveUnitStudies().length > 0 ? [{ label: "Unit studies", href: "/unit-studies" }] : []),
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ];
}

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// Warm charcoal with cream text. Every cream shade here is /65 or stronger,
// which clears WCAG AA on charcoal (cream/50 does not, at 4.22:1).
export default function Footer() {
  return (
    <footer className="bg-charcoal px-6 pt-14 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex font-display font-bold text-cream">
              <Wordmark size="lg" variant="cream" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-cream/80">
              Learning packets made for one kid at a time. Built by a homeschool family, tested on
              real kids, powered by coffee.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-8">
            {footerGroups().map((group) => (
              <div key={group.heading}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-cream/70">
                  {group.heading}
                </h2>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-cream/80 hover:text-cream hover:underline transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className="mt-12 border-t border-cream/15 pt-6 text-xs text-cream/65">
          © 2026 Packet Day
          {LEGAL_LINKS.map((link) => (
            <span key={link.href}>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <Link href={link.href} className="hover:text-cream hover:underline transition-colors">
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}

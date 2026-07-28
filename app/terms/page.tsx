import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — Packet Day",
  description:
    "The terms that govern your use of Packet Day's AI-generated learning packets.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <SiteHeader />

      <main className="flex-1 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-dark/60 text-sm font-semibold mb-10">
            Last updated: July 28, 2026
          </p>

          <div className="space-y-6 text-dark/80 leading-relaxed">
            <p>
              Welcome to Packet Day. These Terms of Service (&ldquo;Terms&rdquo;) govern your use
              of Packet Day (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) and our
              website and services. By creating an account or using the service, you agree to
              these Terms.
            </p>

            <p>
              <strong className="text-dark font-bold">What Packet Day is.</strong> Packet Day is
              a tool that uses artificial intelligence to generate printable, themed learning
              packets for children based on the grade level and interests you provide. Packet Day
              is a supplemental learning aid. It is not a complete curriculum and is not a
              substitute for professional educational advice.
            </p>

            <p>
              <strong className="text-dark font-bold">Your account.</strong> You must be at least
              18 years old to create an account. You agree to provide accurate information, to
              keep your password secure, and to be responsible for all activity under your
              account.
            </p>

            <p>
              <strong className="text-dark font-bold">Acceptable use.</strong> You may use Packet
              Day for your own personal, family, or educational purposes. You agree not to resell
              or redistribute the service, not to misuse or attempt to disrupt the service, and
              not to use it for any unlawful purpose.
            </p>

            <p>
              <strong className="text-dark font-bold">AI-generated content.</strong> Packet
              content is generated automatically by artificial intelligence and may occasionally
              contain mistakes or inaccuracies. You are responsible for reviewing packets before
              giving them to a child. We do not guarantee that generated content is accurate,
              complete, or suitable for every child.
            </p>

            <p>
              <strong className="text-dark font-bold">Your content and ours.</strong> The packets
              you generate are yours to print and use for your own personal and educational
              purposes. Packet Day, including our software, branding, and website, remains our
              property. You may not copy or reuse our platform or brand without permission.
            </p>

            <p>
              <strong className="text-dark font-bold">Paid plans.</strong> Packet Day offers a
              free plan and a paid subscription. Paid plans are billed through our payment
              processor, Stripe. Subscriptions renew automatically until you cancel. You can
              cancel at any time, and your plan will remain active through the end of the current
              billing period. Fees already paid are non-refundable except where required by law.
            </p>

            <p>
              <strong className="text-dark font-bold">Disclaimers.</strong> The service is
              provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of
              any kind, whether express or implied. We do not warrant that the service will be
              uninterrupted, error free, or that generated content will meet your expectations.
            </p>

            <p>
              <strong className="text-dark font-bold">Limitation of liability.</strong> To the
              fullest extent permitted by law, Packet Day will not be liable for any indirect,
              incidental, or consequential damages arising from your use of the service. Our
              total liability for any claim will not exceed the amount you paid us in the twelve
              months before the claim.
            </p>

            <p>
              <strong className="text-dark font-bold">Termination.</strong> You may stop using
              Packet Day and delete your account at any time. We may suspend or terminate access
              if you violate these Terms.
            </p>

            <p>
              <strong className="text-dark font-bold">Changes to these Terms.</strong> We may
              update these Terms from time to time. When we do, we will revise the &ldquo;Last
              updated&rdquo; date above. Continued use of the service means you accept the
              updated Terms.
            </p>

            <p>
              <strong className="text-dark font-bold">Governing law.</strong> These Terms are
              governed by the laws of the State of California, without regard to its conflict of
              laws rules.
            </p>

            <p>
              <strong className="text-dark font-bold">Contact.</strong> Questions about these
              Terms? Email us at hello@packetday.com.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

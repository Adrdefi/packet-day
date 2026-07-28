import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Packet Day",
  description:
    "How Packet Day collects, uses, and protects your family's information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <SiteHeader />

      <main className="flex-1 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-dark/60 text-sm font-semibold mb-10">
            Last updated: July 28, 2026
          </p>

          <div className="space-y-6 text-dark/80 leading-relaxed">
            <p>
              Packet Day (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) provides
              AI-generated, printable learning packets for homeschool families and educators.
              This Privacy Policy explains what information we collect, how we use it, and the
              choices you have.
            </p>

            <p>
              <strong className="text-dark font-bold">Information we collect.</strong> When you
              create an account, we collect your name, email address, and a password, which is
              stored securely through our authentication provider. To personalize packets, you
              may add a learning profile for each child that includes a first name or nickname,
              grade level, and interests. This profile information is provided by you, the
              parent, guardian, or educator. We also store the packets generated in your account.
              If you subscribe to a paid plan, your payment is processed by our payment provider,
              Stripe, and we do not store your full card number. We keep basic technical
              information such as log data and device or browser details to operate and secure
              the service.
            </p>

            <p>
              <strong className="text-dark font-bold">How we use your information.</strong> We
              use your information to create and deliver your learning packets, to operate,
              maintain, and improve the service, to communicate with you about your account and
              important updates, to process payments for paid plans, and to protect the service
              against fraud and abuse.
            </p>

            <p>
              <strong className="text-dark font-bold">How packets are generated.</strong> Packets
              are created using third-party artificial intelligence providers. We send the theme,
              grade level, and related details you provide to these providers so they can
              generate original text and images for your packet. We do not send them your payment
              information.
            </p>

            <p>
              <strong className="text-dark font-bold">Service providers we work with.</strong> We
              share limited information with trusted providers who help us run Packet Day,
              including our hosting provider, database and authentication provider, payment
              processor, email provider, and AI providers. These providers may process your
              information only to perform services for us. We do not sell your personal
              information.
            </p>

            <p>
              <strong className="text-dark font-bold">Children&apos;s privacy.</strong> Packet
              Day is intended for use by parents, guardians, and educators. Accounts must be
              created by an adult. Children do not create accounts and do not interact directly
              with the service. Any details you provide about a child are used only to
              personalize that child&apos;s learning content. If you believe a child has provided
              us information directly, please contact us and we will delete it.
            </p>

            <p>
              <strong className="text-dark font-bold">Data retention.</strong> We keep your
              information for as long as your account is active. You may request that we delete
              your account and associated data at any time.
            </p>

            <p>
              <strong className="text-dark font-bold">Your choices.</strong> You can access and
              update your account information, request deletion of your data, and unsubscribe
              from marketing emails using the link in those emails or by contacting us.
            </p>

            <p>
              <strong className="text-dark font-bold">Security.</strong> We use reasonable
              measures to protect your information. No method of transmission or storage is
              completely secure, so we cannot guarantee absolute security.
            </p>

            <p>
              <strong className="text-dark font-bold">Changes to this policy.</strong> We may
              update this Privacy Policy from time to time. When we do, we will revise the
              &ldquo;Last updated&rdquo; date above.
            </p>

            <p>
              <strong className="text-dark font-bold">Contact.</strong> If you have questions
              about this policy, email us at hello@packetday.com.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-dark leading-tight mb-4">
            This page wandered off.
          </h1>
          <p className="text-dark/70 leading-relaxed mb-8">
            The link might have a typo, or the page moved. No harm done. Here are a few
            good places to pick back up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center h-12 bg-sage text-cream font-bold px-8 rounded-full hover:bg-sage-dark transition-colors"
            >
              Back to the homepage
            </Link>
            <Link
              href="/sample"
              className="inline-flex items-center h-12 text-sage font-bold px-8 rounded-full border-2 border-sage hover:bg-sage/10 transition-colors"
            >
              See a sample packet
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

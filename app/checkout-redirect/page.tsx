import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { getPriceIdForPlan } from "@/lib/stripe";
import { resolveCheckoutRedirect } from "@/lib/checkoutRedirect";
import { isPlanSlug } from "@/lib/plans";
import { getBaseUrl } from "@/lib/config";

/**
 * Post-signup/login checkout handoff. Reached from /auth/callback (after
 * email confirmation) or /login, both carrying a validated plan slug —
 * never a raw Stripe price ID — so the plan a user picked on /pricing
 * survives the auth detour instead of dropping them on the dashboard.
 * A paid account goes to the dashboard instead of a second checkout, and a
 * failure shows a friendly message instead of the error page.
 */
export default async function CheckoutRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  if (!isPlanSlug(plan)) redirect("/pricing");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/pricing");

  const result = await resolveCheckoutRedirect({
    supabase,
    userId: user.id,
    userEmail: user.email,
    priceId: getPriceIdForPlan(plan),
    baseUrl: getBaseUrl(await headers()),
  });

  // redirect() works by throwing, so it stays outside the helper's try/catch.
  if (result.kind === "redirect") redirect(result.to);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-dark leading-tight mb-4">
            Something went sideways.
          </h1>
          <p className="text-dark/70 leading-relaxed mb-8">
            Let&apos;s try that again. Nothing was charged.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center h-12 bg-sage text-cream font-bold px-8 rounded-full hover:bg-sage-dark transition-colors"
          >
            Back to the plans
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

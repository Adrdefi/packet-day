import { createClient } from "@/lib/supabase/server";
import { isSafeNextPath } from "@/lib/safe-redirect";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles the OAuth / magic-link / email-confirmation callback from Supabase.
 * Supabase redirects here with ?code=... after the user clicks a link.
 *
 * After exchange, we check onboarding_completed to route new users to /onboarding
 * and returning users to /dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next"); // e.g. set by password-reset flow or the checkout handoff
  const next = isSafeNextPath(rawNext) ? rawNext : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Honour an explicit `next` param (e.g. password-reset redirects)
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Route based on whether the user has completed onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // A missing PKCE code verifier means this browser never held it — the
    // link was opened on a different device/browser than the one that
    // started signup. Supabase only appends `code` to the redirect after
    // its own verify step already succeeded, so the email is confirmed;
    // there's just no session here yet. Give an honest message instead of
    // "expired" for this case specifically.
    if (error.code === "pkce_code_verifier_not_found") {
      return NextResponse.redirect(`${origin}/login?error=confirmed-elsewhere`);
    }
  }

  // Something went wrong — send them back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=link-expired`);
}

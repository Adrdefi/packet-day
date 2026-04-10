import { createClient } from "@/lib/supabase/server";
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
  const next = searchParams.get("next"); // e.g. set by password-reset flow

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
  }

  // Something went wrong — send them back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=link-expired`);
}

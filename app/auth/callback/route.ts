import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * A same-origin relative path only — rejects absolute URLs
 * ("https://evil.com/..."), protocol-relative ones ("//evil.com/..."), and
 * the backslash variant browsers sometimes still treat as protocol-relative
 * ("/\evil.com"), so `next` can't be turned into an open redirect.
 */
function isSafeNextPath(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}

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
  }

  // Something went wrong — send them back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=link-expired`);
}

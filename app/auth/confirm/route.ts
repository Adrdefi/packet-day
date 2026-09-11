import { createClient } from "@/lib/supabase/server";
import { isSafeNextPath } from "@/lib/safe-redirect";
import { isPlanSlug } from "@/lib/plans";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Allow list of OTP types this route will verify. Add an entry here (and
// nowhere else) to support another flow. `email` is the non-deprecated type
// for signup confirmation — @supabase/auth-js's verifyOtp docs note that
// `signup` and `magiclink` are deprecated in favor of `email`.
const ALLOWED_TYPES: Record<string, EmailOtpType> = {
  recovery: "recovery",
  email: "email",
};

/**
 * Handles the token-hash confirmation link from Supabase auth emails
 * (signup confirmation, password recovery). Unlike the PKCE `code` exchange
 * in app/auth/callback/route.ts, verifyOtp needs no client-stored secret, so
 * this link works from any browser or device — not just the one that
 * requested it.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = rawType ? ALLOWED_TYPES[rawType] : undefined;
  const rawNext = searchParams.get("next");
  const next = isSafeNextPath(rawNext) ? rawNext : "/reset-password";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      if (type === "email") {
        // Signup confirmation. The chosen plan (if any) travels in user
        // metadata set at signUp() time, not in a `next` query param — that
        // param is never trusted here, the destination is always computed
        // server-side to match what a signed-up user's landing spot is.
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const plan = user?.user_metadata?.plan;
        if (isPlanSlug(plan)) {
          return NextResponse.redirect(`${origin}/checkout-redirect?plan=${plan}`);
        }

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

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing params, disallowed type, or a failed verification.
  return NextResponse.redirect(
    `${origin}${type === "email" ? "/login?error=link-expired" : "/reset-password"}`
  );
}

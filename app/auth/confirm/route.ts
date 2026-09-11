import { createClient } from "@/lib/supabase/server";
import { isSafeNextPath } from "@/lib/safe-redirect";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Allow list of OTP types this route will verify. Add an entry here (and
// nowhere else) to support another flow, e.g. "signup": "signup" once
// signup confirmation moves to this same token-hash pattern.
const ALLOWED_TYPES: Record<string, EmailOtpType> = {
  recovery: "recovery",
};

/**
 * Handles the token-hash confirmation link from Supabase auth emails
 * (currently: password recovery). Unlike the PKCE `code` exchange in
 * app/auth/callback/route.ts, verifyOtp needs no client-stored secret, so
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
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing params, disallowed type, or a failed verification — send them
  // back to /reset-password, where the no-session state shows the error.
  return NextResponse.redirect(`${origin}/reset-password`);
}

import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken, setMarketingOptOut } from "@/lib/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058) for Gmail/Yahoo's built-in "Unsubscribe"
 * button next to the sender name. No session, no page — just a bare 200 on
 * success so the mail client's own UI can confirm it. Never requires login;
 * the token itself is the credential.
 */
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const userId = token ? verifyUnsubscribeToken(token) : null;

  if (!userId) {
    return new NextResponse(null, { status: 400 });
  }

  const { error } = await setMarketingOptOut(userId, true);
  if (error) {
    console.error("[api/unsubscribe] Failed to set marketing_opt_out:", error.message);
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}

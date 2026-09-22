import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PURPOSE = "marketing";

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("Missing UNSUBSCRIBE_SECRET environment variable");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * A token encodes `${userId}.${purpose}` (base64url) plus an HMAC-SHA256
 * signature of that payload. No expiry on purpose — an unsubscribe link
 * sent months ago must still work, since a link that silently stops
 * working is worse than one that works forever.
 */
export function createUnsubscribeToken(userId: string): string {
  const payload = `${userId}.${PURPOSE}`;
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  return `${encodedPayload}.${sign(payload)}`;
}

/**
 * Returns the user id the token was issued for, or null for anything
 * invalid or tampered with: wrong shape, bad signature, or a purpose other
 * than "marketing". Signature comparison is constant time.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  const [userId, purpose] = payload.split(".");
  if (!userId || purpose !== PURPOSE) return null;

  return userId;
}

// Service-role client — this route has no session, so it's the only option.
// Same pattern as app/api/generate-packet/route.ts's getServiceClient().
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

export async function setMarketingOptOut(userId: string, optOut: boolean) {
  return getServiceClient()
    .from("profiles")
    .update({ marketing_opt_out: optOut })
    .eq("id", userId);
}

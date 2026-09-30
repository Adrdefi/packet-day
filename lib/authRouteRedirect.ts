import { safeNext } from "@/lib/safeNext";

/**
 * Where proxy.ts sends a visitor who is already logged in but lands on an
 * auth page (/login, /signup, /check-email). A safe `next` wins, so a link
 * like /signup?next=/generate?theme=dinosaurs still reaches the prefilled
 * packet form for a parent who is already signed in. Anything else, or no
 * `next` at all, goes to /dashboard as before.
 */
export function authRouteRedirectPath(searchParams: URLSearchParams): string {
  return safeNext(searchParams.get("next")) ?? "/dashboard";
}

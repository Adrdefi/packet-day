/**
 * The ?from= value on /signup links, e.g. "unit-studies-bats". It rides
 * along on the signup_started analytics event so a signup can be traced to
 * the page that sent it. Only a short lowercase slug is accepted; anything
 * else is dropped, so a crafted link can't put arbitrary text in analytics.
 */
export function signupSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw) && raw.length <= 64 ? raw : null;
}

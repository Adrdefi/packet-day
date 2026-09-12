"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const OPT_OUT_KEY = "pd-no-analytics";

// Query params that must never reach Vercel — auth tokens and PII that can
// show up in URLs (email confirmation links, password resets, OAuth
// callbacks). Everything else, including ref and utm_* attribution params,
// passes through untouched.
const SENSITIVE_PARAMS = [
  "token_hash",
  "token",
  "code",
  "access_token",
  "refresh_token",
  "email",
  "error_description",
];

// Lets pd-analytics=off / pd-analytics=on in the URL flip the opt-out flag —
// so it can be toggled from a phone with no devtools access.
function syncOptOutFromQueryParam(): void {
  let toggle: string | null = null;
  try {
    toggle = new URLSearchParams(window.location.search).get("pd-analytics");
  } catch {
    return;
  }

  if (toggle === "off") {
    try {
      window.localStorage.setItem(OPT_OUT_KEY, "1");
    } catch {
      // localStorage unavailable (private mode, etc.) — nothing to persist
    }
  } else if (toggle === "on") {
    try {
      window.localStorage.removeItem(OPT_OUT_KEY);
    } catch {
      // localStorage unavailable — nothing to remove
    }
  }
}

function isOptedOut(): boolean {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function stripSensitiveParams(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    for (const key of SENSITIVE_PARAMS) {
      parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    // Not a parseable URL — send it through unmodified rather than throw.
    return url;
  }
}

export default function AnalyticsProvider() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        syncOptOutFromQueryParam();

        if (isOptedOut()) return null;

        return { ...event, url: stripSensitiveParams(event.url) };
      }}
    />
  );
}

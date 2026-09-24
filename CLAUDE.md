# Packet Day — Claude Code Guide

## What this app does

Packet Day generates personalized, printable daily learning packets for homeschool families using AI. Parents create profiles for each child (age, grade, interests, learning style), choose a theme and subjects, and the app uses Claude to generate a full day of activities — then renders them as a print-ready PDF.

**Tagline:** "Your backup plan for the hard days"
**Target user:** Homeschool moms aged 25–45 who need structured, themed learning activities for their kids on hard days (sick days, curriculum gaps, overwhelmed days)

---

## Brand voice & tone rules

- **Always warm, never clinical.** Write like a trusted homeschool mom friend, not a product.
- **Encouraging and empathetic.** Acknowledge that homeschooling is hard. Never shame.
- **Specific and helpful.** If copy could apply to any app, rewrite it.
- **Short sentences.** Parents are busy. Get to the point.
- **No lorem ipsum.** Ever. Use real, brand-appropriate copy in every component.
- **No generic placeholders** like "Click here" or "Learn more" — be specific.

### Examples
- ❌ "An error occurred. Please try again."
- ✅ "Something went sideways. Let's try that again."
- ❌ "Welcome to Packet Day!"
- ✅ "You made it. Let's build something good today."
- ❌ "Your packet is ready."
- ✅ "Aria's Ocean Adventure packet is ready to print!"
- **Keep factual copy honest.** `/sample` features Noah, a real kid who is NOT Natalie's child.
- **Never add, edit, or mark testimonials as verified in `lib/testimonials.ts`** without Andy confirming the person and quote are real.

---

## Tech stack

| Tool | Purpose |
|------|---------|
| Next.js 16 (App Router) | Framework |
| TypeScript (strict) | Language |
| Tailwind CSS v4 | Styling (CSS-based config, no tailwind.config.ts) |
| Supabase | Database, Auth, Storage |
| Stripe | Payments & subscriptions |
| Anthropic Claude API | Packet generation (model: claude-sonnet-4-6) |
| Replicate (flux-schnell) | AI mascot image generation |
| @react-pdf/renderer | PDF output |
| Resend | Transactional email |
| Vercel | Hosting |

---

## Project structure

```
app/                    # Pages and API routes (App Router)
  layout.tsx            # Root layout with Nunito + Fraunces fonts
  page.tsx              # Home / coming soon
  (auth)/               # Auth pages: login, signup, reset
  dashboard/             # Authenticated app shell (not a route group — plain app/dashboard/)
  api/                  # API route handlers
components/
  ui/                   # Base UI: Button, Input, Card, Badge, Toast
  pdf/                  # @react-pdf/renderer components
  [feature]/            # Feature-specific components
lib/
  supabase/
    client.ts           # Browser Supabase client
    server.ts           # Server Supabase client (uses cookies)
  stripe.ts             # Stripe instance + plan definitions
  config.ts             # Generation model, base URL helper
  resend.ts             # Resend email client + email helpers
  pdf.ts                # PDF utilities and shared constants
hooks/
  useUser.ts            # Current auth user
  useToast.ts           # Toast notification state
types/
  index.ts              # User, Child, Packet, Subscription interfaces
```

Route gating lives in **`proxy.ts`** at the repo root (Next.js 16 renamed `middleware.ts` to `proxy.ts`; the build output lists it as "Proxy (Middleware)"). It refreshes the Supabase session cookie on every matched request, then:
- Redirects logged-out users away from `/onboarding`, `/dashboard`, and `/generate` to `/login?next=<original path + query, safeNext-validated>`.
- Redirects logged-in users away from `/login`, `/signup`, and `/check-email` to `/dashboard`.
- Redirects `/dashboard` to `/onboarding` if `profiles.onboarding_completed` is false (done in the proxy because it keeps the query string, such as `?upgraded=true`; `app/dashboard/layout.tsx` repeats the check as a backup but can't preserve the query).

Its matcher skips `_next/static`, `_next/image`, `api/`, `auth/`, `og`, icons, and `.png`/`.ico` files. Public pages like `/about`, `/sample`, and `/unsubscribe` still pass through it, but it only refreshes the session there and never redirects. Protected pages (e.g. `app/dashboard/page.tsx`) also check their own session server-side, so don't remove those checks on the assumption that the proxy covers it.

---

## Database tables (Supabase)

| Table | Key fields |
|-------|-----------|
| `profiles` | `id` (= auth.users.id), `email`, `full_name`, `avatar_url`, `stripe_customer_id`, `subscription_status`, `packets_used_this_month`, `packets_reset_date`, `marketing_opt_out`, `last_cap_hit_at`, `sequence_started_at` |
| `children` | `id`, `user_id`, `name`, `age`, `grade_level`, `interests` (array), `learning_style`, `notes` |
| `packets` | `id`, `user_id`, `child_id`, `title`, `theme`, `date`, `subjects` (array), `activities` (jsonb), `pdf_url` |
| `email_sends` | `id`, `user_id`, `email_key`, `status`, `resend_id`, `error`, `created_at` — one row per email send attempt, service role only |

There is no separate `subscriptions` table. Subscription and quota state (`subscription_status`, `packets_used_this_month`, `packets_reset_date`) lives directly on `profiles`.

**RLS:** All tables have Row Level Security enabled. Users can only read/write their own rows.

---

## Database migrations

After any `GRANT`, `REVOKE`, or RLS policy migration, never treat "applied without error" as proof of effect. `REVOKE` is set-based and succeeds silently when the grant it targets does not exist. Always verify by querying `pg_proc.proacl` (for function privileges) or `pg_policies` plus `pg_class.relrowsecurity` (for RLS) directly, then re-run the Supabase security advisor. `has_function_privilege` tells you whether a role can execute; `proacl` tells you why. Check `proacl`.

Two independent mechanisms can leave a new function publicly callable, and closing one does not close the other:

1. The implicit PUBLIC pseudo-role. Postgres grants EXECUTE to PUBLIC on function creation by default. Shows in `proacl` as a bare `=X/postgres` entry with no role name before the equals. Closed with: `revoke all on function ... from public;`
2. `ALTER DEFAULT PRIVILEGES`. This project has a standing rule that auto-grants EXECUTE to `anon` and `authenticated` on new functions. Shows in `proacl` as named `anon=X/postgres` and `authenticated=X/postgres` entries. NOT affected by revoking from `public`. Closed with: `revoke execute on function ... from anon, authenticated;`

Every new `SECURITY DEFINER` function that should not be public needs BOTH revokes. After applying, always verify with `pg_proc.proacl` and confirm the ACL contains only the roles you intended. An ACL with only `postgres=` and `service_role=` entries is correct for an internal function.

When calling `apply_migration`, send bare executable SQL only. Keep explanatory comments in the migration file on disk, not in the tool payload.

Do not attempt to verify long `apply_migration` payloads by reading them in the terminal, which truncates long lines and creates false alarms. Verify against the migration file on disk, and confirm the actual result with `pg_proc.proacl` after applying.

---

## Environment variables

See `.env.local.example` for all variables and where to find them.

| Variable | Required | Client-safe? |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **No** — server only |
| `STRIPE_SECRET_KEY` | Yes | **No** — server only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Yes |
| `STRIPE_WEBHOOK_SECRET` | Yes | **No** — server only |
| `STRIPE_PRICE_MONTHLY` | Yes | No | Monthly price for Packet Day Unlimited on /pricing |
| `STRIPE_PRICE_YEARLY` | Yes | No | Yearly price for Packet Day Unlimited on /pricing |
| `ANTHROPIC_API_KEY` | Yes | **No** — server only |
| `REPLICATE_API_TOKEN` | Optional | **No** — server only |
| `RESEND_API_KEY` | Yes | **No** — server only |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes |
| `UNSUBSCRIBE_SECRET` | Yes | **No** — server only |
| `MAILING_ADDRESS` | Yes | **No** — server only |
| `EMAIL_LAUNCH_AT` | Optional | **No** — server only | Unset means nobody is enrolled in the sequence |
| `EMAIL_SEQUENCE_ENABLED` | Yes | **No** — server only | Anything other than exactly `"true"` forces a dry run |
| `CRON_SECRET` | Yes | **No** — server only | Bearer secret for `/api/cron/email-sequence` |
| `EMAIL_TEST_ALLOWLIST` | Yes | **No** — server only | Empty by default; comma-separated backdated test addresses |
| `EMAIL_MONTHLY_ENABLED` | Yes | **No** — server only | Independent of `EMAIL_SEQUENCE_ENABLED`; gates `packet_back_monthly` |
| `EMAIL_MONTHLY_START` | Yes | **No** — server only | UTC quota month (`YYYY-MM`) of the first real `packet_back_monthly` send |

---

## Domain, hosting & environments

- **Official address:** https://www.packetday.com. Bare `packetday.com` 308-redirects to `www`. All absolute URLs, canonicals, `metadataBase`, and email links use `www`.
- **DNS:** Netlify (NS1 nameservers). **Registrar:** Porkbun. Never enable Vercel DNS.
- **Hosting:** Vercel Pro.
- **One Supabase project** serves both local dev and production. Stripe sandbox actions change real production profiles — be careful testing checkout locally.
- **Test accounts** use `adrdefi+...` addresses and are kept on purpose. `test2`/`test3` were "pro" during sandbox testing but are `free` in the database now (checked 2026-09-23). Exclude every `adrdefi+...` account from user counts.
- `.env.local` has trailing inline `#` comments on some lines. Next.js strips them; any custom script reading that file must strip them too.

---

## Server code

- **Never use `after()`** or any unawaited fire-and-forget server work — everything stays on the awaited chain of the live request. (Past attempts caused silent timeouts and crashes.)
- Supabase Storage's `upload()` compiles to `INSERT ... RETURNING`, so every bucket needs a SELECT RLS policy for authenticated writes — even public buckets.
- `packets.pdf_url` stores a Storage **path**, not a URL. The `packets` bucket is private; objects live at `{user_id}/{packet_id}.pdf`. The `packet-mascots` bucket is public on purpose (mascots carry no child name).
- `lib/packetPdfRender.ts` requires a session-bound Supabase client, never service role — RLS is what catches a wrong `userId`.
- Claude API JSON responses: strip markdown code fences before parsing.
- The generation model is set in `lib/config.ts` (`MODEL`).
- Stripe checkout only accepts the two price IDs in the server-side allow list (monthly and yearly). Never loosen or bypass that check.

---

## Subscription plans

| Plan | Packets/month | Price |
|------|--------------|-------|
| Free | 1 | $0 |
| Packet Day Unlimited | Unlimited | $12/mo or $108/yr |

Free tier is 1 packet/month per **account**, not per child.

---

## Colors (Tailwind tokens)

| Token | Hex | Use |
|-------|-----|-----|
| `sage` | #4A7C59 | Primary actions, headings |
| `honey` | #D4A843 | Accents, highlights |
| `coral` | #E07A5F | Errors, warnings, CTAs |
| `cream` | #FDFBF7 | Page background |
| `dark` | #1A1A2E | Body text |

---

## Commit message conventions (Conventional Commits)

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no logic change
refactor: Code change, not a feature or fix
test:     Adding or updating tests
chore:    Build process, dependencies, config
```

Examples:
- `feat: add child profile creation form`
- `fix: handle PDF generation timeout gracefully`
- `chore: update Stripe API version`

---

## Never do

- **No lorem ipsum** — use real, brand-appropriate copy
- **No generic error messages** — be specific and warm
- **No hardcoded secrets** — all secrets via env vars
- **No `SUPABASE_SERVICE_ROLE_KEY` in client components** — server only
- **No `ANTHROPIC_API_KEY` in client code** — server only
- **No dark mode** — the app uses a warm, cream-based palette; dark mode is not supported
- **No `console.log` in production code** — use proper error handling
- **No inline styles** — use Tailwind tokens
- **Don't use `tailwind.config.ts`** — Tailwind v4 uses CSS-based config in `globals.css`
- **Don't skip RLS** — all Supabase tables must have Row Level Security

---

## Agent operating rules

- **This repo is public on GitHub.** Never create a file inside the repo tree — including temporary or scratch files — that references `SUPABASE_SERVICE_ROLE_KEY` or any other secret. Scratch work belongs outside the repo entirely, not in a gitignored folder inside it.
- **Never widen a destructive action beyond what you verified.** If you confirmed 3 PIDs to kill, kill exactly those 3 — not a broader pattern match. Same discipline applies to file deletions and git operations: act only on the specific items you checked, never on a wider guess.
- **Stop after two failed tooling attempts.** If an approach to a tooling or environment problem fails twice, stop and report back rather than trying a third variant.
- **State hypothesis outcomes explicitly.** When debugging, say plainly whether each hypothesis was CONFIRMED or FAILED before moving to the next one. Never move on silently from a failed test.
- **Test through the real app when possible.** Prefer `npm run dev` plus the actual API route over hand-built scratch harnesses. The dev server resolves modules correctly; hand-rolled Node invocations on Windows often don't.
- **Andy is a beginner.** Explain results in plain English, not jargon.
- **Only commit and push when the prompt asks for it.** Riskier changes go on a preview branch and get tested on the Vercel preview URL before merging to main.
- **When asked to show a file or code, show the raw text** — never a summary.
- **"Read only" means no edits, no new files, no commits.**

---

## PDF and packets

- Serve PDFs with `Content-Disposition: inline` through a direct API route (`/api/generate-pdf`), not a blob URL — iOS Safari blocks blob URLs. (The desktop download button briefly uses `URL.createObjectURL`, but iOS is detected and sent straight to the API route instead.)
- Recraft v3's pinned version has no `vector_illustration` style option — don't use it.
- The child's name must be scrubbed before any text reaches the image model (IP guard, `lib/generateMascotImage.ts`). Printed text on the PDF keeps the real name.
- Existing packets in the database are the render regression suite. Never delete them as part of cleanup.
- PDF text has emoji stripped before rendering because the fonts don't cover emoji. Don't try to render emoji in PDFs.
- PDF images must be PNG or JPEG. The mascot is requested from Replicate as PNG. The coloring page comes back as webp and is converted with sharp.

---

## react-pdf gotchas (`components/PacketPDF.tsx`)

- **A long-lived `npm run dev` process with heavy hot-reload churn can corrupt react-pdf's internal state** — both its fontkit-based font-metrics cache and its Yoga flex-layout cache. Symptoms seen in practice: mid-word text clipping with dropped leading characters (e.g. "Explanation" rendering as "xplanation"), and a flex container collapsing to a sliver despite an explicit `minHeight`. Neither reproduces in a production build (`next build` never hot-reloads) or on a freshly started dev server with the identical code. **Restart the dev server before judging any visual PDF output**, and if you find a layout bug while testing, **re-verify it on a fresh process before fixing it** — confirm the bug survives a restart before spending time on a code fix, or you'll fix a phantom. **This explanation is not complete** — see the dropped-leading-capital-R entry below for a dropped-character bug that reproduced identically across multiple independent fresh (non-hot-reloaded) processes, so don't assume every "letter went missing" report is this cache issue without checking.
- **`<Text fixed render={...}/>` renders at the wrong vertical position, offset from its declared `bottom` by a large, consistent constant** (measured ~86.4pt on react-pdf 4.8.1) — this is real, not dev-server staleness; it reproduces identically in a production build and regardless of nesting (shared flex row, decoupled sibling, direct child of `<Page>`). `bottom` itself is still respected linearly; the render-prop text just has a fixed offset added on top. Matches https://github.com/diegomura/react-pdf/issues/525. Worked around in `PacketPDF.tsx` with a measured, named `RENDER_PROP_Y_OFFSET` constant (see the comment above `styles` in that file) rather than a bare magic number. **On any `@react-pdf/renderer` version upgrade, re-measure this offset before assuming the child-page footer is still aligned** — render a real multi-page packet, compare the "N of M" text's y-position against its "Made with love..." sibling's, and update the constant if they've drifted.
- **A leading capital "R" can be silently deleted from a string before it's painted** — confirmed on packet `c5343867-4be1-4415-aeec-8812757ab39b` (grade 5 band), four real instances: Reading Q1 "Recall:" → "ecall:", Science Q6 "Real-World Connection:" → "eal-World Connection:", Math's fun fact "Real pirates..." → "eal pirates...", Writing's fun fact "Robert Louis Stevenson..." → "obert Louis Stevenson...". Confirmed with `fitz`/PyMuPDF's `page.get_text("rawdict")`: the R is not painted invisibly or off-position — it is absent from the span's character list entirely, and the next character's glyph origin sits exactly at the text box's true left edge, with no space reserved for it. This is chunk 9 stage 4's "issue 3" — full investigation log is in that session, condensed here.

  **Always verify a suspected dropped character at the pixel/raw-glyph level, never from `pdftotext` or a single library's plain-text extraction alone.** A first broad scan across a second packet (grade 7 band, different theme) turned up what looked like six more drops (E, q, and R in various words) — every single one was extraction noise, not a real defect: `pdftotext` and PyMuPDF's plain `get_text()` disagreed with each other about what character was "missing" (one reported a gap, the other a wrong-but-present character), which is itself the signature of an extraction-layer artifact, not a rendering one. Cropping those exact spots at 400 DPI showed the words rendered perfectly. Only cross-checking against actual pixels — or `rawdict`'s per-character origin data — separates a real drop from extraction noise.

  **Ruled out, with evidence:**
  - *Damaged font file* — `fontTools` inspection of every registered face (Nunito 400/600/700, Fraunces 700/800) found the R glyph present, correctly `cmap`-mapped, with sane geometry (2 contours, 46 points, normal advance width) in all five. Not a font-file bug.
  - *Page-break / `wrap={false}` push-relayout* — the leading hypothesis for a while, cleanly disproven by a full sweep of every `wrap={false}` block in the real packet (question boxes, fun facts, bonus challenges, callouts): nine other first-characters (D, M, O, P×2, A, W, V, C, T) survive being pushed to a continuation page exactly the same way the R-words are pushed, including one case (Science Q5 "Prediction:" vs Q6 "Real-World Connection:") where two adjacent questions are pushed together via the identical mechanism and only the R-initial one drops. It also isn't *required* — "Robert Louis Stevenson" drops in the Writing activity's fun fact box, and that activity never spans a page break at all.
  - *Position alone, without the letter* — also disproven: "Remaining" and "Rocky" (both R-initial, both Nunito 400, same packet) render correctly on the parent answer sheet, because they sit mid-paragraph rather than as the literal first character of their own `<Text>` node. The failure needs **both** conditions — capital R, **and** being the first character of a string handed to a `<Text>` node — not either alone.

  **Proven mechanism, not yet a confirmed fix:** `@react-pdf/textkit`'s `wrapWords()` (`node_modules/@react-pdf/textkit/lib/textkit.js`) rebuilds the actual rendered string from the hyphenation callback's return value —
  ```js
  const parts = hyphenate(word, builtinHyphenate).map(removeSoftHyphens);
  syllables.push(...parts);
  string += parts.join('');   // the rendered text is reconstructed from the callback's output
  ```
  and the callback registered in `PacketPDF.tsx` (`Font.registerHyphenationCallback((word) => [word]);`, disabling hyphenation) is invoked on **every** word of every string in the document — confirmed by temporarily changing it to `(word) => [word.toUpperCase()]` and watching the entire rendered document, including text that was never touched by the change in source, come out in all caps. Temporarily commenting the callback out entirely made all four R-drops disappear, confirmed at the pixel level.

  **This is not a confirmed fix — do not act on it without re-establishing reproduction first.** Reverting to the exact original callback (`git diff` clean, confirmed) stopped reproducing the bug entirely: five consecutive fresh-restart trials all came back clean, including one with `.next` deleted and rebuilt from nothing, and one with Node's own compile cache (`%LOCALAPPDATA%\Temp\node-compile-cache` on Windows — a real, ~20MB, several-thousand-file disk cache that persists across process kills and `.next` deletion, present on Node 22+) also cleared. No cause was found for why it stopped reproducing — git-tracked source, the read-only dev render route, and the DB content (checked via `md5()` on the base64 image columns) were all confirmed unchanged. The mechanism above is real and verified; whether removing/replacing the hyphenation callback is what actually fixes the four known instances is **not** verified, because the bug could no longer be reproduced to test against. **Do not implement a workaround (e.g. a `sanitizeText` normalization) against this until it reproduces again** — anything changed now would be unfalsifiable.

  **Exact test to re-run if this resurfaces**, in order:
  1. Confirm the drop is real at the pixel level first (`page.get_text("rawdict")`, check the span's character list and the surviving character's `origin` — not `pdftotext`, not plain `get_text()` alone).
  2. Clear both caches before the first trial this time, so they can't confound the result: `rm -rf .next` and clear `%LOCALAPPDATA%\Temp\node-compile-cache`.
  3. Kill the *entire* dev-server process tree (cmd wrapper → `next dev` → `start-server.js` — trace with `wmic process where "ParentProcessId=<pid>"` and `taskkill /F` every PID, not just the one holding port 3000).
  4. `npm run dev`, wait for "Ready in", render the same packet, re-check the same string at the pixel level. Repeat 2-3 times independently before trusting a "fixed" or "still broken" result either way.
  5. Only once the drop reproduces reliably across multiple independent fresh restarts, comment out `Font.registerHyphenationCallback(...)` entirely and repeat step 4 to see if it clears. If it does, that's the first genuinely verified result on this bug — report it before writing a real fix, since "disable hyphenation differently" and "guard in `sanitizeText`" are different fixes with different costs.

---

## Email

- The packet-ready email sends once, no retry, inside its own try/catch — an email failure must never fail packet generation.
- Email HTML: table-based layout, fully inline styles. No `@font-face`, no `data:` URI images, no `cid:` images — use hosted image URLs.

### Email sequence

- `email_sends` is the ledger for every send attempt from the welcome/nurture sequence. Its unique constraint on `(user_id, email_key)` is the entire dedupe guarantee — an email is never sent twice to the same user under the same key. Dedupe is enforced by that constraint, never by a file (the retired `scripts/send-packet-back-email.ts` prototype used a local JSON file, which cannot survive on Vercel's ephemeral filesystem — do not copy that pattern into anything that runs on a schedule).
- Three `profiles` columns support the sequence: `marketing_opt_out` (set by the unsubscribe link; once true, the sequence must never email that user again), `last_cap_hit_at` (written from `app/api/generate-packet/route.ts`'s 403 `limit_reached` block, not from `check_and_increment_packet_usage`), and `sequence_started_at` (stamped in `app/auth/confirm/route.ts` right before the Email 1 send attempt, so sequence day-N counts from email confirmation, not signup).
- **Unsubscribe.** `lib/unsubscribe.ts` issues and verifies signed tokens (HMAC-SHA256 via `UNSUBSCRIBE_SECRET`, constant-time comparison, no expiry — an old email's link must keep working). `/unsubscribe` is a plain unauthenticated page (same posture as `/sample` or the public packet share page — no login required; `proxy.ts` only refreshes the session cookie there and never redirects) with a GET that only reads state and a POST, via a server action, that flips `profiles.marketing_opt_out`. `/api/unsubscribe` is the RFC 8058 one-click POST endpoint for Gmail/Yahoo's built-in unsubscribe button — also unauthenticated, token only, no page.
- **Safety lock.** `lib/emailFooter.ts` exports `assertMailingAddressReady()`, which throws if `MAILING_ADDRESS` is missing or still the `ADDRESS PENDING` placeholder. Every marketing send must call it (its footer/header builders already do) before a send can go out. Transactional email (packet ready, auth) must never call it and must never be blocked by a missing mailing address.
- **Before any marketing send:** check `profiles.marketing_opt_out` is false, and let the safety lock run. Both are load-bearing — skipping either means either emailing someone who opted out, or shipping a CAN-SPAM violation via a missing physical address.

### Email templates

- **Sender.** `lib/resend.ts` exports two from-addresses: `FROM_EMAIL` ("Packet Day <hello@packetday.com>") for auth email only, and `NATALIE_FROM` ("Natalie at Packet Day <hello@packetday.com>", reply-to `hello@packetday.com`) for the packet-ready email and every marketing template. `sendPacketReadyEmail` signs off "Natalie", not "The Packet Day team" — it stays transactional: no unsubscribe footer, no safety lock.
- **Templates live in `lib/emails/templates.ts`**, one builder function per key, each returning `{ subject, preview, html, text }`. They're built on `lib/emails/layout.ts`'s `renderMarketingEmail()`, the shared marketing shell (plain, single column, table based, inline styles, Georgia serif heading, system sans body, no web fonts, one CTA button, hidden preheader span, footer from `lib/emailFooter.ts`). Greeting always goes through `lib/firstName.ts`'s `greeting()` helper ("Hi Sarah," or "Hi there,") — never hand-rolled.
- **Email keys** (the full allowlist lives in `lib/emailKeys.ts`'s `EMAIL_KEYS`): `welcome_1`, `nudge_2`, `story_3`, `plans_4`, `faq_5`, `checkin_day1`, `cap_followup`, `packet_back_monthly` (a recurring monthly re-engagement send, ported from the retired one-time `scripts/send-packet-back-email.ts` prototype — same Natalie-approved copy, now on the shared layout/footer instead of its own ad hoc HTML).
- **Links.** `lib/emails/links.ts` builds every in-email link: `buildGenerateLink(emailKey)` for "Make a packet" buttons (→ `/generate`) and `buildUpgradeLink(emailKey)` for "Go Unlimited" buttons (→ `/dashboard?upgrade=yearly`). Both always use `https://www.packetday.com` and tag `utm_source=email`, `utm_medium=email`, `utm_campaign=<email key>`. The upgrade link also carries `src=<email key>` — `components/dashboard/UpgradeModalController.tsx` reads it, validates against `EMAIL_KEYS` via `isEmailKey()`, and if valid opens the modal with a `source` of `${emailKey}_email` so the resulting `checkout_started` event traces back to the email. Absent or invalid `src`, behavior is unchanged (`source` stays `"deep_link"`).
- **A logged-out `/generate` click** redirects to `/login?next=<current path + query, safeNext-validated>` and returns there after login — so a link from any of the templates above survives the login round trip with its utm tags intact.
- **Test sends.** `npm run test-emails` (`scripts/send-test-emails.ts`) sends every template plus the packet-ready email, one at a time, single-awaited, to `adrdefi+emailtest@gmail.com`, subjects prefixed `[TEST]`. It carries one test-only safety-lock exception: if `MAILING_ADDRESS` is still the placeholder, it overrides the value to `"ADDRESS PENDING (test)"` for its own process only (never touching a real send) — and only after confirming every recipient it will actually send to contains `"adrdefi"`.

**Sequencing rules the engine below implements:**
  a. Max one marketing email per user per Pacific calendar day. The packet-ready email is transactional and doesn't count.
  b. Priority when more than one is due: `cap_followup`, then `packet_back_monthly`, then the day-based sequence (`welcome_1` backstop, then `checkin_day1`, then the rest of the schedule).
  c. Skip `checkin_day1` if `cap_followup` was already sent, any period.
  d. Skip `plans_4` if `cap_followup` was sent in the last 7 days.
  e. Anything else that collides waits until the next day (or the next eligible run).
  f. Never send upgrade emails (`plans_4`, `cap_followup`) to paying users (`isPaidStatus`).
  g. The launch cutoff (`profiles.created_at >= launch date`) applies to every marketing email **except** `packet_back_monthly`, which goes to all free users who have made at least one completed packet — including users who signed up before launch.
  h. Test accounts (any email containing `adrdefi`) are always excluded from every marketing email, **except** an address on `EMAIL_TEST_ALLOWLIST` — see below.

**`scripts/send-packet-back-email.ts` (branch `feat/packet-back-email`) is retired and must never be run.** It was never actually scheduled — checked directly against Resend's send history, zero emails with any `scheduled_at` exist in the account. `packet_back_monthly` (below) is its real replacement, on the shared ledger instead of that script's local JSON dedupe file.

### Email sequence + behavioral engine (Phase 4 + 5)

Three independent candidate sources per user, computed fresh every cron run, funneled into one priority-sorted decision (`lib/emailSequence.ts`'s `resolveSequenceDecision`): the day-based sequence (`welcome_1` backstop, `nudge_2`, `story_3`, `faq_5`, `checkin_day1`, `plans_4`), `cap_followup`, and `packet_back_monthly`. Only the day-based sequence requires `sequence_started_at` — the other two don't, so a pre-launch user who was never enrolled in the sequence can still get `packet_back_monthly`.

- **Switches.**
  - `EMAIL_LAUNCH_AT` (ISO timestamp): only profiles with `created_at >= EMAIL_LAUNCH_AT` are enrolled in the day-based sequence (and `cap_followup`, which shares the same gate). Unset means nobody is enrolled. `packet_back_monthly` ignores this entirely (rule g).
  - `EMAIL_SEQUENCE_ENABLED`: anything other than exactly `"true"` forces the day-based sequence and `cap_followup` into a dry run.
  - `EMAIL_MONTHLY_ENABLED`: its own switch, fully independent of `EMAIL_SEQUENCE_ENABLED`. Anything other than exactly `"true"` forces `packet_back_monthly` into a dry run — regardless of the sequence switch, in either direction.
  - `EMAIL_MONTHLY_START` ("YYYY-MM", a UTC quota month): `packet_back_monthly` never fires for a period before this. Set to `2026-10` — October is the first real send.
  - `EMAIL_TEST_ALLOWLIST`: comma-separated exact email addresses that bypass the adrdefi exclusion and the launch cutoff — not the opt-out check, not `isPaidStatus`, not any collision rule, not the mailing-address safety lock. Empty by default (bypasses nothing).
  - `CRON_SECRET`: the cron route rejects any request without `Authorization: Bearer $CRON_SECRET`, constant-time compared. Vercel Cron sends this header automatically once the var is set on the project.
  - The mailing-address safety lock (`assertMailingAddressReady`) still runs on every real marketing send regardless of any of these — except one hardcoded, one-time exception, see below.
- **The sequence gate** (`lib/emailSequenceGate.ts`'s `passesSequenceGate`) is the one shared implementation of "allowlisted, or launch cutoff cleared and not adrdefi" — used identically by the confirm route's stamping decision and by `cap_followup`'s eligibility, so the two can never drift apart.
- **Stamping vs. sending.** `app/auth/confirm/route.ts` stamps `profiles.sequence_started_at` for every eligible user regardless of `EMAIL_SEQUENCE_ENABLED` — stamping is not sending, and without the stamp the cron can never find that user later to backstop them. Only the welcome_1 send itself is gated on `EMAIL_SEQUENCE_ENABLED === "true"`, bounded to 3 seconds via a real `AbortController` (see `sendMarketingEmail`'s `timeoutMs` in `lib/resend.ts` — a genuine cancellation of the in-flight HTTP call, awaited to completion, never a `Promise.race`-and-abandon).
- **UTC quota month, not Pacific.** `cap_followup` and `packet_back_monthly` key off the same UTC calendar-month boundary `check_and_increment_packet_usage` and `get_my_packet_usage` use (`date_trunc('month', now())` under this project's UTC database session timezone — confirmed directly, not assumed) — see `lib/emailSequence.ts`'s `utcQuotaMonth`. A cap hit at 6pm Pacific on Sept 30 is already past 1am UTC Oct 1, so it keys to October, matching what the quota system itself considers October usage.
- **Period-keyed send ledger** (`lib/emailSends.ts`, `lib/emailSequence.ts`'s `buildPeriodicSendKey`). `cap_followup` and `packet_back_monthly` claim `"cap_followup:2026-10"` / `"packet_back_monthly:2026-10"` — a fresh UTC-month period claims its own slot instead of being permanently blocked by the unique `(user_id, email_key)` constraint after the first send. `claimEmailSend`'s key is plain `string`, not the `EmailKey` literal union, to allow this. Row lookups (`deriveAttemptedState`) match these two by **prefix**, not exact string, so a period-suffixed row still backs rules c and d and the "already sent this period" checks.
- **`cap_followup`.** Eligible: passes the sequence gate, not opted out, not `isPaidStatus`, `last_cap_hit_at` falls in the current UTC quota month, and still capped by the same lazy-reset-aware expression `check_and_increment_packet_usage` uses (`packets_used_this_month` only reflects the current month if `packets_reset_date` is that month — otherwise real usage is 0 even though the column hasn't been rewritten yet). Sends at the first 8am Pacific run after `last_cap_hit_at`, 2-day catch-up, then skipped for that period. Gated by `EMAIL_SEQUENCE_ENABLED`.
- **`packet_back_monthly`.** Eligible: not `isPaidStatus`, not opted out, not adrdefi unless allowlisted, at least one completed packet ever, no completed packet created in the current UTC quota month. No launch cutoff. Due Pacific day 1 of the month, 1-day catch-up (through day 2) — its own, shorter window than the sequence's usual 2 days. Gated by `EMAIL_MONTHLY_ENABLED` and `EMAIL_MONTHLY_START`.
- **`?forceMonthly=1`** (still requires `CRON_SECRET`, still fully respects `EMAIL_MONTHLY_ENABLED` and `?dryRun=1`) substitutes one coherent simulated `now` — 8am Pacific on the 1st of next month (`lib/emailSequence.ts`'s `simulateNextMonthFirstAt8amPacific`, itself built from `nextUtcQuotaMonth`) — for the real one, uniformly across **every** candidate source for the run, not a per-source bypass. That single substitution is what makes it a real simulation rather than a partial one: `cap_followup`'s own UTC-quota-month comparison correctly sees a real last-month cap hit as stale and skips it (the same "cap hit last month, skip" rule, exercised live), `isStillCapped` correctly sees a real prior-month `packets_reset_date` as rolled over, and the Pacific-hour-8 gate and `packet_back_monthly`'s day-of-month window are satisfied because the clock genuinely reads 8am on the 1st — none of it needs its own special case once the clock itself is coherent. `resolveSequenceDecision` has no idea whether `now` is real or simulated. It also restricts the **entire run** — every candidate source, not just monthly — to `EMAIL_TEST_ALLOWLIST` addresses, so a forced test run can never reach a real user. The response's `ranAt` is always the real wall-clock time this request was processed; `simulatedNow` is the faked instant, or `null` when `forceMonthly` wasn't set.
- **Address lock exception (one time — DELETE after October 2, 2026).** `lib/emailFooter.ts` exports `ADDRESS_LOCK_EXCEPTION_KEY`, hardcoded to the exact string `"packet_back_monthly:2026-10"` — not a pattern, not an env var, not derived from `EMAIL_MONTHLY_START`. Every footer/header builder (`buildMarketingEmailFooterHtml`/`Text`/`buildMarketingEmailHeaders`) now takes an optional `emailSendKey` second argument; when it's exactly that one string, `assertMailingAddressReady` doesn't throw even with `MAILING_ADDRESS` missing or `"ADDRESS PENDING"`, the footer keeps the unsubscribe link and `List-Unsubscribe` headers, and only the address line itself is omitted. Every other send — `packet_back_monthly:2026-11` and every later period, `cap_followup` at any period, every one-shot sequence email — still throws exactly as before; nothing else changed. If a real `MAILING_ADDRESS` is set before the October send goes out, it prints normally (the exception only ever suppresses the *throw* and the *line*, never a real address once one exists). **Once October 2, 2026 has passed, delete `ADDRESS_LOCK_EXCEPTION_KEY` and every branch that checks it** — the `emailSendKey` plumbing through the footer builders can stay (it's harmless and inert without the constant), but the exception itself must not persist as a reusable mechanism.
- **Cron** (`app/api/cron/email-sequence/route.ts`, `vercel.json`'s hourly `0 * * * *` schedule). Each run:
  - Loads every profile with `marketing_opt_out = false` (adrdefi excluded unless allowlisted) — not just those enrolled in the sequence; `cap_followup` and `packet_back_monthly` are checked independently per user.
  - Computes, per user, `dayN` (whole Pacific calendar days since `sequence_started_at`, `null` if never enrolled) and `activated` (a `packets` row with `generated_content` present, computed fresh every run, never cached).
  - **Not-activated track:** `nudge_2` day 2, `story_3` day 5, `faq_5` day 9. **Activated track:** `checkin_day1` the Pacific day after their first activated packet (only if within the sequence's first 14 days), `story_3` day 5, `plans_4` day 9, `faq_5` day 13. A user who activates mid-sequence switches tracks naturally and never gets `nudge_2` once activated — and since `packet_back_monthly` also requires at least one completed packet, a user can never be a `nudge_2` candidate and a `packet_back_monthly` candidate at the same time.
  - Every due email — including the `welcome_1` backstop, treated as "due day 0" — gets a 2-day catch-up window (1 day for `packet_back_monthly`), then it's skipped for good; this is what keeps flipping a switch back on from ever flooding a backlog of stale sends.
  - When more than one email is due the same day, priority picks exactly one (rule b) and everything else waits.
  - A candidate's `readyToSend` folds in both the Pacific-hour-8 gate (not applied to the `welcome_1` backstop) and its own switch (`EMAIL_SEQUENCE_ENABLED` or `EMAIL_MONTHLY_ENABLED`) — so "due but not ready" can mean either the wrong hour or the relevant switch being off, reported explicitly in the JSON.
  - Sends are awaited one at a time, capped at 50 per run; anything past the cap is reported and retried next run.
  - `?dryRun=1` forces every candidate source into report-only regardless of its own switch. The JSON response reports `sequenceEnabled`/`monthlyEnabled` (each already folding in `?dryRun=1`) plus every considered user's day/track/decision and the reason, and a status-count summary.

---

## Site, SEO & share images

- Situation pages (`/sick-day`, `/road-trip`) are a shared kit. Every new situation page also needs an entry in `lib/situations/og-content.ts`.
- Share images: situation pages use `app/og/[slug]`; blog posts use `app/og/blog/[slug]`, prerendered with `generateStaticParams`. New blog posts get an image automatically.
- The spec block in `content/blog/*.md` is metadata only — it must never render on the page.

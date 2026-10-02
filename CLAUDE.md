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
- **Keep factual copy honest.** `/sample` features Kai (grade 4), with Mia (grade 1) and Jonah (grade 7) in its grade toggle. None of them is Natalie's child. Label them as sample packets and never imply a real family used them unless Andy confirms it.
- **Never add, edit, or mark testimonials as verified in `lib/testimonials.ts`** without Andy confirming the person and quote are real.

### Sample packet fact check (`/sample` and any other showcase)

- Before keeping any packet as a sample, check every science, history, and number claim in it: the reading, every Did You Know, puzzle clues and words, science steps, the parent notes, and the answer key. Work every math answer yourself.
- Also flag loose wording a careful parent could call wrong, even if it is technically defensible. Examples that slipped through once: "Pluto was renamed in 2006" (it was reclassified, not renamed) and "more massive planets mean heavier surface weight" (surface gravity depends on mass and radius; Uranus is the counterexample).
- Report every flag to Andy, including ones you decided to keep, and say why.
- If anything is wrong, or loose enough that you would not defend it to a careful parent, regenerate the packet with the same forced puzzle type. Never hand edit a sample packet. Fact check the new one the same way.

---

## Tech stack

| Tool | Purpose |
|------|---------|
| Next.js 16 (App Router) | Framework |
| TypeScript (strict) | Language |
| Tailwind CSS v4 | Styling (CSS-based config, no tailwind.config.ts) |
| Supabase | Database, Auth, Storage |
| Stripe | Payments & subscriptions |
| Anthropic Claude API | Packet generation (model: claude-opus-5-5) |
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
- **When asked to show a file or code, show the raw text** — never a summary.
- **"Read only" means no edits, no new files, no commits.**

---

## Working rules

1. **Keep going.** When a step doesn't need Andy's input, keep working. Put status notes in the same message as your next action. Stop and ask only when you truly can't continue without him. The exceptions: the hard stops below, and the "stop after two failed tooling attempts" rule in Agent operating rules.

2. **Hard stops.** Always stop and ask before any of these:
   - merging or pushing to `main`
   - force pushing (any branch)
   - running a Supabase migration
   - deleting or altering production data (remember: one Supabase project serves both local dev and production, so "local" data changes are production changes)
   - changing anything in Stripe (sandbox actions change real production profiles too)
   - changing production environment variables
   - changing anything outside this repo

3. **Commits, branches, and definition of done.** A task is done when the build passes. Work on a non-`main` branch and push it; pushing a branch is part of the job, not a hard stop. If the prompt says not to push (or not to commit), follow the prompt and say so in the report.

4. **Previews cost build minutes, so make them only when needed.** Pushing a branch does NOT build a Vercel preview: `vercel.json`'s `git.deploymentEnabled` builds only `main`. Make a preview only when Andy asks for one or when a change needs his visual review, and then run `npm run preview` (optionally `npm run preview -- /some-path`). It builds on this machine, uploads with `vercel deploy --prebuilt`, and prints the preview URL plus a 7 day share link that works without a Vercel login; put that share link in the report. It needs the Vercel CLI logged in (`npx vercel login`). Production still builds on Vercel when `main` is pushed.

5. **Subagents.** Use subagents and parallel workflows however you judge best, especially for audits, sitewide sweeps, and large reviews.

6. **Final report.** End every task with three headings:
   - **Blocked on me:** anything waiting on Andy's decision or approval.
   - **Changed:** what you changed, briefly.
   - **Found:** issues or risks you noticed. Clearly mark anything you could not verify yourself, and say why.

   Keep it in plain English (see "Andy is a beginner" above).

7. **Copy rule reminder.** Never use em dashes or hyphens as punctuation in any user facing copy. This adds to the Brand voice & tone rules at the top of this file.

---

## PDF and packets

- Serve PDFs with `Content-Disposition: inline` through a direct API route (`/api/generate-pdf`), not a blob URL — iOS Safari blocks blob URLs. (The desktop download button briefly uses `URL.createObjectURL`, but iOS is detected and sent straight to the API route instead.)
- Recraft v3's pinned version has no `vector_illustration` style option — don't use it.
- The child's name must be scrubbed before any text reaches the image model (IP guard, `lib/generateMascotImage.ts`). Printed text on the PDF keeps the real name.
- Existing packets in the database are the render regression suite. Never delete them as part of cleanup.
- PDF text has emoji stripped before rendering because the fonts don't cover emoji. Don't try to render emoji in PDFs.
- PDF images must be PNG or JPEG. The mascot is requested from Replicate as PNG. The coloring page comes back as webp and is converted with sharp.

### Coloring page grade bands

- The GPT Image 2 coloring prompt has three grade bands, picked in a blind bakeoff on 2026-09-29 (the `image-bakeoff` branch, `scripts/image-bakeoff.ts`). **K-2** is the original `buildColoringPrompt`, locked byte for byte. **3-5** is round 1 variant 35B (medium outlines, fuller scene, simple decorative patterns). **6-8** is round 2 variant D_T2 (intricate line art, clean continuous outlines, no labels on equipment, a few larger open areas). All three use quality "low". The Recraft fallback keeps the original prompt for every grade.
- The band comes from `coloringBandForGrade` in `lib/generateMascotImage.ts`. It uses `bandForGrade` from `lib/pdf-tokens.ts` for any readable grade, and K-2 for a missing or unreadable one. Don't change `bandForGrade` for coloring; the PDF depends on it.
- The packet writer asks for 3-5 named objects in `coloring_scene` for K-2, 4-6 for grades 3-5, and 5-7 for grades 6-8, and never for signs, labels, or anything written.
- **Lock check.** `npm run check-coloring-prompt` compares all three bands and the Recraft fallback against pasted exact strings, and checks every grade's band. Run it after touching anything in the coloring prompt. If a prompt changes on purpose, update the expected string in `scripts/check-coloring-prompt.ts` in the same commit.
- **Bakeoff sync.** The bakeoff script holds its own copy of the production prompt. Whenever the production coloring prompt changes, re-copy it into `scripts/image-bakeoff.ts` on the `image-bakeoff` branch before the next bakeoff round.

---

## react-pdf gotchas (`components/PacketPDF.tsx`)

- **A long-lived `npm run dev` process with heavy hot-reload churn can corrupt react-pdf's internal state** — both its fontkit-based font-metrics cache and its Yoga flex-layout cache. Symptoms seen in practice: mid-word text clipping with dropped leading characters (e.g. "Explanation" rendering as "xplanation"), and a flex container collapsing to a sliver despite an explicit `minHeight`. Neither reproduces in a production build (`next build` never hot-reloads) or on a freshly started dev server with the identical code. **Restart the dev server before judging any visual PDF output**, and if you find a layout bug while testing, **re-verify it on a fresh process before fixing it** — confirm the bug survives a restart before spending time on a code fix, or you'll fix a phantom. **Dropped letters have their own, now known cause:** the "xplanation" symptom above is most likely the "Stale glyph cache" entry below, so check for that before blaming hot reload.
- **`<Text fixed render={...}/>` renders at the wrong vertical position, offset from its declared `bottom` by a large, consistent constant** (measured ~86.4pt on react-pdf 4.8.1) — this is real, not dev-server staleness; it reproduces identically in a production build and regardless of nesting (shared flex row, decoupled sibling, direct child of `<Page>`). `bottom` itself is still respected linearly; the render-prop text just has a fixed offset added on top. Matches https://github.com/diegomura/react-pdf/issues/525. Worked around in `PacketPDF.tsx` with a measured, named `RENDER_PROP_Y_OFFSET` constant (see the comment above `styles` in that file) rather than a bare magic number. **On any `@react-pdf/renderer` version upgrade, re-measure this offset before assuming the child-page footer is still aligned** — render a real multi-page packet, compare the "N of M" text's y-position against its "Made with love..." sibling's, and update the constant if they've drifted.
- **Stale glyph cache: dropped leading letters and scrambled copy and paste.** fontkit (react-pdf's font engine) keeps one Glyph object per glyph id for the life of the process, and records which character it stands for only the first time it is created. If anything first asks for a glyph by id alone, the cache records it as standing for no character. Every later render in that process then drops that letter when it starts a text block (packet `cb27632a` page 9 printed "Jump" as "ump"; packet `c5343867` printed "Recall", "Real" and "Robert" without the R) and scrambles it in the PDF text layer elsewhere (the page looks right, but copy and paste does not). A fresh process never shows it, which is why earlier reports "stopped reproducing". Reproduced exactly on 2026-09-29 by caching a capital with empty code points before a render. One real trigger is known: the fleet sweep of 2026-09-29 (all 176 packets in one process) caught the combining acute accent (U+0301, the accent part of "é") going stale on its own, because the PDF font subsetter asks for the parts of accented letters by id alone. Without the guard that sweep produced 3 stale glyph fingerprints. What first poisoned the J and R in the real reports is still unknown; it was not the packet text, a damaged font file, or a font substitution rule.
  - **The guard.** `lib/pdfGlyphCache.ts`, called from `renderPacketPdf` in `lib/packetPdfRender.ts`. That function is the only place allowed to call `renderToBuffer`; generate-pdf, the generate-packet pre-render, dev-render-packet, the sweep, and the other scripts all go through it. Before each render it loads every registered font (including the italic entries that point at upright files), repairs any stale cached glyph, and warms every keyboard character plus curly quotes, en and em dashes, the ellipsis, bullets, the no-break space (U+00A0, which the template uses to keep fill-in expressions on one line), and the combining accent marks (U+0300 to U+036F) through the correct path (once per font object). Never widen that list to every character a font maps: glyphs like "ﬁ" (U+FB01) are also what ligatures produce, and warming them caches "fi" as one character, which drops and shifts text (tested on 2026-09-29: every "fi" word vanished from the text layer and two packets lost a page). After each render it checks every cached glyph the font maps directly from a character, logs `PDF GLYPH CACHE STALE` with the font, character and packet id plus a stack trace, and repairs it. Neither step can throw or fail a render. Cost: about 20 ms on the first render in a process, under 1 ms after that.
  - **If `PDF GLYPH CACHE STALE` ever shows up in logs**, its stack trace is the best lead on the real trigger. Save it.
  - **Depends on react-pdf internals** (`FontSource.data`, and fontkit's `_glyphs` and `_cmapProcessor`), pinned at `@react-pdf/renderer` 4.8.1 and fontkit 2.0.4. **Recheck `lib/pdfGlyphCache.ts` on any upgrade of either**, then rerun a poison test and the full sweep.
  - **Detecting it.** `npm run sweep` reports "Stale glyph fingerprints": pdfkit writes a stale glyph as an empty `<>` entry in its font's ToUnicode map, so a healthy render has none. To confirm one suspected drop, check it at the raw glyph level with PyMuPDF `page.get_text("rawdict")` (the letter is missing from the span and the next glyph starts at the text box's true left edge). Never trust `pdftotext` or plain `get_text()` alone for this; they produce false alarms.
  - **Correction.** An earlier version of this entry blamed the hyphenation callback, `Font.registerHyphenationCallback((word) => [word])`. That was wrong. The callback returns every word unchanged, so textkit's `wrapWords()` rebuilds exactly the same text. Leave the callback alone.
- **`<Page wrap={false}>` changes the page size.** react-pdf then sizes the page to its content, not to `size="LETTER"` (measured 680 to 763pt tall on 2026-10-01). For a "one page, never spill" layout, keep a normal letter page and put `wrap={false}` plus an explicit `height` on one inner View. That View must not use `activityContent`: its `flex: 1` sets `flexBasis: 0`, which overrides the height and collapses the block (every `<Svg>` inside then lays out at zero height and the render throws "unsupported number: Infinity").
- **A tiny document loses the "N of M" footer.** A packet rendered with just one or two activities prints no page numbers at all, even with the untouched templates; a full packet prints them on every page. Render real, full packets when checking footers.
- **`<Svg>` sizes itself from its width, not from leftover space.** Its height comes from width divided by the viewBox ratio, and `flexGrow` on the Svg is ignored (tested 2026-10-01). Give it an exact `width` and `height`; the viewBox then scales into that box, centered.

---

## Puzzle break (rotating puzzles)

- Four types rotate: word search, maze, sudoku, crossword. The server picks the type before the AI call (`lib/puzzles/rotation.ts`), never the type of the child's last full day packet. The AI writes only words, clues and copy; `lib/puzzles` builds and validates every grid at generation time and stores it on the puzzle activity as `activity.puzzle`, plus top level `puzzle_type` and `joke` in `generated_content`.
- **Old packets are untouched.** `PacketPDF.tsx` renders `RotatingPuzzleTemplate` only when `activity.puzzle.data` exists; otherwise the original `PuzzleBreakTemplate` runs exactly as before.
- **One page, planned in code.** `lib/puzzles/pageLayout.ts` estimates every text block's height from real glyph widths (`lib/puzzles/fontMetrics.ts`, generated from `public/fonts`; regenerate if the PDF fonts change) and gives the grid the exact size left. The style values in `PacketPDF.tsx`'s puzzle styles and `PUZZLE_TYPE` in `pageLayout.ts` must stay in sync. Text caps live in `lib/puzzles/textCaps.ts` and are also stated in the prompt.
- **Text caps keep whole sentences only** (`lib/puzzles/textCaps.ts`): an intro whose first sentence is over its cap becomes a stock line with the child's and mascot's names; a Did You Know whose first sentence is over is left out; a joke over its cap is dropped and the original encouragement callout shows instead. Nothing is ever cut mid sentence or given added punctuation.
- **Parent sheet.** A stored puzzle adds a "Puzzle Break" entry, always LAST and one unbreakable block: the solved grid at 130pt, a text key (word positions for a word search, answers for a crossword), and the joke right side up. The sheet may flow onto a second page. Every "has a parent sheet" check uses `hasParentSheetEntry` (answer_key or a stored puzzle), which is the old check for old packets.
- **Footer totals.** Kid page footers print "N of totalPages - 1", assuming a one page parent sheet. For puzzle packets only, `renderPacketPdf` learns the sheet's page count during the first render (`onParentSheetPages`) and, only if it isn't one, renders again with `kidPageTotal` (passed down through React context to `ChildPageFooter`). Old packets keep the old count, wrong when their sheet runs to two pages (real packet `64ef5f7a` from April does); see docs/WAITING_FIXES.md item 5.
- **Checks.** `npm run check-puzzles` (generators, ~200 seeds per type and band), `npm run check-puzzle-rotation` (picker, jokes, prompt, build and store), `npm run render-puzzles` (renders all 12 type and band pages plus worst case versions to `tmp-renders/puzzle-rotation/`, and proves an old packet renders pixel for pixel the same as its baseline; record a baseline with `-- --baseline` on code that predates a change).

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
  i. Internal accounts listed in `lib/emailInternalAccounts.ts` (Andy and Natalie's own non-adrdefi addresses) are always excluded from every cron-sent marketing email, case-insensitively. `EMAIL_TEST_ALLOWLIST` does **not** bypass this list.

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
  - The mailing-address safety lock (`assertMailingAddressReady`) still runs on every real marketing send regardless of any of these — except for `packet_back_monthly`, see below.
- **The sequence gate** (`lib/emailSequenceGate.ts`'s `passesSequenceGate`) is the one shared implementation of "allowlisted, or launch cutoff cleared and not adrdefi" — used identically by the confirm route's stamping decision and by `cap_followup`'s eligibility, so the two can never drift apart.
- **Stamping vs. sending.** `app/auth/confirm/route.ts` stamps `profiles.sequence_started_at` for every eligible user regardless of `EMAIL_SEQUENCE_ENABLED` — stamping is not sending, and without the stamp the cron can never find that user later to backstop them. Only the welcome_1 send itself is gated on `EMAIL_SEQUENCE_ENABLED === "true"`, bounded to 3 seconds via a real `AbortController` (see `sendMarketingEmail`'s `timeoutMs` in `lib/resend.ts` — a genuine cancellation of the in-flight HTTP call, awaited to completion, never a `Promise.race`-and-abandon).
- **UTC quota month, not Pacific.** `cap_followup` and `packet_back_monthly` key off the same UTC calendar-month boundary `check_and_increment_packet_usage` and `get_my_packet_usage` use (`date_trunc('month', now())` under this project's UTC database session timezone — confirmed directly, not assumed) — see `lib/emailSequence.ts`'s `utcQuotaMonth`. A cap hit at 6pm Pacific on Sept 30 is already past 1am UTC Oct 1, so it keys to October, matching what the quota system itself considers October usage.
- **Period-keyed send ledger** (`lib/emailSends.ts`, `lib/emailSequence.ts`'s `buildPeriodicSendKey`). `cap_followup` and `packet_back_monthly` claim `"cap_followup:2026-10"` / `"packet_back_monthly:2026-10"` — a fresh UTC-month period claims its own slot instead of being permanently blocked by the unique `(user_id, email_key)` constraint after the first send. `claimEmailSend`'s key is plain `string`, not the `EmailKey` literal union, to allow this. Row lookups (`deriveAttemptedState`) match these two by **prefix**, not exact string, so a period-suffixed row still backs rules c and d and the "already sent this period" checks.
- **`cap_followup`.** Eligible: passes the sequence gate, not opted out, not `isPaidStatus`, `last_cap_hit_at` falls in the current UTC quota month, and still capped by the same lazy-reset-aware expression `check_and_increment_packet_usage` uses (`packets_used_this_month` only reflects the current month if `packets_reset_date` is that month — otherwise real usage is 0 even though the column hasn't been rewritten yet). Sends at the first 8am Pacific run after `last_cap_hit_at`, 2-day catch-up, then skipped for that period. Gated by `EMAIL_SEQUENCE_ENABLED`.
- **`packet_back_monthly`.** Eligible: not `isPaidStatus`, not opted out, not adrdefi unless allowlisted, at least one completed packet ever, no completed packet created in the current UTC quota month. No launch cutoff. Due Pacific day 1 of the month, 1-day catch-up (through day 2) — its own, shorter window than the sequence's usual 2 days. Gated by `EMAIL_MONTHLY_ENABLED` and `EMAIL_MONTHLY_START`.
- **`?forceMonthly=1`** (still requires `CRON_SECRET`, still fully respects `EMAIL_MONTHLY_ENABLED` and `?dryRun=1`) substitutes one coherent simulated `now` — 8am Pacific on the 1st of next month (`lib/emailSequence.ts`'s `simulateNextMonthFirstAt8amPacific`, itself built from `nextUtcQuotaMonth`) — for the real one, uniformly across **every** candidate source for the run, not a per-source bypass. That single substitution is what makes it a real simulation rather than a partial one: `cap_followup`'s own UTC-quota-month comparison correctly sees a real last-month cap hit as stale and skips it (the same "cap hit last month, skip" rule, exercised live), `isStillCapped` correctly sees a real prior-month `packets_reset_date` as rolled over, and the Pacific-hour-8 gate and `packet_back_monthly`'s day-of-month window are satisfied because the clock genuinely reads 8am on the 1st — none of it needs its own special case once the clock itself is coherent. `resolveSequenceDecision` has no idea whether `now` is real or simulated. It also restricts the **entire run** — every candidate source, not just monthly — to `EMAIL_TEST_ALLOWLIST` addresses, so a forced test run can never reach a real user. The response's `ranAt` is always the real wall-clock time this request was processed; `simulatedNow` is the faked instant, or `null` when `forceMonthly` wasn't set.
- **Monthly address fallback.** `packet_back_monthly` (and only it) may send without a mailing address. `lib/emailFooter.ts`'s `assertMailingAddressReady(emailSendKey)` skips the throw when the key is `packet_back_monthly` or `packet_back_monthly:<period>`; the footer then omits only the address line and keeps the unsubscribe link and `List-Unsubscribe` headers. Once `MAILING_ADDRESS` holds a real value it prints automatically, no code change. The cron route logs `MONTHLY EMAIL SENT WITHOUT MAILING ADDRESS: set MAILING_ADDRESS in Vercel` once per run when this happens. Every other marketing email (`cap_followup` at any period, every one-shot sequence email) still throws exactly as before. `npm run test-emails -- --monthly-only` sends just this template to `adrdefi@gmail.com` (subject `[TEST]`), never touching `email_sends`.
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
- When you edit the content of a blog post (content/blog/*.md), set or update its **Updated:** YYYY-MM-DD line to today. When you edit a situation page's copy or metadata, update its updated date in lib/situations. When adding a new situation page, add its line to lib/situations/sitemap-dates.ts. Punctuation-only or formatting-only changes don't count.

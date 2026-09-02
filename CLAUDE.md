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
  (dashboard)/          # Authenticated app shell
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
  anthropic.ts          # Claude client + packet generation logic
  resend.ts             # Resend email client + email helpers
  pdf.ts                # PDF utilities and shared constants
hooks/
  useUser.ts            # Current auth user
  useToast.ts           # Toast notification state
types/
  index.ts              # User, Child, Packet, Subscription interfaces
```

---

## Database tables (Supabase)

| Table | Key fields |
|-------|-----------|
| `profiles` | `id` (= auth.users.id), `email`, `full_name`, `avatar_url` |
| `children` | `id`, `user_id`, `name`, `age`, `grade_level`, `interests` (array), `learning_style`, `notes` |
| `packets` | `id`, `user_id`, `child_id`, `title`, `theme`, `date`, `subjects` (array), `activities` (jsonb), `status`, `pdf_url` |
| `subscriptions` | `id`, `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `plan_id`, `status`, `packets_used_this_month`, `packets_limit` |

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
| `STRIPE_STARTER_PRICE_ID` | Yes | No | Monthly plan on /pricing |
| `STRIPE_FAMILY_PRICE_ID` | Yes | No | Annual plan on /pricing |
| `ANTHROPIC_API_KEY` | Yes | **No** — server only |
| `REPLICATE_API_TOKEN` | Optional | **No** — server only |
| `RESEND_API_KEY` | Yes | **No** — server only |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes |

---

## Subscription plans

| Plan | Packets/month | Price |
|------|--------------|-------|
| Free | 1 | $0 |
| Starter | 20 | $9/mo |
| Family | Unlimited | $19/mo |

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

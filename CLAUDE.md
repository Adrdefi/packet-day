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

- **A long-lived `npm run dev` process with heavy hot-reload churn can corrupt react-pdf's internal state** — both its fontkit-based font-metrics cache and its Yoga flex-layout cache. Symptoms seen in practice: mid-word text clipping with dropped leading characters (e.g. "Explanation" rendering as "xplanation"), and a flex container collapsing to a sliver despite an explicit `minHeight`. Neither reproduces in a production build (`next build` never hot-reloads) or on a freshly started dev server with the identical code. **Restart the dev server before judging any visual PDF output**, and if you find a layout bug while testing, **re-verify it on a fresh process before fixing it** — confirm the bug survives a restart before spending time on a code fix, or you'll fix a phantom.
- **`<Text fixed render={...}/>` renders at the wrong vertical position, offset from its declared `bottom` by a large, consistent constant** (measured ~86.4pt on react-pdf 4.8.1) — this is real, not dev-server staleness; it reproduces identically in a production build and regardless of nesting (shared flex row, decoupled sibling, direct child of `<Page>`). `bottom` itself is still respected linearly; the render-prop text just has a fixed offset added on top. Matches https://github.com/diegomura/react-pdf/issues/525. Worked around in `PacketPDF.tsx` with a measured, named `RENDER_PROP_Y_OFFSET` constant (see the comment above `styles` in that file) rather than a bare magic number. **On any `@react-pdf/renderer` version upgrade, re-measure this offset before assuming the child-page footer is still aligned** — render a real multi-page packet, compare the "N of M" text's y-position against its "Made with love..." sibling's, and update the constant if they've drifted.

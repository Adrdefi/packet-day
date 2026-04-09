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
| Anthropic Claude API | Packet generation (model: claude-opus-4-6) |
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
| `STRIPE_STARTER_PRICE_ID` | Yes | No |
| `STRIPE_FAMILY_PRICE_ID` | Yes | No |
| `ANTHROPIC_API_KEY` | Yes | **No** — server only |
| `RESEND_API_KEY` | Yes | **No** — server only |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes |

---

## Subscription plans

| Plan | Packets/month | Price |
|------|--------------|-------|
| Free | 3 | $0 |
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

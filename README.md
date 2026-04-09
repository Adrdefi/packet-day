# Packet Day

> Your backup plan for the hard days.

Personalized, printable daily learning packets for homeschool families — powered by AI.

## Getting Started

```bash
cp .env.local.example .env.local
# Fill in your environment variables, then:
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** — brand tokens in `app/globals.css`
- **Supabase** — database, auth, storage
- **Stripe** — payments & subscriptions
- **Anthropic Claude** — packet generation
- **@react-pdf/renderer** — PDF output
- **Resend** — transactional email
- **Vercel** — hosting

## Docs

See [CLAUDE.md](./CLAUDE.md) for brand voice guidelines, database schema, environment variable reference, and development conventions.

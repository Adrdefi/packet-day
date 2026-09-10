# Landing Page Handoff — /sick-day + /road-trip

## What this package is

Two conversion landing pages for packetday.com, final copy included. These are the pages the blog CTAs point to — 15 of 22 blog CTAs link to `/sick-day`, 6 link to `/road-trip`. Both must be live before the blog launches (the blog is currently being built in a separate workstream).

**Package contents:**

- `pages/sick-day.md` — final page copy + SEO metadata spec block (top of file)
- `pages/road-trip.md` — final page copy + SEO metadata spec block (top of file)
- `design-system.md` — Packet Day brand design system (Fraunces/Nunito, sage/honey/coral/cream, Natalie's voice). Apply to both pages.
- `mockup/sick-day-mockup.html` — visual reference for the /sick-day page layout and tone. **Reference only** — do not port as production code. Note: it contains a dinosaur emoji as a placeholder visual; use a real illustration in the live build.

## The job in one sentence

Build `/sick-day` and `/road-trip` as Next.js pages with the copy in `pages/`, real SEO metadata from each file's spec block (title tag, meta description, canonical URL — do not visibly render the spec blocks), FAQ schema markup, a cross-link strip between the two pages, and a new "browse by situation" section on the homepage.

## Funnel role (do not change)

These pages **sell the generation mechanism**, they do not educate like the blog. Their job: make the generation tangible, answer objections, ask for signup. Every CTA button on both pages points to **/signup** — never change a CTA to a different destination. Blog → landing page → signup is the architecture; these pages carry the signup CTA so the blog doesn't have to.

## Copy doctrine (hard rules)

- Sell the generation, never a pre-made packet. Every packet is generated from scratch on command.
- Headlines name the mechanism ("generated around your kid in 60 seconds").
- Verbs: **generate, make, create**. Never "download" except to deny the static-download model.
- Figures: packets are **12–18 pages**, **2–5 hours** of learning. Never "14 pages" or "2–6 hours".
- Pricing (verified): one free packet/month, no card. Unlimited: **$9/month billed annually ($108/year)** or **$12/month monthly**. Covers unlimited packets and unlimited kids.
- Voice: warm, real, lightly funny, guilt-free. Speaks to the tired parent, never to a teacher. No curriculum jargon, no corporate speak. (See design-system.md.)
- Differentiation line for reuse: "Not a worksheet library. Generated from scratch around your child's obsession, with one invented character woven through every subject."

## Verification checklist — check against the live product BEFORE shipping

The copy below makes product claims. Verify each one against the actual generator/product before implementing; soften or remove any claim that doesn't hold. Do not ship unverified claims.

1. **Answer keys included** — does the generator actually produce answer keys today?
2. **Household-items-only supply lists** — do prompts guarantee supplies from a normal house?
3. **Black-and-white printing** — road-trip page says packets "print fine in black and white." Confirm (B&W coloring-page output was recently pushed but untested).
4. **"Never repeated" / "No two packets are ever the same"** — does the generator actually avoid repeating content?
5. **Unlimited kids on the Unlimited plan** — confirm plan terms in Stripe/product.
6. **"About 60 seconds" generation** — confirm real-world generation time; if it's meaningfully slower, change the figure.
7. **"Full school day" / "whole school day"** — verify this framing matches what a packet actually delivers; use only the verified figures (12–18 pages, 2–5 hours).
8. **Free tier** — confirm one free packet/month with no card works through the current /signup flow.

## SEO requirements

- Title tags, meta descriptions, and canonical URLs exactly as specified in each page's spec block.
- One H1 per page, exactly as written. Do not alter H1 wording.
- FAQ schema (JSON-LD) on both pages from the FAQ sections.
- OG image: create a branded hero image per page per the `og_image_note` in each spec block.

## Internal linking

- Both pages link to **/signup** from every CTA.
- Bottom-of-page strip, "Packets for every kind of day": `/sick-day` ↔ `/road-trip` link to each other. When `/snow-day` ships (December), add it to this strip.
- Homepage: add a "Browse by situation" section (see copy below) linking to both pages. This is required for Google to discover the landing pages — they must not be orphan pages.
- Nav: no top-nav changes needed.

## Homepage "Browse by situation" section — copy

**H2:** One generator. Every kind of day.
**Subhead:** Pick the day. We'll generate the packet around your kid.

- **Sick days** → /sick-day — "Home sick? Generate their whole school day in 60 seconds."
- **Road trips** → /road-trip — "Turn 'are we there yet?' into learning they actually want."

(When /snow-day ships in December, add a third card: **Snow days** → /snow-day — "School's cancelled. The school day isn't.")

## Build process

1. Work in small phases. Translate this brief into phased prompts for the implementation agent (Claude Code). **One prompt at a time.**
2. Suggested phases:
   - Phase 1: `/sick-day` — copy, layout per mockup, metadata, FAQ schema, CTAs → /signup.
   - Phase 2: `/road-trip` — same.
   - Phase 3: Cross-link strip on both pages + homepage "Browse by situation" section.
   - Phase 4: Final QA — metadata/canonicals render correctly, all internal links resolve, no 404s, mobile layout check.
3. After each phase: review the actual modifications, then commit and push before starting the next phase.
4. For riskier changes, use a preview branch / Vercel preview and review it before merging.

## Notes

- Next.js 16, TypeScript, Tailwind v4. Match the existing site's header/footer.
- Both pages are marketing pages — they do not touch the packet generator, Supabase, or Stripe.
- `/signup` and `/sample` already exist; do not rebuild them.
- `/snow-day` copy already exists in the founder's files but is out of scope for this build — it ships by December.

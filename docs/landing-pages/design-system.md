---
name: packet-day-design-system
description: >
  Packet Day's brand design system, voice guidelines, and component patterns.
  Apply this skill whenever building UI components, pages, emails, marketing copy,
  PDF packet templates, or any visual/written output for Packet Day. Trigger on
  any mention of "Packet Day", "packetday", "packet day", learning packets,
  homeschool packet generator, or the packetday.com domain — even if the user
  doesn't explicitly say "use the design system." Also trigger when building
  Next.js pages, React components, Tailwind layouts, React-PDF templates, or
  Resend email templates that are clearly part of the Packet Day product.
---

# Packet Day Design System

This is the canonical design system for Packet Day — an AI-powered learning packet
generator for homeschool families. Every piece of UI, copy, and output should feel
like it was made by a warm, encouraging friend who happens to be great at design.

## Who We're Designing For

**Primary user:** Homeschool moms (and some dads) who are juggling curriculum planning,
teaching multiple ages, and life. They're resourceful but stretched thin. Many are
not highly technical. They found us through Facebook groups, Pinterest, or word of mouth.

**Emotional context:** Our users often arrive on a hard day — a lesson flopped, a kid
melted down, they're behind on planning. Packet Day should feel like a deep breath.
The product exists to give them a win: a polished, printable learning packet they
can hand their kid and feel proud of.

**The children:** Oliver (10) and Vivian (8) are Packet Day's "test pilots." The packets
themselves are for kids roughly ages 5-14. Content should be engaging and age-appropriate.

**Co-founders:** Andy (product/tech) and Natalie (brand voice/face of the company).
Natalie's voice is the brand voice — warm, real, slightly funny, never corporate.

---

## Typography

Use these exact font pairings. Do not substitute.

| Role | Font | Weight(s) | Usage |
|------|------|-----------|-------|
| Display / Headings | **Fraunces** | 700, 800 | Hero text, section headers, pricing callouts, emotional moments |
| Body / UI | **Nunito** | 400, 600, 700 | Paragraphs, buttons, labels, form inputs, navigation |

**Loading fonts in Next.js / React:**
```jsx
import { Nunito, Fraunces } from 'next/font/google';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
});
```

**Loading fonts in HTML artifacts or standalone pages:**
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
```

**Typography rules:**
- Fraunces is for moments of warmth and personality — headlines, testimonials, pricing.
  It's a variable serif with optical size axis; use it at larger sizes where its
  character shines.
- Nunito is the workhorse — friendly, rounded, readable at all sizes. Use for all
  body text, UI chrome, buttons, and navigation.
- Minimum body text: 16px (1rem). Don't go smaller for readability on all devices.
- Line height for body: 1.6. For headings: 1.2.
- Letter spacing: default for Nunito, -0.02em for Fraunces headings.

---

## Color Palette

These are Packet Day's brand colors. Use CSS custom properties for consistency.

```css
:root {
  /* Primary palette */
  --pd-sage: #7C9A82;          /* Primary brand — calm, grounded, natural */
  --pd-sage-light: #A8C5AE;    /* Hover states, backgrounds */
  --pd-sage-dark: #5A7A60;     /* Active states, text on light bg */

  --pd-honey: #E8A849;         /* Warmth, CTAs, highlights, optimism */
  --pd-honey-light: #F2C97E;   /* Hover on honey elements */
  --pd-honey-dark: #C4872E;    /* Active state for honey */

  --pd-coral: #E07A5F;         /* Accent — energy, attention, badges */
  --pd-coral-light: #F0A08A;   /* Hover on coral elements */
  --pd-coral-dark: #C25A3F;    /* Active state for coral */

  /* Neutrals */
  --pd-cream: #FFF8F0;         /* Page backgrounds, card fills */
  --pd-warm-white: #FFFDFB;    /* Brightest background */
  --pd-warm-gray: #6B6460;     /* Body text */
  --pd-charcoal: #3A3633;      /* Headings, high-contrast text */

  /* Semantic */
  --pd-success: #7C9A82;       /* Reuse sage for success states */
  --pd-error: #D94F4F;         /* Errors — not coral, distinct red */
  --pd-info: #5B8FA8;          /* Informational, cool complement */

  /* Shadows & effects */
  --pd-shadow-sm: 0 1px 3px rgba(58, 54, 51, 0.08);
  --pd-shadow-md: 0 4px 12px rgba(58, 54, 51, 0.1);
  --pd-shadow-lg: 0 8px 24px rgba(58, 54, 51, 0.12);
}
```

**Color usage rules:**
- **Sage** is the dominant brand color. Use for primary buttons, active nav states,
  section backgrounds (at light tint), and success indicators.
- **Honey** is for warmth and action. Use for CTAs that need extra pop, pricing
  highlights, "new" badges, and moments of encouragement.
- **Coral** is the accent — use sparingly for alerts, notification dots, sale tags,
  or to draw the eye to one element on a page.
- **Cream / warm-white** backgrounds, never pure white (#FFFFFF). The warmth of
  the background is what makes Packet Day feel cozy rather than clinical.
- **Charcoal** for headings, **warm-gray** for body text. Never use pure black.
- Maintain WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text).

---

## Spacing & Layout

Use a consistent 4px base unit with Tailwind's default scale:

- Component padding: `p-4` (16px) to `p-8` (32px)
- Section padding: `py-16` (64px) to `py-24` (96px)
- Card border radius: `rounded-2xl` (16px) — generously rounded, never sharp
- Button border radius: `rounded-full` for primary CTAs, `rounded-xl` for secondary
- Max content width: `max-w-6xl` (1152px) centered with `mx-auto`
- Card gaps: `gap-6` (24px) in grids

**Layout personality:**
- Generous whitespace. Let things breathe. Packet Day should never feel cramped.
- Soft, organic shapes preferred over rigid grids. Rounded corners everywhere.
- Subtle background textures or patterns (dots, waves) are welcome — they add warmth.
- Illustrations > stock photos whenever possible.

---

## Component Patterns

### Buttons

```jsx
// Primary CTA
<button className="bg-[--pd-sage] hover:bg-[--pd-sage-light] text-white
  font-nunito font-semibold px-8 py-3 rounded-full transition-all duration-200
  hover:shadow-md active:scale-[0.98]">
  Generate My Packet ✨
</button>

// Secondary
<button className="border-2 border-[--pd-sage] text-[--pd-sage-dark]
  font-nunito font-semibold px-6 py-2.5 rounded-full hover:bg-[--pd-sage]
  hover:text-white transition-all duration-200">
  Learn More
</button>

// Honey accent (for pricing, upgrades)
<button className="bg-[--pd-honey] hover:bg-[--pd-honey-light] text-white
  font-nunito font-bold px-8 py-3 rounded-full transition-all duration-200
  shadow-sm hover:shadow-md">
  Start Free →
</button>
```

### Cards

Cards should feel tactile — like a real piece of paper you'd pick up. Use warm
shadows and generous padding:

```jsx
<div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md
  transition-shadow duration-200 border border-[--pd-cream]">
  {/* Card content */}
</div>
```

### Emoji Usage

Emoji are part of the Packet Day voice. Use them in:
- Headlines and subheadings (one per heading, at the end or beginning)
- CTA buttons (✨, →, 🎉)
- Feature descriptions
- Testimonials and social proof

Do NOT use emoji in:
- Legal text, terms, privacy policy
- Error messages (keep those calm and clear)
- Navigation labels
- Form field labels

Preferred emoji vocabulary: ✨ 📚 🎉 💛 🌿 📝 🏠 ⭐ 🎨 🧠 ✅ 💪 🌟

---

## Brand Voice & Copy

Packet Day's voice is **Natalie's voice** — a real homeschool mom talking to another
homeschool mom. Think group text, not press release.

**Voice attributes:**
- **Warm** — like a friend handing you coffee
- **Encouraging** — "you're doing amazing" energy, never preachy
- **Real** — acknowledges that homeschooling is hard sometimes
- **Slightly funny** — light humor, not forced jokes
- **Confident but humble** — we know our product helps, we don't oversell

**Copy rules:**
- Use "you" and "your" constantly. It's always about the parent.
- Contractions always (you're, we'll, it's, don't). Never stiff.
- Short sentences. Sentence fragments are fine. Like this.
- "Learning packets" not "educational content modules."
- "Your kid" or "your kiddo" not "your child" or "the student."
- "Bad day" is a Packet Day term of art — it means the day where nothing
  went to plan and you need a backup. Lean into it.
- Never say: "leverage," "utilize," "facilitate," "empower," "solution,"
  "robust," "synergy," or any corporate jargon.

**Example headlines (good):**
- "Your backup plan for the bad days 📚"
- "Beautiful packets. Zero prep. Actual learning. ✨"
- "Because sometimes Tuesday just needs a do-over 💛"

**Example headlines (bad):**
- "Empowering Homeschool Families with AI-Driven Educational Solutions"
- "Leverage Our Platform to Optimize Your Child's Learning Journey"

---

## React-PDF Packet Styling

When generating actual learning packet PDFs via React-PDF, follow these rules:

- Page size: Letter (8.5" x 11")
- Margins: 0.75" all sides
- Header: Packet title in Fraunces 18pt, sage color, with a thin sage rule below
- Body text: 12pt, warm-gray, 1.5 line height
- Section headers: Fraunces 14pt bold, charcoal
- Activity instructions: Nunito 11pt, left-aligned, with sage bullet points
- Footer: "Made with 💛 by Packet Day" centered, 9pt warm-gray
- Kid-friendly: generous spacing between activities, clear visual hierarchy,
  room for handwriting where appropriate

Note: React-PDF has limited font support. Register Nunito and Fraunces via
`Font.register()` with Google Fonts URLs. Avoid Tailwind classes inside
React-PDF — use the `StyleSheet.create()` API with pixel/point values.

---

## Email Templates (Resend)

Emails should feel personal, not transactional.

- From name: "Natalie from Packet Day" (not "Packet Day Team")
- Subject lines: conversational, lowercase-ish, emoji welcome
  - Good: "your packet is ready! 📚"
  - Bad: "Your Learning Packet Has Been Generated"
- Body: short paragraphs, Nunito font, cream background, sage accents
- CTA button: honey background, white text, rounded-full
- Footer: warm sign-off ("Happy learning! — Natalie 💛"), unsubscribe link

---

## Tailwind Config Extensions

When working in the Next.js codebase, extend `tailwind.config.js` with these tokens:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'pd-sage': { DEFAULT: '#7C9A82', light: '#A8C5AE', dark: '#5A7A60' },
        'pd-honey': { DEFAULT: '#E8A849', light: '#F2C97E', dark: '#C4872E' },
        'pd-coral': { DEFAULT: '#E07A5F', light: '#F0A08A', dark: '#C25A3F' },
        'pd-cream': '#FFF8F0',
        'pd-warm-white': '#FFFDFB',
        'pd-warm-gray': '#6B6460',
        'pd-charcoal': '#3A3633',
      },
      fontFamily: {
        nunito: ['var(--font-nunito)', 'Nunito', 'sans-serif'],
        fraunces: ['var(--font-fraunces)', 'Fraunces', 'serif'],
      },
      borderRadius: {
        'card': '1rem',
      },
      boxShadow: {
        'pd-sm': '0 1px 3px rgba(58, 54, 51, 0.08)',
        'pd-md': '0 4px 12px rgba(58, 54, 51, 0.1)',
        'pd-lg': '0 8px 24px rgba(58, 54, 51, 0.12)',
      },
    },
  },
};
```

This lets you write `bg-pd-sage`, `text-pd-charcoal`, `font-fraunces`, etc.
directly in your Tailwind classes.

---

## What This Skill Does NOT Cover

- Packet Day's business logic, pricing tiers, or Supabase schema
- Anthropic API prompt engineering for packet content generation
- Deployment or CI/CD configuration
- Authentication flows (Supabase Auth)

These are product concerns, not design system concerns. Keep this skill focused
on how things look, feel, and sound.

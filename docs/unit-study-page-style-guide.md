# Unit Study Page Style Guide

This is the source of truth for drafting any page at `/unit-studies/[slug]`. Content lives in `content/unit-studies/[slug].json` (shape: `lib/unit-studies/schema.ts`), and images live in `public/unit-studies/[slug]/`.

## Hard rules (the quality gate enforces these)

- No em dashes, no en dashes, no hyphens used as dashes. Use commas, periods or "to". Compact labels keep plain hyphens ("K-2", "2-5 hrs").
- Names ending in s take only an apostrophe ("Anders'").
- No invented facts, statistics, quotes, reviews or anecdotes. Every kid fact must come from the packet or be a well established fact.
- Never claim standards alignment ("Common Core aligned"). Say "matched to grade level".
- Sample packets are labeled as samples ("A sample packet made for a grade 3 learner named Ava"). Never imply a real family used it unless that is true.
- At most one exclamation point per page. No emoji in body copy.
- Banned words: unlock, leverage, elevate, seamless, revolutionary, game-changer, delve, "in today's fast-paced world", "AI-powered" in any heading.
- Do not put "AI" in headlines. Lead with the finished packet and the feeling. Answer the AI question honestly inside the FAQ.
- Figures: a packet is 11 to 17 pages, a full school day of roughly 2 to 5 hours with breaks, generated in a minute or two. Import from `lib/situations/figures.ts`. Never invent other figures.
- Pricing: Free is 1 packet per month, no card. Unlimited is $9 per month billed annually ($108 per year) or $12 month to month. Every generated packet is also emailed to the account address.

## Voice

Natalie is a tired, funny, honest homeschool mom talking to another one. Short sentences. Specific over hype. Warm, never preachy, no guilt trips. A parenthetical aside now and then, not every paragraph. "We" for the product. "I" only inside Natalie's note, and only for real experiences.

Voice samples from the live site:

- "Some days, homeschool just doesn't happen the way you planned. (And that's okay.)"
- "Print, hand off, breathe."
- "Sit down with your coffee (or go back to bed)."
- "Vivian tested that one. It works."
- "Check their work in 30 seconds. Or hand the key to your oldest and let them play teacher. (They love that.)"

## People and stories

- Natalie is Andy's wife, co-founder, homeschool mom and the public face of Packet Day. She calls herself a recovering perfectionist. Her kids Oliver (10) and Vivian (8) are the official test pilots.
- Anecdotes already on the site you may reuse: Oliver asked for "only Megalodons" three days in a row and got three different packets. Vivian asked for "volcanoes but also unicorns" and it worked.
- Any other personal story must come from Natalie. Never invent one. Leave a `[NATALIE: exact question]` placeholder instead.
- Testimonials: only reuse ones already in `lib/testimonials.ts`. Never write a new one.

## Page template

URL `/unit-studies/[slug]`. Hub `/unit-studies`. Target 800 to 1,200 words of visible unique copy per page. At least 60 percent of each page's visible copy must appear nowhere else on the site.

1. **Title and meta.** Title tag, 60 characters or fewer: "Printable [Theme] Unit Study for Kids (K-8) | Packet Day". Meta description, 155 or fewer: answer first, one real specific, ends with "Free to start."
2. **H1.** "[Theme] Unit Study Packet for Kids".
3. **Answer capsule.** 40 to 60 words, directly under the H1, self contained so an AI engine can quote it alone. Says what the packet is, who it is for, what is inside (real counts), how long it takes, and that it is free to start. Byline "By Natalie, homeschool mom and Packet Day co-founder" and "Updated [Month Year]". "Reviewed by Natalie" only once she actually has.
4. **Hero.** Real cover image, sample label, primary CTA "Make your own [theme] packet free" to `/signup?from=unit-studies-[slug]`, secondary link to `/sample`.
5. **"What is inside a [theme] packet?"** Direct answer first, then a gallery of 6 to 8 real pages from the PDF (cover, reading, math, science or activity, puzzle, movement break, coloring page, certificate). Alt text names the real content on that page.
6. **"What does my child actually do?"** Short list: subject, then the real activity, from the PDF.
7. **"Meet [character name]".** The invented guide for this sample and how they show up across the pages.
8. **"What will my child learn?"** Plain skills language tied to the real activities, accurate to the theme.
9. **"Which grades is this for?"** Direct answer, then K-2, 3-5 and 6-8 notes on how vocabulary, math level and writing length change. Specific only for the grade of the real sample. General for the others. Never claim specifics for packets we have not seen.
10. **Natalie's note.** 2 to 3 short paragraphs, using a real site anecdote or one Natalie supplies, else a `[NATALIE: ...]` placeholder. The page cannot go live with a placeholder.
11. **FAQ.** 6 questions: 5 theme specific with accurate 40 to 70 word answers, plus "Are these made by AI, and are they any good?" answered honestly.
12. **Related.** Related packets (3), plus 1 or 2 use case links that fit (`/sick-day`, `/road-trip`, `/fun-friday`, `/multiple-kids`, `/screen-free`), plus links to the hub and `/sample`.
13. **Closing.** Closing CTA and one pricing line using the settled claims.

Every question style heading opens with a direct answer sentence before any detail, because AI engines lift the first sentence after a heading.

## Every packet contains

An invented character who guides the day and shows up on every page. 6 activities: 3 academic, 1 puzzle break, 1 movement break, 1 rotating academic. Plus a coloring page, a completion certificate and a parent answer sheet.

## Drafting rules

- Pull every specific (character, activity names, page count, subjects, supplies) from the real PDF.
- List anything uncertain in `factsToVerify`, verify with web search where possible, and record the source.
- Leave Natalie placeholders instead of inventing stories.

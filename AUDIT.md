# Packet Day — Codebase Audit
> Generated 2026-07-24. Read-only. No code was changed.

---

## 1. DEPENDENCY HEALTH

### npm outdated summary

| Package | Installed | Latest | Type |
|---------|-----------|--------|------|
| `@anthropic-ai/sdk` | 0.86.1 | 0.115.0 | **MAJOR gap + security advisory** |
| `typescript` | 5.9.3 | 7.0.2 | **MAJOR** |
| `eslint` | 9.39.4 | 10.7.0 | **MAJOR** |
| `@types/node` | 20.19.39 | 26.1.1 | **MAJOR** |
| `@supabase/ssr` | 0.10.2 | 0.12.3 | minor |
| `@supabase/supabase-js` | 2.103.0 | 2.110.8 | minor |
| `resend` | 6.10.0 | 6.18.0 | minor |
| `stripe` | 22.0.1 | 22.3.2 | patch |
| `@react-pdf/renderer` | 4.4.0 | 4.5.1 | minor |
| `@tailwindcss/postcss` | 4.2.2 | 4.3.3 | minor |
| `tailwindcss` | 4.2.2 | 4.3.3 | minor |
| `react` / `react-dom` | 19.2.4 | 19.2.8 | patch |
| `sharp` | 0.34.5 | 0.35.3 | minor |

### Security advisories (`npm audit`)

| Package | Severity | Advisory | Fix |
|---------|----------|----------|-----|
| `@anthropic-ai/sdk` | **Moderate** | GHSA-p7fg-763f-g4gf — insecure default file permissions in Local Filesystem Memory Tool (affects 0.79.0–0.91.0) | Upgrade to ≥ 0.91.1 |
| `brace-expansion` | **High** (transitive) | GHSA-3jxr-9vmj-r5cp — DoS via exponential expansion; GHSA-jxxr-4gwj-5jf2 — large numeric range | Upgrade via parent package |
| `@babel/core` | Low (transitive) | GHSA-4x5r-pxfx-6jf8 — arbitrary file read via sourceMappingURL | Upgrade via parent package |

### Upgrade blockers for Next.js

Next.js is currently at **16.2.3** (pinned). Latest is **16.2.11** — patch only, safe to update within the same major. No blockers identified for the 16.x patch update. A future Next.js 17 upgrade (if released) would be gated by the React 19 peer dependency, which is already satisfied.

### Priority items

1. **`@anthropic-ai/sdk`**: Jump from 0.86.1 → 0.115.0 is 29 minor versions. Has an active security advisory. Also unlocks structured outputs (`parse()`), improved streaming helpers, and the Batch API. Breaking changes exist; test generation end-to-end after upgrade.
2. **`typescript` 7.x**: Introduces `erasableSyntaxOnly` and removes legacy `--experimentalDecorators`. Likely a zero-impact upgrade here, but needs a test build.
3. **`@supabase/ssr` 0.12.x**: Includes cookie handling improvements relevant to Next.js App Router middleware. Should be a safe minor upgrade.

---

## 2. AI GENERATION QUALITY

Two separate Claude calls exist in the codebase. **Only one appears to be active** in the current UI flow (see §4 for the dead-code issue).

---

### Prompt A — `lib/anthropic.ts` (legacy, non-streaming)

**Full prompt (lines 59–127):**

```
You are creating a warm, personalized homeschool learning packet.

CHILD PROFILE
Name: ${child.name}
Grade: ${gradeDisplay}
Learning style: ${styleDesc}
Favorite subjects: ${subjects}
${child.special_notes ? `About ${child.name}: ${child.special_notes}` : ""}

TODAY'S PACKET
Theme: "${theme}"
Length: ${packetLength === "half" ? "Half day" : "Full day"} — create exactly ${activityCount} activities
${todayNote ? `Parent note for today: ${todayNote}` : ""}

INSTRUCTIONS
Create a cohesive packet where EVERY activity is genuinely connected to the "${theme}" theme.
The theme should make each subject feel exciting and relevant to ${child.name}.

MASCOT CHARACTER
- Invent a unique, funny, expressive character that perfectly embodies "${theme}"
- Give them a memorable name ${child.name} will love (e.g., "Rex the Dino Detective", "Stella the Space Explorer")
- Write a vivid visual description for AI image generation...

COLORING PAGE
- Design a fun scene where the mascot is doing something hands-on related to the theme
...

Return ONLY valid JSON — no markdown, no extra text:
{ ...full schema with example activity... }

RULES
- Match age/grade: ${gradeDisplay} — instructions clear enough for ${child.name} to follow independently
- Create exactly ${activityCount} activities covering different subjects
- Activity titles sound exciting, not like textbook chapters
- Instructions: 3–5 concrete, numbered steps
- Estimated time: 15–40 minutes per activity, realistic for ${gradeDisplay}
- Materials: common household items only
- Tone: warm and encouraging, like a beloved teacher wrote this
```

**API call:**
```typescript
model: "claude-sonnet-4-6"
max_tokens: 4096
temperature: (not set — uses default 1.0)
system: (none)
messages: [{ role: "user", content: prompt }]
```

**Critique:**

| Criterion | Assessment |
|-----------|------------|
| Grade-level specificity | Weak. Only says "match age/grade: ${gradeDisplay}" — no calibration ladder (K vs 8th requires fundamentally different vocabulary, problem complexity, passage length). |
| Output structure | Moderate. Provides a JSON schema example inline, but the example only shows one activity. Claude may deviate on structure. |
| Tone guidance | Good. "Warm and encouraging, like a beloved teacher" is usable direction. |
| Length guidance | Missing. No instruction on word count for passages, number of math problems, writing prompt depth. |
| Format enforcement | Weak. "Return ONLY valid JSON" is often ignored without a system-level CRITICAL note. Uses greedy regex `/\{[\s\S]*\}/` for extraction which can fail on complex strings. |
| XML tags / delimiters | None. |
| Examples | One inline JSON example (Dinosaur). Good for shape; bad for grade-level variety. |
| Activity count | `activityCount` is `"3–4"` or `"5–6"` (a string range) — inconsistent output likely. |
| Math structure | No structured math layout rules — math activities come out as generic numbered steps. |
| No system prompt | All context crammed into user turn. Wastes tokens re-establishing persona on every call. |
| Temperature | Not set (defaults to 1.0). High temperature introduces unnecessary randomness in structured JSON output. |

**Score: 4/10**

Main weaknesses: no grade-level calibration ladder, no math structure rules, activity count passed as a string range, no system prompt separation, temperature at default 1.0 for structured output, fragile JSON extraction.

---

### Prompt B — `app/api/generate-packet/route.ts` (active, streaming)

**System prompt (lines 26–63):**

```
You are a homeschool educator creating theme-based learning packets for children K-8.
Be warm, specific, and fun. Use the child's name. Weave the theme into every activity.
Match grade level precisely.

GRADE CALIBRATION: K-1: very simple, visual, 10-15 min max. 2-3: concrete math, simple
sentences. 4-5: multi-step problems, paragraph writing. 6-8: abstract thinking, essay
prompts, algebra.

MASCOT: Invent a fun character name (e.g. "Rex the Dino Detective"). Write a short
image-gen description: "A cute cartoon [character] [expressive pose], [theme accessories],
bright colors, simple lines, white background, kid-friendly."

COLORING PAGE: A simple scene with the mascot doing something theme-related. Include the
child's name in the title.

EMOJI RULE: Never use emoji characters anywhere in the instructions array. Instructions
must contain plain text only. Emoji may only appear in the 'emoji' field, the 'title'
field, and the 'introduction' field.

CRITICAL: The greeting field must contain zero emoji characters — no emoji whatsoever.
Plain text only. No unicode symbols, no emoji, no special characters beyond standard
punctuation.

CRITICAL: The reading passage text must appear as a plain instruction step with NO dashes,
NO separator lines, NO markdown formatting, NO --- characters anywhere. Do not write
--- PASSAGE --- or any variation. Just write the passage text directly as the
instruction content.

MATH ACTIVITY STRUCTURE: Every math activity's instructions array must contain exactly
three labeled sections as separate entries:
1. "[MASCOT NAME]'S QUICK CALCULATIONS: Solve these problems: [4-6 problems / separated]"
2. "WORD PROBLEMS: [3-4 story problems / separated]"
3. "DRAW & SOLVE: [1 visual problem where the child draws]"
Each section label must be in ALL CAPS at the start of the string.

CRITICAL: Your entire response must be a single raw JSON object. Do NOT wrap in markdown
code fences. Start your response with { and end with }.
```

**User prompt builder (lines 66–145):**

```
Create a ${packetLength === "half" ? "half day" : "full day"} learning packet for ${child.name}.

CHILD PROFILE:
- Name: ${child.name}
- Grade: ${gradeDisplay}
- Learning style: ${child.learning_style}
- Favorite subjects: ${child.favorite_subjects.join(", ")}
- About ${child.name}: ${child.special_notes}  [if present]
- Parent note for today: ${specialNotes}  [if present]

TODAY'S THEME: "${theme}"
Date: ${date}  [if present]

Create exactly ${activityCount} activities covering: ${subjectList}.

Return a JSON object with this exact structure:
{
  "packet_title": "${child.name}'s [Theme] Adventure Day",
  "greeting": "...",
  "mascot_name": "...",
  "mascot_description": "...",
  "mascot_emoji_cluster": "5-6 emojis",
  "activities": [
    {
      "subject": "Math",
      "title": "...",
      "description": "...",
      "encouragement": "A short, fun, personalized hype line for ${child.name}...",
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "estimated_minutes": 25,
      "materials": ["pencil", "paper"],
      "answer_key": "..."
    }
  ],
  "coloring_page": { "title": "...", "scene_description": "...", "instructions": "..." },
  "daily_reflection": "...",
  "parent_notes": "..."
}

INSTRUCTIONS ARRAY RULES:
- For math activities, the instructions array must contain exactly 3 entries following
  the MATH ACTIVITY STRUCTURE rule.
- For all other subjects, each individual question or step must be its own separate entry.
- Do NOT include "Write your answer here", "Bonus Challenge", or "For Grown-Ups Only"
  text inside the instructions array.
```

**API call:**
```typescript
model: "claude-sonnet-4-6"
max_tokens: packetLength === "half" ? 4500 : 6000
temperature: 0.7
system: SYSTEM_PROMPT
messages: [{ role: "user", content: userPrompt }]
```

**Critique:**

| Criterion | Assessment |
|-----------|------------|
| Grade-level specificity | Good. Four-band calibration ladder (K-1 / 2-3 / 4-5 / 6-8) with concrete descriptors. But no guidance on *reading passage length* (words per grade band) or *writing prompt complexity*. |
| Output structure | Very good. Complete JSON schema in user turn, repeated constraint in system. CRITICAL warnings reduce hallucinated formatting. |
| Tone guidance | Good. "Warm, specific, and fun." Personalized encouragement field is a strong addition. |
| Length guidance | Missing for non-math subjects. Word count for reading passages, number of writing lines to prompt for, sentence count expectations — all absent. |
| Format enforcement | Strong. System-level CRITICAL, MATH ACTIVITY STRUCTURE, and emoji rules. The streaming + balanced-brace JSON extractor handles malformed output correctly. |
| XML tags / delimiters | None. Adding `<child_profile>`, `<activities_schema>`, `<rules>` XML tags would improve parsing fidelity and reduce prompt-content bleed. |
| Examples | No few-shot activity examples for non-math subjects (reading, writing, science, history). Math has the clearest structure; everything else risks varying format. |
| Subject routing | `subjectList` only says "math, reading, writing, science or history, one creative or PE activity" — no per-subject format rules for reading/writing comparable to the math section. |
| Temperature | 0.7 — appropriate. Lower might improve JSON adherence further (0.4–0.5). |
| Streaming | Yes — prevents Vercel timeout. Good. |

**Score: 7/10**

Strongest prompt in the codebase by far. Loses points for: no passage length calibration by grade, no per-subject format rules for reading/writing (analogous to math's structured sections), no XML delimiters, no few-shot examples outside math.

---

### Prompt quality gap: missing subjects

Neither prompt specifies what a "good" reading passage looks like at each grade band — e.g. Lexile level, sentence length, vocabulary complexity. Claude will produce a reading activity for a K-1 child and a Grade 8 child with no structural guidance on how they should differ beyond the vague GRADE CALIBRATION line. This is the biggest quality gap in the generation layer.

---

## 3. PDF OUTPUT QUALITY

**File:** `components/PacketPDF.tsx` (1,735 lines)

### Fonts

Only **Nunito** is registered and used throughout the PDF (Regular 400 + Bold 700, with italic variants faked from the same files). `CLAUDE.md` specifies the app shell uses **Fraunces** for display headings — this font is completely absent from the PDF. The result is that the PDF feels typographically flat: the same round, friendly sans-serif at every hierarchy level (headings, body copy, labels, answers).

### Margins and padding

| Page type | Padding |
|-----------|---------|
| Cover | 56pt all sides |
| Activity pages | 96pt color bar + 36pt content area |
| Notes / Reflection | 48pt all sides |
| Coloring | 48pt all sides |

Cover margin is generous. Activity content padding at 36pt leaves a usable 540pt width on letter paper — fine. Notes page 48pt is standard.

### Answer spaces

| Context | Space allocated | Assessment |
|---------|-----------------|------------|
| Worksheet (science, history, general) | 3 answer lines per instruction box (18pt spacing, dotted) | **Too tight for young writers.** A K-2 child writing large letters needs 30–36pt per line. 3 lines at 18pt = 54pt total workspace per question — a single sentence barely fits. |
| Reading comprehension questions | 2 answer lines per question | Appropriate for short-answer comprehension, but Grade 6-8 extended response questions would need 4–5 lines. |
| Math draw box | 180pt minimum height | Adequate for most draw problems. |
| Math answer lines | Per-cell line (80pt wide) | Fine for numbers; would overflow for unit labels on Grade 6-8 algebra. |
| Writing template (16 lines) | 26pt spacing | Good. Plenty of room. |
| Open workspace draw box | 340pt minimum height | Generous — good for art/PE. |

**Overall:** Answer space is well-designed for writing/art activities and math draw problems but is **consistently too tight** for the Worksheet template used by science and history. A K-2 child gets the same 3-line box as a Grade 8 student, which is wrong in both directions (too small for young large handwriters, too small for complex answers from older students).

### Page break logic

There is no explicit `<Page break>` or `minPresenceAhead` logic. `wrap={false}` is applied to: individual question boxes, math word problems, the draw & solve block, mid-page encouragement strip, bonus challenge, and answer key. This is correct for keeping question-answer pairs together.

**Gap:** Long reading passages (potentially 300+ words for a Grade 8 activity) are wrapped in `wrap={false}` — which means if the passage overflows its available space, react-pdf may clip it or push it to the next page with nothing above it, producing a page that starts with a passage mid-read. Reading passages should flow across pages.

**Gap:** The coloring page image is fixed at 420×420pt. If the mascot image fails to load, the placeholder text fills a 420×420pt box — giving the page a very empty look.

### Activity variety across grade bands

Three templates exist:

| Template | Triggered by subject |
|----------|---------------------|
| Worksheet (Template A) | Math, Science, History, General |
| Reading Passage (Template B) | Reading, Comprehension |
| Open Workspace (Template C) | Writing, Art, PE, Creative, Journal, Story |

**K-2 packet issues:**
- Math quick calculations (4–6 problems in a 2-col grid at 50% width) is visually appropriate.
- Science and history activities land in Template A with 3 answer lines each — a K-2 child doing a science observation activity needs a draw box, not answer lines. Template A has no draw-box variant for non-math subjects.
- Reading passage detection heuristic (`instructions.findIndex(s => s.length > 200)`) is fragile: a short passage or a long instruction will be misclassified. A Grade 1 passage of 120 words might pass through as a Worksheet, losing the shaded passage block.

**3-5 packet:**
- Templates work reasonably well for this band.
- Word problems in the math section are 2-answer-line boxes — adequate.
- Reading template provides 2 answer lines per comprehension question. Grade 4-5 constructed responses warrant 3.

**6-8 packet:**
- The math Draw & Solve box (180pt) is sufficient for algebra sketches.
- Science and history in Template A give only 3 dotted lines per step — far too little for a middle-schooler writing a paragraph explanation or hypothesis.
- No essay template exists. Writing activities use Template C (ruled lines) which is fine, but a "science lab report" or "historical argument" activity has no structured template — it just gets a prompt bubble and 16 ruled lines.

### Other observations

- **Emoji stripping:** `stripNonAscii()` removes all non-ASCII characters. It is only applied in `ReadingTemplate` for comprehension questions. If Claude generates accented characters (e.g. "café", "fiancée") in other templates, they silently disappear from the printed packet.
- **Fallback content:** `greetingMessage()`, `reflectionQuestion()`, and `parentNote()` are hardcoded fallback functions. The PDF correctly prefers the AI-generated fields when present. However, the `ParentNotesPage` component passes `parentNote(childName, theme)` directly to the template without checking whether the AI-generated `parent_notes` field exists — it always uses the hardcoded fallback, discarding the AI-generated content.
- **Reflection page:** Similarly uses `reflectionQuestion(theme)` hardcoded fallback, ignoring the AI-generated `daily_reflection` field passed through props.

---

## 4. CODE HEALTH

### Dead code / duplicated logic

**Two overlapping generation routes exist:**

| Route | Method | Streaming | Prompt location | Status |
|-------|--------|-----------|-----------------|--------|
| `app/api/generate/route.ts` | POST | No (blocks ~60s) | `lib/anthropic.ts` | **Likely dead** |
| `app/api/generate-packet/route.ts` | GET (SSE) | Yes | Inline in route | **Active** |

`app/api/generate/route.ts` calls `generatePacket()` from `lib/anthropic.ts` which makes a blocking non-streaming call with `max_tokens: 4096`. On Vercel with `maxDuration: 90`, this will timeout for complex packets. The streaming route at `generate-packet` is clearly the intended active path. The legacy route and `lib/anthropic.ts` are candidates for deletion once confirmed unused by the frontend.

**Duplicated client instantiation patterns:**
- `lib/anthropic.ts` uses a module-level singleton (`let _anthropic: Anthropic | null = null`)
- `app/api/generate-packet/route.ts` uses a function (`getAnthropic()`) that creates a new instance per request

**`console.log` statements in production code:**

| File | Line | Content |
|------|------|---------|
| `app/api/generate-packet/route.ts` | ~200 | `[parsePacketJSON] Cleaned text preview` |
| `app/api/generate-packet/route.ts` | ~203 | `[parsePacketJSON] extractFirstJSON result` |
| `app/api/generate-packet/route.ts` | ~361 | `Raw Claude response (first 500 chars)` |
| `app/api/generate-packet/route.ts` | ~425 | `COLORING IMAGE URL` |
| `app/api/generate-packet/route.ts` | ~440 | `SUPABASE COLORING UPDATE` |
| `app/api/generate-pdf/route.ts` | ~93 | `PDF PROPS coloringImageUrl` |
| `lib/generateMascotImage.ts` | 68, 72, 76, 81, 82 | Multiple image generation tracking logs |

### Missing error handling

| Route | Issue |
|-------|-------|
| `app/api/packets/[packetId]/view` | Zero try/catch around the RPC call. If Supabase throws, the request crashes silently. Non-critical (view counter) but still leaks 500s. |
| `app/api/generate/route.ts` | Supabase quota increment (line ~125) is fire-and-forget with no error handling. If it fails, the user's usage counter doesn't advance — they get a free extra packet. |
| `app/api/generate-packet/route.ts` | Same pattern: usage increment after generation succeeds is unawaited and unchecked. |

### Unhandled Stripe webhook events

Current webhook handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

**Missing events that affect production reliability:**

| Event | Impact |
|-------|--------|
| `invoice.payment_failed` | User's subscription lapses but status stays `"pro"` — they continue generating free packets. |
| `customer.subscription.trial_will_end` | No trial reminder emails sent. |
| `invoice.paid` | No monthly usage reset logic tied to billing cycle renewal. |
| `charge.refunded` | Refunded users keep `"pro"` status. |
| `customer.subscription.paused` | Paused subs treated the same as active. |
| `checkout.session.expired` | Abandoned checkouts not logged or cleaned up. |

The most critical gap is **`invoice.payment_failed`** — without it, a churned user who misses payment silently retains unlimited packet generation.

### Missing loading/error states

- `ChildCard` component: no error state for missing child data.
- `packets/[shareToken]/page.tsx`: server-side only, handles 404 correctly, but no skeleton loading state before hydration.
- Usage increment RPC failures (noted above) produce silent accounting errors with no fallback.

### Other code quality notes

- `ReadingTemplate` in PacketPDF applies `stripNonAscii()` only to comprehension questions, not to the passage text itself. If an accented character appears in the passage it renders fine; in a question it silently disappears. The asymmetry is confusing.
- `ParentNotesPage` ignores the AI-generated `parent_notes` field and always renders hardcoded `parentNote(childName, theme)` text. Same for `ReflectionPage` and `daily_reflection`. These AI-generated fields are wasted if the PDF always falls back to templates.

---

## 5. MODEL CHECK

| Location | Model string | How configured |
|----------|-------------|----------------|
| `lib/anthropic.ts` line 130 | `"claude-sonnet-4-6"` | Hardcoded string literal |
| `app/api/generate-packet/route.ts` line ~136 | `"claude-sonnet-4-6"` | Hardcoded string literal |

There is no central model config, no environment variable, and no shared constant. Both strings are identical today but must be updated in two separate files if the model changes. Since one of these routes appears to be dead code, there is effectively one active model string — but the dual-location pattern is still a maintenance hazard.

---

## PRIORITIZED FIX LIST

Scored: **Impact on packet quality** (1–5, where 5 = directly degrades what a parent sees in print) and **Effort** (S = hours, M = half-day, L = day+).

| # | Fix | Impact | Effort | Notes |
|---|-----|--------|--------|-------|
| 1 | **PDF: `ParentNotesPage` and `ReflectionPage` must use AI-generated content** — remove the hardcoded `parentNote()` and `reflectionQuestion()` fallback functions and render `props.parent_notes` / `props.daily_reflection` instead. The AI generates these fields; they're being silently discarded. | 5 | S | Pure wiring fix; no prompt change needed |
| 2 | **Prompt B: Add per-subject format rules for reading and writing** comparable to the math structured-sections rules — specify passage word count by grade band, number of comprehension questions, writing prompt sentence complexity. This is the single largest lever on output quality. | 5 | M | Prompt engineering only |
| 3 | **Answer spaces: increase line height in Worksheet template** from 18pt to 28–30pt for K-2 grade levels, and increase line count from 3 to 5 for Grade 6-8 questions. Pass `childGrade` into `WorksheetTemplate` and branch. | 4 | M | Requires PDF template edit + grade-aware logic |
| 4 | **Upgrade `@anthropic-ai/sdk` 0.86.1 → latest** to resolve security advisory GHSA-p7fg-763f-g4gf. Also unlocks structured output and improved streaming APIs. | 4 | M | Test generation pipeline end-to-end after upgrade |
| 5 | **Delete dead code:** `app/api/generate/route.ts` and `lib/anthropic.ts` (once confirmed unused by frontend). Removes the maintenance burden of keeping two prompt codebases in sync and eliminates Prompt A with its grade-calibration and temp problems. | 3 | S | Verify no frontend call to `/api/generate` first |
| 6 | **Add Fraunces font to PDF** — register it in `PacketPDF.tsx` and use it for `packetTitle`, `notesPageTitle`, and activity bar titles. Matches the app shell typography and makes packets feel premium. | 3 | S | Font file must be added to `public/fonts/` |
| 7 | **Handle `invoice.payment_failed` Stripe webhook** — downgrade `subscription_status` to `"free"` when payment fails to prevent churn bypass. | 3 | S | Critical for billing integrity |
| 8 | **Centralize model string** into a single constant (e.g. `lib/config.ts: MODEL = "claude-sonnet-4-6"`) imported by all routes. | 2 | S | Prevents model drift between routes |
| 9 | **Remove `console.log` statements** from `generate-packet/route.ts`, `generate-pdf/route.ts`, and `generateMascotImage.ts`. Replace meaningful ones with structured error logging or remove entirely. | 2 | S | 7 statements across 3 files |
| 10 | **Fix reading passage detection heuristic** — replace `s.length > 200` with an explicit marker from the AI (e.g. add a `passage` field to the reading activity schema) rather than guessing by string length. | 3 | M | Requires prompt change + PDF template update |
| 11 | **Add `invoice.paid` webhook to reset monthly usage counter** — currently `packets_used_this_month` may not reset on billing cycle renewal if the reset logic isn't tied to this event. | 3 | S | Check if a cron job handles reset already; if not, add webhook handler |
| 12 | **Worksheet template: add draw-box variant for K-2 science/history activities** — young children doing observation or "draw what you see" activities shouldn't get answer lines. Route by grade + subject. | 3 | M | Requires PDF template change + prompt guidance |
| 13 | **Apply `stripNonAscii()` consistently** across all templates or remove it entirely and handle font encoding at the Nunito registration level. Current selective application creates invisible character loss. | 2 | S | |
| 14 | **Add `temperature: 0.4` to math-heavy prompts** or pass a lower temperature specifically when `packetLength` has high math content. Reduces JSON hallucinations. | 2 | S | One-line change in `callClaude()` |

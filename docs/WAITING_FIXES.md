# Waiting fixes

Approved fixes for the packet PDF that are not built yet. Highest priority first. Don't start one until Andy says to.

Last updated: 2026-09-29

---

## 1. Renderer drops a leading capital letter (HIGH, investigate first)

**What happened.** In model bakeoff round 3 (2026-09-28), a grade 3 "sharks" packet printed Movement Break step 4 as "ump up and do 10 big shark chomps..." The model wrote "Jump up and do 10 big shark chomps by clapping your arms together like giant jaws!" correctly. The "J" was lost in the PDF.

- Packet: `cb27632a-ee36-4c74-b253-723e5f5f80ac`, page 9, Movement Break step 4.
- Confirmed with PyMuPDF `page.get_text("rawdict")`: the "u" glyph origin sits at the text box's true left edge (x0 = 72.0, the same as every other step on the page), with no space reserved for a "J". Also confirmed in a 200 DPI crop of the page.

**Why it matters.** This is the same failure as the dropped capital "R" in CLAUDE.md (react-pdf gotchas section). That bug stopped reproducing and was never fixed. This one shows it is not specific to "R", and it happened on a real, fresh generation. A parent would see a broken word on the page their child reads.

**Status (2026-09-29).** Cause found and guarded: see "Stale glyph cache" in CLAUDE.md and `lib/pdfGlyphCache.ts` (branch `fix/pdf-glyph-warmup`). The first bad lookup in real use is still unknown; watch logs for `PDF GLYPH CACHE STALE`. The steps below are the original investigation plan, kept for history.

**What to do.** Find the cause before the pagination work in item 2, because that work changes the same render path.

1. Follow the "Exact test to re-run" steps in CLAUDE.md, in order: clear `.next` and the Node compile cache, kill the whole dev server process tree, start fresh, render this packet, and check the step 4 text at the raw glyph level (not with `pdftotext` alone).
2. Repeat on 2 to 3 independent fresh restarts before trusting the result either way.
3. Only once it reproduces reliably, comment out `Font.registerHyphenationCallback(...)` in `components/PacketPDF.tsx` and test again.
4. Report what you find before writing a fix. Don't ship a workaround until the bug reproduces, or the fix can't be verified.

---

## 2. Keep "DRAW & SOLVE" on the same page as its problem

**What happens.** In the Math activity, the "DRAW & SOLVE" label sits alone at the bottom of page 3, and its problem and drawing box start on page 4. It happened in every bakeoff packet: 3 of 3 in round 1 and 6 of 6 in round 3, across both models. So it is a PDF layout issue, not a model issue.

**What to do.** Keep the label with its problem and drawing box when the page breaks. This is the pagination work.

---

## 3. Strip em dashes from generated text before the PDF renders

**What happens.** Newer models can write em dashes, and the copy rule bans them in anything a family reads. Round 3 had none in all 6 packets, but nothing in code stops them.

**What to do.** Strip or replace em dashes (and "--") in generated packet text before rendering, next to the existing emoji stripping. Check the other places generated text shows up (the packet-ready email and the packet page) before calling it done.

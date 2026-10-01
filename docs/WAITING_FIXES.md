# Waiting fixes

Approved fixes for the packet PDF that are not built yet. Highest priority first. Don't start one until Andy says to.

Last updated: 2026-10-01

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

---

## 4. History themes repeat common myths

**What happens.** The Thanksgiving test packet (grade 4, 2026-09-29) was mostly accurate, but it slipped in two familiar myths. A math word problem calls the 90 Wampanoag men at the 1621 harvest "guests", though Winslow's letter, the only eyewitness account, never says they were invited. The coloring page puts a pumpkin on the Mayflower's deck, and pumpkins are native to the Americas. The unit study page names both as talking points and leaves them out of its gallery.

**What to do.** Tweak the generator prompt for history themes: avoid invitation framing for the 1621 harvest, and avoid anachronisms (objects, foods or animals that could not be in that time and place), including in the coloring scene. Check a few history theme packets after the change (Thanksgiving, Ancient Rome, the Constitution).

---

# Found 2026-09-30

From the outer space sample packets made for /sample (Kai grade 4, Mia grade 1, Jonah grade 7). The PDFs are in `packet-inbox/` (gitignored).

---

## 5. Page count in the footer is off when the answer key runs 2 pages

**What happens.** Jonah's grade 7 outer space packet has 14 kid pages (the certificate is page 14) and a 2 page answer key. Every kid page footer says "N of 15" when it should say "N of 14". Kai's and Mia's packets, whose answer keys are 1 page, correctly say "of 14".

**What to do.** Find where the footer total is counted in `components/PacketPDF.tsx` and make it count kid pages only, however long the answer key runs. Remember the `RENDER_PROP_Y_OFFSET` note in CLAUDE.md when touching the footer.

**Update 2026-10-01 (branch `feat/puzzle-rotation`).** Fixed for NEW packets only (packets with puzzle data): `renderPacketPdf` renders once, and if the parent sheet ran past one page it renders again with the real kid page total (`kidPageTotal`). Old packets with two-page parent sheets show the wrong total page count in kid page footers (option C). Fix separately. Real example: packet `64ef5f7a` (April) prints "14 of 15" on its last kid page.

---

## 5b. Parent sheet page 1 has no footer when the sheet runs to two pages

**What happens.** When the parent answer sheet runs to two pages, only the second page shows "Made with love by Packet Day · packetday.com" and "Parent sheet · not part of the packet". The first page has no footer. Confirmed on `main` (real packet `64ef5f7a` from April) and on new puzzle packets (real packet `309fe81f`, 2026-10-01), so it predates puzzle rotation.

**What to do.** The footer is a `fixed` View inside `ParentAnswerSheetPage` in `components/PacketPDF.tsx`. Find why it doesn't repeat on the first page of a wrapped sheet, and fix it. Check old packets render the same everywhere else.

---

## 6. End of page encouragement says "you are about to..." after the activity is done

**What happens.** The encouragement box prints at the end of an activity but is written as if the activity hasn't started. Kai's packet page 6 (after the reading questions): "Kai, you are about to ride along with Orbit past all eight planets..." Page 11 (after the science questions): "Kai, you are about to be a real space scientist..."

**What to do.** Tweak the generator prompt so the encouragement fits where it prints (cheer on work just done, or what comes next), or move it to the top of the activity. Check a few packets after the change.

---

## 7. Parent note overstates grade level

**What happens.** Jonah's grade 7 parent note says the math (two step equations, linear functions with slope and y-intercept, measures of center, and cylinder volume) "are all core Grade 7 skills". Slope, y-intercept and cylinder volume are grade 8 under Common Core.

**What to do.** Tweak the prompt so the parent note describes the skills without claiming which grade they belong to, or only claims it when it is right. The site never claims standards alignment ("matched to grade level" only), so the packet shouldn't either.

---

## 8. Parent notes mention the kid profile's interests (note only)

**What happens.** Kai's and Jonah's parent notes mention the kid's "interest in nature" (Kai: "Kai's interest in nature and the outdoors..."). That comes from the account's kid profile, not the theme. It is harmless for real families.

**What to do.** Nothing in the generator. For future sample packets, check the profile's interests first, or read the parent note before publishing, since it shows up in public pages.

---

## 9. fixture-example still points at the old /sample images

**What happens.** `content/unit-studies/fixture-example.json` uses `/sample/page-NN.png` for its gallery, with captions written for the old Noah packet. Those images are now Kai's outer space pages, so the captions no longer match. It is a draft, so it only shows on previews, never in production.

**What to do.** Point its gallery at images that match its captions, or rewrite the captions for Kai's pages.

---

## 10. /sample phase 2: the "Obsession Machine" hero animation

**What to do.** Design and review with Natalie before building anything.

---

## Fixed 2026-09-30

- Preview builds failed while downloading Nunito from Google Fonts (module not found in a nunito `.module.css`). Fonts are now self-hosted with `next/font/local` (files and OFL licenses in `app/fonts/`), so builds never download fonts.

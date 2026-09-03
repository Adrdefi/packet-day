// Server-side only — do not import from client components.
// Used exclusively by app/api/generate-pdf/route.ts via createElement().

import path from 'path';
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Svg,
  Polygon,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ContentType } from "@/types";
import {
  color,
  accentFamily,
  familyForActivity,
  type AccentFamily,
  type as typeScale,
  typeStyle,
  space,
  band as bandTable,
  bandForGrade,
  type BandKey,
} from "@/lib/pdf-tokens";
import { shortTitle } from "@/lib/pdf-fields";

// ─── Font registration ─────────────────────────────────────────────────────────

Font.register({
  family: 'Nunito',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Bold.ttf'), fontWeight: 700 },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Regular.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Bold.ttf'), fontWeight: 700, fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'Fraunces',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Fraunces-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Fraunces-Bold.ttf'), fontWeight: 700 },
    { src: path.join(process.cwd(), 'public/fonts/Fraunces-ExtraBold.ttf'), fontWeight: 800 },
  ],
});

// Disable auto-hyphenation globally — titles and content should break on whole words only.
Font.registerHyphenationCallback((word) => [word]);

// ─── Design tokens ────────────────────────────────────────────────────────────
//
// Colors come from lib/pdf-tokens.ts (color, accentFamily, familyForActivity).
// `C` and the old 5-colour index-based activity rotation are gone — an
// activity's accent now comes from its ContentType via familyForActivity,
// not from its position in the packet. See familyColorsForActivity below.

// Kept as a local alias so the many `colors: ActivityColor` prop types in
// this file don't all need touching — it's exactly AccentFamily.
type ActivityColor = AccentFamily;

/** The fill color for a bounded family-tinted element (character strip,
 * instruction bullets, etc.) — falls back to plain white for families with
 * no stripFill defined (coloring). Pages themselves are always color.page;
 * see the PDF token rebuild chunk 3 spec. */
function familyBg(colors: ActivityColor): string {
  return colors.stripFill ?? color.page;
}

function familyColorsForActivity(activity: PDFActivity): ActivityColor {
  const contentType = resolveContentType(activity);
  return accentFamily[familyForActivity(contentType)];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFActivity {
  subject: string;
  content_type?: ContentType;
  passage?: string | null;
  title: string;
  description: string;
  instructions: string[];
  estimated_minutes: number;
  materials?: string[];
  answer_key?: string | null;
  encouragement?: string;
  fun_fact?: string | null;
}

export interface PDFColoringPage {
  title: string;
  coloring_scene: string;
  instructions: string;
}

export interface PacketPDFProps {
  childName: string;
  childEmoji: string;
  childGrade: string;
  theme: string;
  title: string;
  activities: PDFActivity[];
  createdAt: string;
  mascotImageUrl?: string | null;
  mascotName?: string | null;
  coloringPage?: PDFColoringPage | null;
  coloringImageUrl?: string | null;
  greeting?: string | null;
  parentNotes?: string | null;
  dailyReflection?: string | null;
  packetMission?: string | null;
  packetCelebration?: string | null;
}

// ─── Grade-band helpers ───────────────────────────────────────────────────────
// Band-KEY resolution (childGrade -> 'K-2'|'3-5'|'6-8') now goes through
// bandForGrade (lib/pdf-tokens.ts) — see Stage 3 of the PDF token rebuild.

interface BandConfig {
  cardPad: number;    // card padding
  cardRadius: number; // card border radius
}

// Font-size fields (body, instrBody) moved to lib/pdf-tokens.ts's band table
// in Stage 3 of the PDF token rebuild — these remaining fields are layout
// values, out of scope for that migration. Line pitch now comes from
// bandTable[band].answerLinePitch (chunk 4) — see the stretch-group caps.
// borderW (question-box border width) removed in chunk 9 — questionBox lost
// its border entirely, and it had no other caller.
function getBandConfig(band: 'K-2' | '3-5' | '6-8'): BandConfig {
  const configs: Record<'K-2' | '3-5' | '6-8', BandConfig> = {
    'K-2': { cardPad: 14, cardRadius: 14 },
    '3-5': { cardPad: 12, cardRadius: 10 },
    '6-8': { cardPad: 10, cardRadius: 8 },
  };
  return configs[band];
}

function writingLineCount(band: 'K-2' | '3-5' | '6-8'): number {
  return band === 'K-2' ? 10 : band === '3-5' ? 14 : 18;
}

function worksheetAnswerLines(band: 'K-2' | '3-5' | '6-8'): number {
  return band === 'K-2' ? 2 : band === '3-5' ? 3 : 4;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

/**
 * Rounds a duration up to the nearest 10 minutes for "at a glance" display
 * only (Today at a Glance schedule rows) — never the underlying data, never
 * the exact duration shown in an activity's own header.
 */
function roundUpToNearestTen(minutes: number): number {
  return Math.ceil(minutes / 10) * 10;
}

/** First name only, for a childName that turns out to contain more than one word. */
function firstNameOnly(name: string): string {
  const trimmed = name.trim();
  const spaceIdx = trimmed.indexOf(' ');
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}

interface MathAnswerKeySections {
  quickCalculations: string;
  wordProblems: string;
  drawAndSolve: string;
}

/**
 * Splits a Math activity's answer_key into its three labeled sub-sections.
 *
 * The generator (app/api/generate-packet/route.ts) has no explicit schema
 * for answer_key beyond "Parent answers or null" — it free-writes this
 * string. On real packets it comes back as one paragraph anchored by three
 * labels, e.g.:
 *
 *   "Quick Calculations: 3/4 + 1/2 = 5/4 or 1 and 1/4 || 2.75 x 4 = 11 || ...
 *    = 120. Word Problems: 1) Oliver: 240 x 3/8 = 90 coins; ... 200 acres.
 *    Draw and Solve: Least to greatest: 1/4, 7/8, 1 and 1/2 -- wait, ..."
 *
 * Quick Calculations' own answers stay || -separated (mirroring the prompt
 * separator instructions use); Word Problems and Draw and Solve are plain
 * sentences. Casing on the three labels isn't guaranteed (free text), so
 * matching is case-insensitive.
 *
 * Returns null — render the raw string as one paragraph, same as before —
 * whenever the shape doesn't hold: a label is missing, out of order, or
 * there's unexpected content before "Quick Calculations". Never throws,
 * never drops content.
 */
function parseMathAnswerKey(raw: string): MathAnswerKeySections | null {
  const upper = raw.toUpperCase();
  const qcIdx = upper.indexOf('QUICK CALCULATIONS');
  const wpIdx = upper.indexOf('WORD PROBLEMS');
  let dsIdx = upper.indexOf('DRAW AND SOLVE');
  if (dsIdx === -1) dsIdx = upper.indexOf('DRAW & SOLVE');

  if (qcIdx === -1 || wpIdx === -1 || dsIdx === -1) return null;
  if (!(qcIdx < wpIdx && wpIdx < dsIdx)) return null;
  if (raw.slice(0, qcIdx).trim().length > 0) return null;

  const qcColon = upper.indexOf(':', qcIdx);
  const wpColon = upper.indexOf(':', wpIdx);
  const dsColon = upper.indexOf(':', dsIdx);
  if (qcColon === -1 || wpColon === -1 || dsColon === -1) return null;
  if (!(qcColon < wpIdx && wpColon < dsIdx)) return null;

  const quickCalculations = raw.slice(qcColon + 1, wpIdx).trim();
  const wordProblems = raw.slice(wpColon + 1, dsIdx).trim();
  const drawAndSolve = raw.slice(dsColon + 1).trim();
  if (!quickCalculations || !wordProblems || !drawAndSolve) return null;

  return { quickCalculations, wordProblems, drawAndSolve };
}

/**
 * Strip emoji and non-renderable Unicode from text before PDF rendering.
 * Nunito/Fraunces covers Latin + Latin-Extended but not emoji blocks.
 */
function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[\u2B00-\u2BFF]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u20E3/g, '')
    .trim();
}

export function resolveContentType(activity: PDFActivity): ContentType {
  if (activity.content_type) return activity.content_type;
  const s = activity.subject.toLowerCase();
  if (s.includes('reading') || s.includes('comprehension')) return 'reading_passage';
  if (s.includes('writing') || s.includes('journal') || s.includes('story') || s.includes('creative')) return 'writing_prompt';
  if (s.includes('art') || s.includes('coloring') || s.includes('drawing')) return 'coloring';
  if (s.includes('pe') || s.includes('movement') || s.includes('exercise')) return 'movement_activity';
  if (s.includes('puzzle')) return 'puzzle_break';
  return 'worksheet';
}

function formatPDFDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function greetingMessage(childName: string, theme: string): string {
  return (
    `Today is all about ${theme}! ${childName} is in for a wonderful day of discovery. ` +
    `Gather your supplies, find a comfortable spot, and let's make something great together. ` +
    `Every activity was made just for ${childName} - dive in whenever you're ready.`
  );
}

function reflectionQuestion(theme: string): string {
  return `What was your favorite part of today's ${theme} activities? What's one thing you learned that surprised you?`;
}

function parentNote(childName: string, theme: string): string {
  return (
    `This packet was designed around "${theme}" to make every activity feel connected and purposeful for ${childName}. ` +
    `Each section builds on ${childName}'s natural curiosity while covering core learning areas. ` +
    `Feel free to skip activities that don't fit today, or extend the ones ${childName} loves most.`
  );
}

function bonusChallenge(subject: string, title: string): string {
  const s = subject.toLowerCase();
  if (s.includes('math')) return `Make up your own math problem inspired by "${title}". Can you solve it too?`;
  if (s.includes('read') || s.includes('writ')) return `Write 2-3 sentences about what "${title}" makes you think of. Use your best descriptive words.`;
  if (s.includes('sci')) return `What's one experiment you could do at home related to "${title}"? Describe it step by step.`;
  if (s.includes('art')) return `Draw something inspired by "${title}" using only 3 colours. See what you can create.`;
  if (s.includes('hist') || s.includes('social')) return `If you could learn more about "${title}", what question would you ask an expert?`;
  return `Can you teach someone else what you learned about "${title}" today? Try explaining it in 3 sentences.`;
}

// ─── Word search generator (deterministic) ───────────────────────────────────

function seededLCG(seed: number): () => number {
  let s = (seed ^ 0xDEADBEEF) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function generateWordSearch(
  wordList: string[],
  gridSize = 10
): { grid: string[][]; placed: string[] } {
  const words = wordList
    .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3 && w.length <= gridSize);

  const seed = words.join('').split('').reduce((a, c) => a + c.charCodeAt(0), 42);
  const rand = seededLCG(seed);

  const grid: string[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => '')
  );

  // Horizontal + vertical (both directions) — diagonal skipped for readability
  const dirs: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  const placed: string[] = [];

  for (const word of words) {
    let ok = false;
    for (let attempt = 0; attempt < 200 && !ok; attempt++) {
      const [dr, dc] = dirs[Math.floor(rand() * dirs.length)];

      const minR = dr < 0 ? word.length - 1 : 0;
      const minC = dc < 0 ? word.length - 1 : 0;
      const maxR = dr > 0 ? gridSize - word.length : gridSize - 1;
      const maxC = dc > 0 ? gridSize - word.length : gridSize - 1;

      if (maxR < minR || maxC < minC) continue;

      const row = minR + Math.floor(rand() * (maxR - minR + 1));
      const col = minC + Math.floor(rand() * (maxC - minC + 1));

      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) { canPlace = false; break; }
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) { canPlace = false; break; }
      }

      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          grid[row + dr * i][col + dc * i] = word[i];
        }
        placed.push(word);
        ok = true;
      }
    }
  }

  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!grid[r][c]) grid[r][c] = alpha[Math.floor(rand() * alpha.length)];
    }
  }

  return { grid, placed };
}

// ─── Child page footer position constants ──────────────────────────────────────
//
// FOOTER_BOTTOM is the distance from the page's bottom edge both footer
// elements are meant to sit at.
//
// RENDER_PROP_Y_OFFSET compensates for an @react-pdf/renderer 4.8.1 bug: a
// <Text fixed render={...}/> element renders measurably higher than a plain
// <Text fixed> at the *same* declared `bottom`, regardless of nesting depth,
// page type, or content (tested: shared flex row, fully decoupled sibling,
// direct child of <Page> — same offset every time; tested that `bottom` is
// otherwise respected linearly by moving it 400pt and confirming the element
// moved by exactly 400pt). Matches a known upstream issue:
// https://github.com/diegomura/react-pdf/issues/525 ("`render` method
// doesn't get proper page numbers when inside a `View`").
//
// Measured 2026-09-01 on a real packet (16 pages, 3 grade bands): with both
// texts at bottom=FOOTER_BOTTOM, the plain text lands at a constant y=21.647;
// the render-prop text lands at y=108.03–108.10 (jitter is glyph-hinting
// noise, not signal) — a gap of 86.38–86.45pt, averaging 86.423 across 15
// samples. Subtracting that from FOOTER_BOTTOM and re-measuring landed the
// render-prop text within 0.06pt of its sibling on all 15 pages, all 3 bands.
//
// This is a measured constant tied to react-pdf 4.8.1's specific behavior,
// not a derived value — see the CLAUDE.md note on react-pdf render-prop
// positioning for what to do before trusting it after a version bump.
const FOOTER_BOTTOM = 20;
const RENDER_PROP_Y_OFFSET = 86.42;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Page base ───────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: color.page,
    padding: 48,
    flexDirection: 'column',
  },

  // ── Cover: decorative frame ─────────────────────────────────────────────────
  coverFrameOuter: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 16,
    right: 16,
    borderWidth: 2,
    borderColor: color.honey,
    borderRadius: 4,
    opacity: 0.55,
  },
  coverFrameInner: {
    position: 'absolute',
    top: 22,
    bottom: 22,
    left: 22,
    right: 22,
    borderWidth: 1,
    borderColor: color.honey,
    borderRadius: 3,
    opacity: 0.3,
  },

  // ── Cover: top row ──────────────────────────────────────────────────────────
  coverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordmark: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 11,
    color: color.sage,
    letterSpacing: 0.3,
  },
  coverDate: {
    ...typeStyle(typeScale.footerText),
    color: color.textSecondary,
  },

  // ── Cover: center content ───────────────────────────────────────────────────
  coverCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  mascotImageCover: {
    width: 280,
    height: 280,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 4,
  },
  mascotFallbackCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: color.page,
    borderWidth: 3,
    borderColor: color.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mascotFallbackEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  mascotNameText: {
    ...typeStyle(typeScale.mascotName),
    color: color.sage,
    textAlign: 'center',
  },

  // ── Cover: title ────────────────────────────────────────────────────────────
  coverTitle: {
    ...typeStyle(typeScale.packetTitle),
    color: color.textPrimary,
    textAlign: 'center',
    marginHorizontal: 16,
  },

  // ── Cover: chip row (activity count / duration / grade) — spec 5.1 ─────────
  coverChipRow: {
    flexDirection: 'row',
    gap: 10.5,
    alignSelf: 'center',
  },
  coverChip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13.5,
  },
  coverChipText: {
    ...typeStyle(typeScale.chipLabel),
  },

  // ── Cover: greeting / mission box ───────────────────────────────────────────
  greetingBox: {
    borderWidth: 2,
    borderColor: color.sage,
    borderRadius: 12,
    padding: 16,
    backgroundColor: color.sageTint,
    width: '100%',
  },
  greetingLabel: {
    ...typeStyle(typeScale.calloutEyebrow),
    color: color.sage,
    marginBottom: 6,
  },
  greetingText: {
    ...typeStyle(typeScale.missionBody),
    color: color.sageDark,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Cover: name/date signature lines — spec 5.1 ─────────────────────────────
  coverSignatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
  },
  coverSignatureColName: {
    flexDirection: 'column',
    flexGrow: 1,
  },
  coverSignatureColDate: {
    flexDirection: 'column',
    width: 142,
  },
  coverSignatureLabel: {
    ...typeStyle(typeScale.subjectLabel),
    color: color.sage,
    marginBottom: 6,
  },
  coverSignatureRule: {
    height: 1.5,
    backgroundColor: color.signatureRule,
  },


  // ── Activity page ───────────────────────────────────────────────────────────
  // padding lives on the <Page> itself (set inline per band at each call
  // site, e.g. { padding: bc.cardPad + 24 }), NOT on activityContent below.
  // react-pdf's page-fragmentation (splitPage) copies page.style verbatim to
  // every physical-page fragment, so Page-level padding survives a
  // continuation break intact. Padding on an inner View does not: splitNode
  // strips paddingTop from a continuation-start fragment and paddingBottom
  // from a continuation-end (non-final) fragment — see chunk 9 stage 4
  // diagnosis (no top margin on continuation pages; a section label
  // stranding under the footer on the page before one).
  activityPage: {
    flexDirection: 'column',
    backgroundColor: color.page,
  },
  activityContent: {
    flex: 1,
    flexDirection: 'column',
  },

  // Activity header — see spec 5.3. Replaces the old full-bleed colored bar.
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  activityHeaderLeft: {
    flexDirection: 'column',
    gap: 3,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingRight: 12,
  },
  activityHeaderSubject: {
    ...typeStyle(typeScale.subjectLabel),
  },
  activityHeaderTitle: {
    ...typeStyle(typeScale.activityTitle),
    color: color.textPrimary,
  },
  activityHeaderDuration: {
    ...typeStyle(typeScale.durationMaterials),
    color: color.textSecondary,
    textAlign: 'right',
    maxWidth: 165,
    flexShrink: 0,
  },
  activityHeaderRule: {
    height: 2.25,
    marginTop: space.headerToRule,
    marginBottom: space.ruleToContent,
  },

  // ── Character strip ─────────────────────────────────────────────────────────
  // Spec 5.5 — mascot + intro text, once per activity, replaces the old
  // description box.
  characterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13.5,
    borderRadius: 10.5,
    paddingVertical: 10,
    paddingHorizontal: 13.5,
    marginBottom: 16,
    width: '100%',
  },
  characterStripMascot: {
    objectFit: 'contain',
    flexShrink: 0,
  },
  characterStripText: {
    ...typeStyle(typeScale.characterStripText),
    color: color.textPrimary,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },

  // ── Instructions ────────────────────────────────────────────────────────────
  instructionsLabel: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textSecondary,
    marginBottom: 10,
  },
  // Chunk 9 — no container. Questions are separated from each other by
  // space, not a border/background box (spec deviation: this rebuild keeps
  // color where a child engages with it — the bullet, the callouts, the
  // strip — and removes it from adult-facing print chrome like this one).
  questionBox: {
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  // width/height/borderRadius/borderWidth/backgroundColor are set inline per
  // band (K-2/3-5 get a circle, sized via bandTable[band].questionBulletSize;
  // 6-8 skips this style entirely for instructionBulletPlain below).
  instructionBullet: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  instructionBulletText: {
    ...typeStyle(typeScale.questionNumber),
  },
  // 6-8's plain-number treatment — no circle. questionNumber is already
  // fontWeight:700 (bold), matching "just the number in bold".
  instructionBulletPlain: {
    ...typeStyle(typeScale.questionNumber),
    marginRight: 8,
  },
  instructionText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    flex: 1,
  },
  answerLineInBox: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: color.answerRule,
    marginTop: 12,
  },
  // Spec section 6 — a MAY STRETCH group of ruled lines. flexGrow/maxHeight
  // are set per instance (weight and cap vary by category); this just holds
  // the shared structural bits.
  answerLineGroup: {
    flexBasis: 'auto',
  },
  // Each individual ruled line gets an EQUAL flexGrow share of the group's
  // grown height, its border-bottom sitting at the bottom of that share.
  // Tried justifyContent:'space-between' on the group first — two lines
  // read as one at a glance, close enough together to worry it wasn't
  // repositioning after growth. Switched to this per-child pattern instead
  // and confirmed it via a high-contrast diagnostic render (distinct
  // top/bottom lines, correct positions) rather than digging into whether
  // space-between was actually broken or just a low-contrast dotted line.
  answerLineGroupLine: {
    flexGrow: 1,
    flexBasis: 0,
  },


  // ── Callouts (spec 5.8 / 5.9) ─────────────────────────────────────────────────
  // 10.5pt radius. The fun fact callout is minHeight:44 — fun_fact is capped
  // at 200 chars generator-side to fit 44pt at this width, so it grows only
  // if that cap is ever violated, rather than clipping. Encouragement and
  // self-assessment stay fixed height:44 — they hold a 30pt star row with
  // real vertical structure to preserve, and their text is always short.
  funFactBox: {
    minHeight: 44,
    flexDirection: 'column',
    gap: 2.25,
    borderRadius: 10.5,
    paddingVertical: 9,
    paddingHorizontal: 13.5,
    backgroundColor: color.honeyTint,
  },
  funFactLabel: {
    ...typeStyle(typeScale.calloutEyebrow),
    color: color.honeyDark,
  },
  funFactText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.textPrimary,
  },

  // Encouragement and self-assessment share this row shape — text left,
  // star row right. Only the fill color and left-text style differ.
  calloutRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 13.5,
    borderRadius: 10.5,
    paddingVertical: 10.5,
    paddingHorizontal: 13.5,
  },
  encouragementCallout: {
    backgroundColor: color.honeyTint,
  },
  selfAssessmentCallout: {
    backgroundColor: color.sageTint,
  },
  calloutRowText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.textPrimary,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  selfAssessmentText: {
    ...typeStyle(typeScale.calloutBody),
    fontWeight: 700,
    color: color.sageDark,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },

  // Star row — always the right-hand element of a callout, never standalone.
  calloutStarRow: {
    flexDirection: 'row',
    gap: 7.5,
    flexShrink: 0,
  },
  calloutStarCircle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 2.25,
    borderColor: color.honey,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Bonus challenge ─────────────────────────────────────────────────────────
  bonusChallengeBox: {
    backgroundColor: color.honeyTint,
    borderWidth: 2,
    borderColor: color.honey,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  bonusChallengeHeader: {
    ...typeStyle(typeScale.calloutEyebrow),
    color: color.honeyDark,
    marginBottom: 5,
  },
  bonusChallengeText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.textPrimary,
    fontStyle: 'italic',
  },

  // ── Child page footer ────────────────────────────────────────────────────────
  // left/right come from each page's own content inset — see ChildPageFooter's
  // `inset` prop. Pages have different padding (activity: band-dependent,
  // cover/notes: 48, certificate: 56), so the footer can't share one fixed value
  // without floating off the content edge on wider-margin pages.
  childPageFooterLeft: {
    position: 'absolute',
    bottom: FOOTER_BOTTOM,
  },
  // A shared flex row broke when paired with the render-callback Text below:
  // react-pdf's render-prop mechanism doesn't lay that Text out on the same
  // pass as its plain-text sibling, so alignItems:'center' centered it
  // against a phantom height, landing it ~43pt off (verified: swapping in a
  // plain static Text at the same spot lands correctly). Decoupled into two
  // independently `fixed`, independently `position:absolute` elements
  // instead — neither depends on the other's measured size. `bottom` here
  // still needs RENDER_PROP_Y_OFFSET — see the constant's own comment above.
  childPageFooterRight: {
    position: 'absolute',
    bottom: FOOTER_BOTTOM - RENDER_PROP_Y_OFFSET,
    width: 60,
    textAlign: 'right',
  },

  // ── Parent answer sheet (spec 5.18) ─────────────────────────────────────────
  parentSheetPage: {
    backgroundColor: color.page,
    paddingTop: 33,
    paddingBottom: 33,
    paddingLeft: 45,
    paddingRight: 45,
    flexDirection: 'column',
  },
  parentSheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  parentSheetHeaderLeft: {
    flexDirection: 'column',
    gap: 3,
  },
  parentSheetEyebrow: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.coralDark,
  },
  parentSheetTitle: {
    ...typeStyle(typeScale.pageTitle),
    color: color.textPrimary,
  },
  parentSheetHeaderRight: {
    ...typeStyle(typeScale.durationMaterials),
    color: color.textSecondary,
  },
  parentSheetRule: {
    height: 2.25,
    backgroundColor: color.coralRule,
    marginTop: space.headerToRule,
    marginBottom: space.ruleToContent,
  },
  parentSheetBanner: {
    backgroundColor: color.coralTint,
    borderWidth: 1.5,
    borderColor: color.coralChip,
    borderRadius: 10.5,
    paddingVertical: 10.5,
    paddingHorizontal: 13.5,
    marginBottom: 16,
  },
  parentSheetBannerText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.textPrimary,
  },
  parentSheetKeyStack: {
    flexGrow: 1,
    flexBasis: 'auto',
    flexDirection: 'column',
    gap: 9.75,
  },
  parentSheetGroup: {
    flexDirection: 'column',
    gap: 4,
  },
  parentSheetSubject: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.sageDark,
  },
  parentSheetAnswerBody: {
    ...typeStyle(typeScale.answerKeyBody),
    color: color.textPrimary,
  },
  // Math answer_key, split into labeled sub-sections (parseMathAnswerKey)
  // instead of one wall-of-text paragraph.
  parentSheetMathStack: {
    flexDirection: 'column',
    gap: 6,
  },
  parentSheetAnswerLabel: {
    ...typeStyle(typeScale.answerKeyEmphasis),
    color: color.textPrimary,
  },
  parentSheetDivider: {
    borderBottomWidth: 0.75,
    borderBottomColor: color.faintDivider,
  },
  parentSheetFooter: {
    position: 'absolute',
    bottom: 20,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ── Reading passage ──────────────────────────────────────────────────────────
  // Spec section 6 — the passage is a MAY STRETCH column, weight 1, no cap:
  // it has no maxHeight, so when it competes with capped siblings (the
  // comprehension answer-line groups) it simply absorbs whatever they can't
  // use, and when it's the page's only stretcher it absorbs everything.
  // Chunk 9 — plain text on the white page, no cream fill or left border.
  // Stretch behavior (spec section 6, MAY STRETCH weight 1, no cap) is
  // unchanged — flexGrow/flexBasis stay exactly as they were.
  readingPassageBlock: {
    marginBottom: 14,
    flexGrow: 1,
    flexBasis: 'auto',
  },
  readingPassageLabel: {
    ...typeStyle(typeScale.sectionLabel),
    marginBottom: 8,
  },
  readingPassageText: {
    ...typeStyle(typeScale.readingPassage),
    color: color.textPrimary,
    fontStyle: 'italic',
  },

  // ── Open workspace (writing / movement / coloring) ───────────────────────────
  // Chunk 9 stage 2 — no container, separated by space instead of a border.
  promptBubble: {
    marginBottom: 14,
  },
  // Chunk 9 stage 2 — spacing moves from the text's own marginTop to the row
  // wrapper (see QuestionBullet usage sites), since bullet and text are now
  // row siblings that need to stay vertically aligned.
  promptInstructionText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  writingSpaceHeader: {
    ...typeStyle(typeScale.sectionLabel),
    marginBottom: 12,
  },
  // Work surfaces, not decorative chrome — left alone per instructions.
  writingLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: color.answerRule,
    marginBottom: 26,
  },
  drawBox: {
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: color.answerRule,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  drawBoxLabel: {
    ...typeStyle(typeScale.openAreaPlaceholder),
    color: color.placeholder,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Chunk 9 stage 2 — no container. Label and ruled lines, and the
  // wrap={false}/stretch behavior on the JSX side, are unchanged.
  movementReflectionBox: {
    marginTop: 16,
  },
  movementReflectionLabel: {
    ...typeStyle(typeScale.sectionLabel),
    marginBottom: 10,
  },
  // Pitch comes from minHeight (band-scaled, set per-instance — see
  // reflectionLinePitch in OpenWorkspaceTemplate), not a flat marginBottom,
  // so the resting gap between lines scales with the band like every other
  // pitch value in this file.
  movementReflectionLine: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: color.answerRule,
  },

  // ── Math structured sections ─────────────────────────────────────────────────
  // Chunk 9 — replaces the old filled section bar (solid family-color
  // rectangle with a white bracketed label). Just the label now, in the
  // family's label color, applied inline at each call site.
  mathSectionLabel: {
    ...typeStyle(typeScale.sectionLabel),
    marginTop: 10,
    marginBottom: 8,
  },
  mathCalcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  mathCalcCell: {
    width: '50%',
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  mathCalcNumber: {
    ...typeStyle(typeScale.questionNumber),
    color: color.textSecondary,
    marginRight: 6,
    marginTop: 2,
  },
  mathCalcEquation: {
    ...typeStyle(typeScale.quickCalcItem),
    color: color.textPrimary,
    flex: 1,
  },
  mathCalcAnswerLine: {
    borderBottomWidth: 1.5,
    borderBottomColor: color.answerRule,
    width: 80,
    marginTop: 8,
  },
  // Chunk 9 — no container, separated by space instead of a border.
  mathWordBox: {
    marginBottom: 16,
  },
  mathWordText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    marginBottom: 6,
  },
  // Chunk 9 sweep — same pattern as the promptBubble flattened in stage 2:
  // a light border + white background wrapping instructional text, not a
  // work surface (the actual drawing area, mathDrawBox below, is untouched —
  // that one holds the child's own drawing and its border is functional).
  mathDrawPromptBubble: {
    marginBottom: 8,
  },
  mathDrawPromptText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    fontStyle: 'italic',
  },
  mathDrawBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: color.answerRule,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mathDrawBoxLabel: {
    ...typeStyle(typeScale.openAreaPlaceholder),
    color: color.placeholder,
    fontStyle: 'italic',
  },
  mathAnswerLineLabel: {
    ...typeStyle(typeScale.answerLineLabel),
    color: color.textSecondary,
    marginBottom: 4,
  },
  mathAnswerLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: color.answerRule,
  },

  // ── Puzzle break (word search) ───────────────────────────────────────────────
  wordSearchGrid: {
    flexDirection: 'column',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: color.faintDivider,
    borderRadius: 4,
  },
  wordSearchRow: {
    flexDirection: 'row',
  },
  wordSearchCell: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: color.faintDivider,
  },
  wordSearchLetter: {
    ...typeStyle(typeScale.wordSearchCell),
    color: color.textPrimary,
    textAlign: 'center',
  },
  wordListLabel: {
    ...typeStyle(typeScale.sectionLabel),
    marginBottom: 8,
  },
  wordListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordListItem: {
    // backgroundColor/borderColor come from the activity's family — see JSX
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  wordListText: {
    // color comes from the activity's family — see JSX
    ...typeStyle(typeScale.wordListChip),
  },

  // ── Certificate page ─────────────────────────────────────────────────────────
  certificatePage: {
    backgroundColor: color.page,
    padding: 56,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certFrameOuter: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
    borderWidth: 3,
    borderColor: color.honey,
    borderRadius: 6,
    opacity: 0.6,
  },
  certFrameInner: {
    position: 'absolute',
    top: 27,
    bottom: 27,
    left: 27,
    right: 27,
    borderWidth: 1.5,
    borderColor: color.honey,
    borderRadius: 4,
    opacity: 0.35,
  },
  certEyebrow: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  certMascotImage: {
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 12,
  },
  certPresented: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: color.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  certChildName: {
    ...typeStyle(typeScale.certificateName),
    color: color.sage,
    textAlign: 'center',
    marginBottom: 8,
  },
  certBody: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: color.textSecondary,
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  certDayTitle: {
    ...typeStyle(typeScale.certificateDayTitle),
    color: color.sageDark,
    textAlign: 'center',
    marginBottom: 20,
  },
  certDivider: {
    width: 105,
    height: 3.75,
    backgroundColor: color.coral,
    borderRadius: 2,
    marginBottom: 20,
    alignSelf: 'center',
  },
  certDateLine: {
    ...typeStyle(typeScale.footerText),
    color: color.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  certSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
    width: '80%',
  },
  certSignatureBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 160,
  },
  certSignatureDateBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 160,
    alignSelf: 'center',
    marginTop: 18,
  },
  certSignatureLine: {
    borderBottomWidth: 1.5,
    borderBottomColor: color.textPrimary,
    width: '100%',
    marginBottom: 4,
  },
  certSignatureLabel: {
    ...typeStyle(typeScale.footerText),
    color: color.textSecondary,
    textAlign: 'center',
  },
  certSignoff: {
    ...typeStyle(typeScale.certificateSignoff),
    color: color.sageDark,
    textAlign: 'center',
    marginTop: 22,
  },

  // ── Notes / reflection pages ─────────────────────────────────────────────────
  notesPage: {
    backgroundColor: color.page,
    padding: 48,
    flexDirection: 'column',
  },
  notesPageTitle: {
    ...typeStyle(typeScale.pageTitle),
    color: color.textPrimary,
    marginBottom: 4,
  },
  notesPageSubtitle: {
    ...typeStyle(typeScale.body),
    color: color.textSecondary,
    marginBottom: 22,
  },
  mascotImageNotes: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  sectionLabel: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textSecondary,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 3,
    flexShrink: 0,
  },
  summaryText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    flex: 1,
  },
  summaryDuration: {
    ...typeStyle(typeScale.scheduleDuration),
    color: color.textSecondary,
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: 8,
  },
  parentNoteBox: {
    backgroundColor: color.sageTint,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: color.sage,
  },
  parentNoteText: {
    ...typeStyle(typeScale.parentNoteBody),
    color: color.sageDark,
    fontStyle: 'italic',
  },
  // Flattened — no border/background. The ruled writing lines below already
  // mark this as a writing area; a heavy box around the question read as
  // inconsistent with the activity pages, which don't box their prompts.
  reflectionBox: {
    marginBottom: 22,
  },
  reflectionLabel: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.honeyDark,
    marginBottom: 10,
  },
  reflectionText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.textPrimary,
    fontStyle: 'italic',
  },
  // Rule under the page header, matching the activity pages — this page had
  // none before.
  dailyReflectionRule: {
    height: 2.25,
    backgroundColor: color.sageRule,
    marginBottom: space.ruleToContent,
  },
  celebrationBox: {
    backgroundColor: color.sageTint,
    borderWidth: 2,
    borderColor: color.sage,
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
  },
  // Mascot + eyebrow/text column — spec 5.16.
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  celebrationMascotImage: {
    objectFit: 'contain',
    flexShrink: 0,
  },
  celebrationTextCol: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  celebrationLabel: {
    ...typeStyle(typeScale.calloutEyebrow),
    color: color.sage,
    marginBottom: 8,
  },
  celebrationText: {
    ...typeStyle(typeScale.characterStripText),
    color: color.sageDark,
    fontStyle: 'italic',
  },
  mascotHuntBox: {
    backgroundColor: color.honeyTint,
    borderWidth: 1.5,
    borderColor: color.honey,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  mascotHuntText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.honeyDark,
    textAlign: 'center',
  },
  observationsLabel: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textPrimary,
    marginBottom: 16,
  },
  ruledLine: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: color.answerRule,
    marginBottom: 26,
  },
  footerText: {
    ...typeStyle(typeScale.footerText),
    color: color.textSecondary,
  },

  // ── Coloring page ────────────────────────────────────────────────────────────
  coloringPage: {
    backgroundColor: color.page,
    padding: 48,
    flexDirection: 'column',
    alignItems: 'center',
  },
  // Page-level eyebrow, not a section label — sized up from sectionLabel's
  // 10pt base to read as the page's own heading treatment. letterSpacing is
  // recomputed from sectionLabel's em value at the new fontSize (typeStyle
  // bakes letterSpacing to absolute points from whatever fontSize is on the
  // object passed in), so the tracking stays proportional, not frozen at 10pt.
  coloringHeaderText: {
    ...typeStyle({ ...typeScale.sectionLabel, fontSize: 14 }),
    color: color.sage,
    textAlign: 'center',
    marginBottom: 8,
  },
  coloringTitle: {
    ...typeStyle(typeScale.pageTitle),
    color: color.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  // Spec section 6 — "Coloring image frame", MAY STRETCH weight 1, no cap.
  // The frame grows; the fixed-size image inside stays centered within it.
  coloringBox: {
    borderWidth: 2.5,
    borderStyle: 'dashed' as const,
    borderColor: color.sageRule,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
    width: '100%',
    flexGrow: 1,
    flexBasis: 'auto',
  },
  coloringBoxImage: {
    width: 420,
    height: 420,
    objectFit: 'contain',
  },
  coloringBoxPlaceholder: {
    ...typeStyle(typeScale.openAreaPlaceholder),
    color: color.sageRule,
    fontStyle: 'italic',
    textAlign: 'center',
    width: 420,
    height: 420,
  },
  coloringInstructionBubble: {
    borderWidth: 2,
    borderColor: color.sageRule,
    borderRadius: 12,
    padding: 14,
    backgroundColor: color.page,
    width: '100%',
    marginTop: 4,
  },
  coloringInstructionText: {
    ...typeStyle(typeScale.instruction),
    color: color.sageDark,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

// ─── SVG star component ───────────────────────────────────────────────────────

function StarSvg({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({
  childName,
  childGrade,
  childEmoji,
  title,
  theme,
  createdAt,
  mascotImageUrl,
  mascotName,
  greeting,
  activities,
  packetMission,
}: PacketPDFProps) {
  const totalMinutes = activities.reduce((s, a) => s + a.estimated_minutes, 0);
  const missionText = sanitizeText(packetMission) || sanitizeText(greeting) || greetingMessage(childName, theme);
  const hasParentSheet = activities.some((a) => !!a.answer_key);

  return (
    <Page size="LETTER" style={styles.coverPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={48} />

      {/* Decorative border frames */}
      <View style={styles.coverFrameOuter} />
      <View style={styles.coverFrameInner} />

      {/* Top row: wordmark + date */}
      <View style={styles.coverTop}>
        <Text style={styles.wordmark}>Packet Day</Text>
        <Text style={styles.coverDate}>{formatPDFDate(createdAt)}</Text>
      </View>

      {/* Center block — natural height, NOT flexGrow (chunk 4 bug pattern:
          only the spacer below absorbs leftover page height). */}
      <View style={styles.coverCenter}>
        {/* Mascot hero image or fallback emoji circle */}
        {mascotImageUrl ? (
          <>
            <Image src={mascotImageUrl} style={styles.mascotImageCover} />
            {mascotName && (
              <Text style={styles.mascotNameText}>{sanitizeText(mascotName)}</Text>
            )}
          </>
        ) : (
          <View style={styles.mascotFallbackCircle}>
            <Text style={styles.mascotFallbackEmoji}>{childEmoji}</Text>
          </View>
        )}

        {/* Packet title — Fraunces bold, large */}
        <Text style={styles.coverTitle}>{sanitizeText(title)}</Text>

        {/* Activity count / duration / grade chips — spec 5.1 */}
        <View style={styles.coverChipRow}>
          <View style={[styles.coverChip, { backgroundColor: color.sageChip }]}>
            <Text style={[styles.coverChipText, { color: color.sageDark }]}>
              {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
            </Text>
          </View>
          <View style={[styles.coverChip, { backgroundColor: color.honeyChip }]}>
            <Text style={[styles.coverChipText, { color: color.honeyDark }]}>{totalMinutes} min</Text>
          </View>
          <View style={[styles.coverChip, { backgroundColor: color.coralChip }]}>
            <Text style={[styles.coverChipText, { color: color.coralDark }]}>{childGrade}</Text>
          </View>
        </View>

        {/* Mission / greeting box — natural height, never stretched */}
        <View style={styles.greetingBox}>
          {packetMission ? (
            <Text style={styles.greetingLabel}>Your Mission Today</Text>
          ) : null}
          <Text style={styles.greetingText}>{missionText}</Text>
        </View>
      </View>

      {/* Spacer — the ONLY flexGrow element on this page. Collects all
          leftover height so the name/date lines below pin to the bottom
          without stretching the mission panel above (chunk 4 bug pattern). */}
      <View style={{ flexGrow: 1 }} />

      {/* Name / date signature lines — spec 5.1 */}
      <View style={styles.coverSignatureRow}>
        <View style={styles.coverSignatureColName}>
          <Text style={styles.coverSignatureLabel}>Name</Text>
          <View style={styles.coverSignatureRule} />
        </View>
        <View style={styles.coverSignatureColDate}>
          <Text style={styles.coverSignatureLabel}>Date</Text>
          <View style={styles.coverSignatureRule} />
        </View>
      </View>
    </Page>
  );
}

// ─── Activity header ──────────────────────────────────────────────────────────
// Spec 5.3 — subject + title left, duration/materials right, then a rule.
// No mascot here; it lives in the character strip (stage 2).

function ActivityHeader({
  activity,
  colors,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
}) {
  const materials = activity.materials && activity.materials.length > 0
    ? activity.materials.join(', ')
    : '';
  const durationMaterials = `${activity.estimated_minutes} min${materials ? ' · ' + materials : ''}`;

  return (
    <View minPresenceAhead={120}>
      <View style={styles.activityHeaderRow}>
        <View style={styles.activityHeaderLeft}>
          <Text style={[styles.activityHeaderSubject, { color: colors.label }]}>
            {sanitizeText(activity.subject)}
          </Text>
          <Text style={styles.activityHeaderTitle}>
            {sanitizeText(shortTitle(activity))}
          </Text>
        </View>
        <Text style={styles.activityHeaderDuration}>{durationMaterials}</Text>
      </View>
      <View style={[styles.activityHeaderRule, { backgroundColor: colors.rule }]} />
    </View>
  );
}

// ─── Character strip ──────────────────────────────────────────────────────────
// Spec 5.5 — mascot + intro text, once per activity, first page only.
// Replaces the old description box everywhere activity.description rendered.

function CharacterStrip({
  activity,
  colors,
  mascotImageUrl,
  band,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  mascotImageUrl?: string | null;
  band: BandKey;
}) {
  const mascotSize = bandTable[band].stripMascot;
  return (
    <View wrap={false} style={[styles.characterStrip, { backgroundColor: familyBg(colors) }]}>
      {mascotImageUrl && (
        <Image
          src={mascotImageUrl}
          style={[styles.characterStripMascot, { width: mascotSize, height: mascotSize }]}
        />
      )}
      <Text style={styles.characterStripText}>{sanitizeText(activity.description)}</Text>
    </View>
  );
}

// ─── Star row (spec 5.9) ───────────────────────────────────────────────────────
// Always the right-hand element of a callout, never standalone. Fixed honey
// styling regardless of the activity's family — one consistent look.

function StarRow() {
  return (
    <View style={styles.calloutStarRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.calloutStarCircle}>
          <StarSvg color={color.honey} size={15} />
        </View>
      ))}
    </View>
  );
}

// ─── End-of-activity callout (spec 5.8 / 5.9, star rule) ──────────────────────
//
// Exactly one per activity, rendered last in the template's content flow so
// it lands on whatever page pagination decides is the activity's last page
// (no page-boundary detection exists yet — that's chunk 5). Replaces both
// the old mid-page mascot bubble and the standalone star row.
//
// - Graded activities (isBreak=false): encouragement callout with stars if
//   activity.encouragement is set, else a self-assessment callout with stars.
// - Breaks (isBreak=true): encouragement callout with NO stars if there's
//   encouragement text, else nothing — a break isn't graded, and "how did I
//   do" doesn't fit a puzzle or a movement drill.

function EndOfActivityCallout({
  activity,
  isBreak,
}: {
  activity: PDFActivity;
  isBreak: boolean;
}) {
  const encouragement = activity.encouragement?.trim();

  if (encouragement) {
    return (
      <View wrap={false} style={[styles.calloutRow, styles.encouragementCallout]}>
        <Text style={styles.calloutRowText}>{sanitizeText(encouragement)}</Text>
        {!isBreak && <StarRow />}
      </View>
    );
  }

  if (isBreak) return null;

  return (
    <View wrap={false} style={[styles.calloutRow, styles.selfAssessmentCallout]}>
      <Text style={styles.selfAssessmentText}>How did I do today? Circle your stars.</Text>
      <StarRow />
    </View>
  );
}

// ─── Fun fact callout ─────────────────────────────────────────────────────────

function FunFactBox({ funFact, band }: { funFact: string; band: BandKey }) {
  if (!funFact) return null;
  return (
    <View wrap={false} style={styles.funFactBox}>
      <Text style={styles.funFactLabel}>Did you know?</Text>
      <Text style={[styles.funFactText, { fontSize: bandTable[band].calloutBodySize }]}>{sanitizeText(funFact)}</Text>
    </View>
  );
}

// ─── Trailing-group height (spec 6.4 / chunk 8) ────────────────────────────────
// react-pdf gives no way to know where pagination actually falls (confirmed
// chunk 6 for total page count, chunk 8 Stage 1 for per-element position), so
// this can't be measured exactly — it's a deliberately-labeled ESTIMATE,
// calibrated against real rendered packets, not per-instance text
// measurement. Feeds minPresenceAhead on the wrap={false} block immediately
// before an activity's trailing group (fun fact / bonus challenge /
// end-of-activity callout), so react-pdf pushes that whole block — and the
// trailing group riding right after it — onto the next page together,
// rather than letting the trailing group land alone on an otherwise-empty
// page. That was the chunk 7 sweep's largest real defect: 12 bonus-challenge
// tails and 3 self-assessment callouts of the 80-packet sweep's 17 genuine
// trailing-callout cases.
//
// None of funFactBox, bonusChallengeBox, or calloutRow/selfAssessmentCallout
// carry margins of their own except bonusChallengeBox (marginTop 8,
// marginBottom 6, both folded into the 92 below) — react-pdf/Yoga doesn't
// collapse margins, so these three figures just sum with no extra gap term.
const TRAILING_HEIGHT = {
  // minHeight 44 floor + typical short overflow. Assumed, not measured —
  // most real fun facts run ~80-150 chars (1-2 lines) at the callout body
  // size. Chunk 3 deferred the generator-side char cap that would make this
  // exact; the box still grows correctly for longer text regardless.
  funFact: 50,
  // Padding + eyebrow header + ~2 lines of italic body text + its own
  // 8pt/6pt top/bottom margins. Calibrated against a real rendered bonus
  // challenge box (measured ~93pt total on packet 04043266).
  bonusChallenge: 92,
  // Typical 2-line encouragement at calloutBody size + padding — measured
  // 52.9pt on a real encouragement-alone page (chunk 7 sweep, grade 7 band).
  encouragement: 53,
  // Fixed short string ("How did I do today? Circle your stars."), stays at
  // the minHeight:44 floor — confirmed via glyph measurement in chunk 6.
  selfAssessment: 44,
} as const;

/**
 * Reserve height for minPresenceAhead on the block immediately before an
 * activity's trailing group, so that group can't land alone on a fresh page.
 * hasBonusChallenge should be true only for templates that ever render one
 * (WorksheetTemplate) — the band !== '6-8' gate is applied internally.
 * includeFunFact defaults to true; PuzzleBreakTemplate renders its fun fact
 * box right after the character strip, well before the grid — not part of
 * the trailing group there — so it passes false.
 */
function trailingGroupHeight(
  activity: PDFActivity,
  band: BandKey,
  isBreak: boolean,
  hasBonusChallenge: boolean,
  includeFunFact: boolean = true
): number {
  let h = 0;
  if (includeFunFact && activity.fun_fact) h += TRAILING_HEIGHT.funFact;
  if (hasBonusChallenge && band !== '6-8') h += TRAILING_HEIGHT.bonusChallenge;
  const encouragement = activity.encouragement?.trim();
  if (encouragement) h += TRAILING_HEIGHT.encouragement;
  else if (!isBreak) h += TRAILING_HEIGHT.selfAssessment;
  return h;
}

// ─── Math sections ────────────────────────────────────────────────────────────

function MathSections({
  instructions,
  colors,
  band,
  trailingReserve,
}: {
  instructions: string[];
  colors: ActivityColor;
  band: BandKey;
  trailingReserve: number;
}) {
  let quickCalcsLabel = 'Quick calculations';
  let quickCalcs: string[] = [];
  let wordProblems: string[] = [];
  let drawAndSolve = '';

  for (const step of instructions) {
    const colonIdx = step.indexOf(':');
    if (colonIdx === -1) continue;
    const label = step.slice(0, colonIdx).trim();
    const rest = step.slice(colonIdx + 1).trim();
    const upper = step.toUpperCase();

    if (upper.includes('QUICK CALCULATIONS')) {
      quickCalcsLabel = label;
      const cleaned = rest.replace(/^solve these problems:\s*/i, '');
      const byPipe = cleaned.split(' || ').map((s) => s.trim()).filter(Boolean);
      quickCalcs = byPipe.length > 1 ? byPipe : cleaned.split(' / ').map((s) => s.trim()).filter(Boolean);
    } else if (upper.includes('WORD PROBLEMS')) {
      const byPipe = rest.split(' || ').map((s) => s.trim()).filter(Boolean);
      wordProblems = byPipe.length > 1 ? byPipe : rest.split(' / ').map((s) => s.trim()).filter(Boolean);
    } else if (upper.includes('DRAW') && upper.includes('SOLVE')) {
      // Matches "DRAW & SOLVE", "DRAW AND SOLVE", "Draw & Solve", etc.
      drawAndSolve = rest;
    }
  }

  return (
    <>
      {/* Quick Calculations — 2-column grid. Chunk 9: label only, no filled
          bar, no brackets, colored to the activity family. */}
      <Text style={[styles.mathSectionLabel, { color: colors.label }]}>{quickCalcsLabel}</Text>
      <View style={styles.mathCalcGrid}>
        {quickCalcs.map((prob, i) => (
          <View key={i} style={styles.mathCalcCell}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={styles.mathCalcNumber}>{i + 1}.</Text>
              <Text style={[styles.mathCalcEquation, { fontSize: bandTable[band].quickCalcSize }]}>{prob}</Text>
            </View>
            <View style={styles.mathCalcAnswerLine} />
          </View>
        ))}
      </View>

      {/* Word Problems */}
      <Text style={[styles.mathSectionLabel, { color: colors.label }]}>Word problems</Text>
      {wordProblems.map((prob, i) => (
        <View
          wrap={false}
          key={i}
          minPresenceAhead={drawAndSolve === '' && i === wordProblems.length - 1 ? trailingReserve : undefined}
          style={[styles.mathWordBox, { flexGrow: 1, flexBasis: 'auto' }]}
        >
          <Text style={[styles.mathWordText, { fontSize: bandTable[band].bodySize }]}>{prob}</Text>
          <View style={[styles.answerLineGroup, { flexGrow: 1, marginTop: bandTable[band].answerLinePitch / 2, maxHeight: 2 * bandTable[band].answerLinePitch * 1.75 }]}>
            <View style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
            <View style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
          </View>
        </View>
      ))}

      {/* Draw & Solve — already wrap={false} as a whole unit (chunk 4), so
          it's a safe minPresenceAhead anchor despite the stretch drawBox
          inside it: unlike OpenWorkspaceTemplate's writing-lines/coloring
          blocks, this one was already atomic before chunk 8 touched it. */}
      {drawAndSolve !== '' && (
        <>
          <Text style={[styles.mathSectionLabel, { color: colors.label }]}>Draw & solve</Text>
          <View wrap={false} minPresenceAhead={trailingReserve} style={{ flexGrow: 1.4, flexBasis: 'auto' }}>
            <View style={styles.mathDrawPromptBubble}>
              <Text style={[styles.mathDrawPromptText, { fontSize: bandTable[band].bodySize }]}>{drawAndSolve}</Text>
            </View>
            <View style={[styles.mathDrawBox, { minHeight: bandTable[band].openAreaMinHeight, flexGrow: 1.4, flexBasis: 'auto', maxHeight: 340 }]}>
              <Text style={styles.mathDrawBoxLabel}>Draw here</Text>
            </View>
            <Text style={styles.mathAnswerLineLabel}>My answer:</Text>
            <View style={styles.mathAnswerLine} />
          </View>
        </>
      )}
    </>
  );
}

// ─── Child page footer ────────────────────────────────────────────────────────
// Spec 5.18 — every page of the child-facing packet (cover through
// celebration) reads "N of M", where M excludes the parent answer sheet
// (it's an appendix, not page M+1 of the packet). The parent sheet is always
// the last page in the Document when it renders, so a page's pageNumber from
// react-pdf's fixed/render callback is already correct as N without
// adjustment — only totalPages needs the -1 for M.
//
// Must be the FIRST child of its <Page> — placed last, react-pdf's fixed/
// render mechanism silently drops it from every page but the final one of a
// multi-page activity (confirmed by render-checking Stage 1's chunk 6 work).
//
// `inset` matches the host page's own content padding so the footer sits at
// that page's content edge rather than floating at a value borrowed from a
// different page's margins.

function ChildPageFooter({ hasParentSheet, inset }: { hasParentSheet: boolean; inset: number }) {
  return (
    <>
      <Text style={[styles.footerText, styles.childPageFooterLeft, { left: inset }]} fixed>
        Made with love by Packet Day · packetday.com
      </Text>
      <Text
        style={[styles.footerText, styles.childPageFooterRight, { right: inset }]}
        fixed
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} of ${hasParentSheet ? totalPages - 1 : totalPages}`
        }
      />
    </>
  );
}

// ─── Question bullet (chunk 9) ─────────────────────────────────────────────────
// Band-scaled color, extending the same principle already used for mascots
// (largest/most colorful for the youngest children): K-2 gets a filled
// circle in the family's chip color; 3-5 keeps the pre-chunk-9 light-fill-
// plus-border treatment; 6-8 drops the circle entirely for a plain bold
// number. Shared by WorksheetTemplate's non-math branch and ReadingTemplate
// so the two don't drift out of sync with each other.

function QuestionBullet({
  index,
  band,
  colors,
}: {
  index: number;
  band: BandKey;
  colors: ActivityColor;
}) {
  // The bullet must center on the FIRST LINE of its instruction text, not
  // align to the row's top edge — instructionRow uses alignItems:flex-start
  // so a naive marginTop leaves the bullet low whenever it's taller (circle
  // cases) or shorter (plain-number case) than one line of body text.
  // Computed from actual line-height in points rather than a flat guess,
  // since bodySize (and therefore line height) changes per band.
  const bodyLineHeightPt = bandTable[band].bodySize * typeScale.instruction.lineHeight;

  if (band === '6-8') {
    const numberLineHeightPt = typeScale.questionNumber.fontSize * typeScale.questionNumber.lineHeight;
    // Clamped to 0: a negative marginTop here (the number's line-height at
    // this band is already within ~1pt of the body text's) makes this Text
    // disappear entirely in this template's stretch-row layout — reproduces
    // on a fresh dev process, so it's a real react-pdf/Yoga quirk, not
    // staleness. The correction is sub-pixel either way, so losing it costs
    // nothing visible.
    return (
      <Text
        style={[
          styles.instructionBulletPlain,
          { color: colors.label, marginTop: Math.max(0, (bodyLineHeightPt - numberLineHeightPt) / 2) },
        ]}
      >
        {index + 1}.
      </Text>
    );
  }
  const size = bandTable[band].questionBulletSize;
  return (
    <View
      style={[
        styles.instructionBullet,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: band === 'K-2' ? (colors.chip ?? familyBg(colors)) : familyBg(colors),
          borderWidth: band === 'K-2' ? 1.5 : 1,
          borderColor: colors.label,
          marginTop: (bodyLineHeightPt - size) / 2,
        },
      ]}
    >
      <Text style={[styles.instructionBulletText, { color: colors.label }]}>{index + 1}</Text>
    </View>
  );
}

// ─── Template A — Worksheet ───────────────────────────────────────────────────

function WorksheetTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
  hasParentSheet,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  hasParentSheet: boolean;
}) {
  const band = bandForGrade(childGrade);
  const bc = getBandConfig(band);
  const answerLines = worksheetAnswerLines(band);
  const isMath = activity.subject.toLowerCase().includes('math');
  // Spec 6.4 / chunk 8 — reserve so the fun fact / bonus challenge / end-of-
  // activity callout can't land alone; see trailingGroupHeight's own comment.
  const trailingReserve = trailingGroupHeight(activity, band, false, true);

  return (
    <Page size="LETTER" experimentalPagination style={[styles.activityPage, { padding: bc.cardPad + 24 }]}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={styles.activityContent}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {/* Instructions */}
        {isMath ? (
          <MathSections instructions={activity.instructions} colors={colors} band={band} trailingReserve={trailingReserve} />
        ) : (
          <>
            <Text minPresenceAhead={90} style={[styles.instructionsLabel, { color: colors.label }]}>How to do it</Text>
            {activity.instructions.map((step, i) => (
              <View
                wrap={false}
                key={i}
                minPresenceAhead={i === activity.instructions.length - 1 ? trailingReserve : undefined}
                style={[styles.questionBox, { flexGrow: 1, flexBasis: 'auto' }]}
              >
                <View style={[styles.instructionRow, { marginBottom: 2 }]}>
                  <QuestionBullet index={i} band={band} colors={colors} />
                  <Text minPresenceAhead={60} style={[styles.instructionText, { fontSize: bandTable[band].bodySize }]}>{sanitizeText(step)}</Text>
                </View>
                <View style={[styles.answerLineGroup, { flexGrow: 1, marginTop: bandTable[band].answerLinePitch / 2, maxHeight: answerLines * bandTable[band].answerLinePitch * 1.75 }]}>
                  {Array.from({ length: answerLines }, (_, j) => (
                    <View key={j} style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} band={band} />}

        {/* Bonus challenge — only for K-5 */}
        {band !== '6-8' && (
          <View wrap={false} style={styles.bonusChallengeBox}>
            <Text style={styles.bonusChallengeHeader}>Bonus Challenge</Text>
            <Text style={[styles.bonusChallengeText, { fontSize: bandTable[band].calloutBodySize }]}>{bonusChallenge(activity.subject, activity.title)}</Text>
          </View>
        )}

        {/* End-of-activity callout — encouragement or self-assessment, with stars */}
        <EndOfActivityCallout activity={activity} isBreak={false} />
      </View>
    </Page>
  );
}

// ─── Template B — Reading Passage ─────────────────────────────────────────────

function ReadingTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
  hasParentSheet,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  hasParentSheet: boolean;
}) {
  const band = bandForGrade(childGrade);
  const bc = getBandConfig(band);
  // Spec 6.4 / chunk 8 — see trailingGroupHeight's comment. ReadingTemplate
  // never renders a bonus challenge.
  const trailingReserve = trailingGroupHeight(activity, band, false, false);

  let passage: string | null = null;
  let questions: string[];

  if (activity.passage) {
    passage = activity.passage;
    questions = activity.instructions;
  } else {
    const passageIndex = activity.instructions.findIndex((s) => s.length > 200);
    passage = passageIndex !== -1 ? activity.instructions[passageIndex] : null;
    questions = activity.instructions.filter((_, i) => i !== passageIndex);
  }

  return (
    <Page size="LETTER" style={[styles.activityPage, { padding: bc.cardPad + 24 }]}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={styles.activityContent}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {passage && (
          <View style={styles.readingPassageBlock}>
            <Text minPresenceAhead={90} style={[styles.readingPassageLabel, { color: colors.label }]}>Read this</Text>
            <Text style={[styles.readingPassageText, { fontSize: bandTable[band].passageSize, lineHeight: bandTable[band].passageLineHeight }]}>{sanitizeText(passage)}</Text>
          </View>
        )}

        {questions.length > 0 && (
          <Text minPresenceAhead={90} style={[styles.instructionsLabel, { color: colors.label }]}>Comprehension questions</Text>
        )}
        {questions.map((step, i) => (
          <View
            wrap={false}
            key={i}
            minPresenceAhead={i === questions.length - 1 ? trailingReserve : undefined}
            style={[styles.questionBox, { flexGrow: 1, flexBasis: 'auto' }]}
          >
            <View style={[styles.instructionRow, { marginBottom: 2 }]}>
              <QuestionBullet index={i} band={band} colors={colors} />
              <Text minPresenceAhead={60} style={[styles.instructionText, { fontSize: bandTable[band].bodySize }]}>{sanitizeText(step)}</Text>
            </View>
            <View style={[styles.answerLineGroup, { flexGrow: 1, marginTop: bandTable[band].answerLinePitch / 2, maxHeight: 2 * bandTable[band].answerLinePitch * 1.75 }]}>
              <View style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
              <View style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
            </View>
          </View>
        ))}

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} band={band} />}

        <EndOfActivityCallout activity={activity} isBreak={false} />
      </View>
    </Page>
  );
}

// ─── Template C — Open Workspace ──────────────────────────────────────────────

function OpenWorkspaceTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
  hasParentSheet,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  hasParentSheet: boolean;
}) {
  const band = bandForGrade(childGrade);
  const bc = getBandConfig(band);
  const contentType = resolveContentType(activity);
  const lineCount = writingLineCount(band);
  // Spec 6.4 / chunk 8 — see trailingGroupHeight's comment. OpenWorkspaceTemplate
  // never renders a bonus challenge. Only applied to the movement_activity
  // branch below: writing_prompt's writing lines and coloring's drawBox are
  // both un-atomic flexGrow stretch blocks (chunk 7 already declined to wrap
  // the former; the latter is the same shape), so there's no safe
  // wrap={false} anchor to attach this to for those two content types —
  // left unhandled, see chunk 8 report.
  const trailingReserve = trailingGroupHeight(activity, band, contentType === 'movement_activity', false);
  // Reflection lines are the one MAY STRETCH space on this page that passes
  // chunk 4's usable-or-symmetric test — a child actually writes between
  // them, unlike the step list above. Comfortable minimum pitch, scaled the
  // same way answerLinePitch is (a flat +8pt keeps the same per-band shape
  // while landing at ~34pt for 3-5, per spec).
  const reflectionLinePitch = bandTable[band].answerLinePitch + 8;
  // Modest headroom above the floor, not the old 1.75x-of-answerLinePitch —
  // see the maxHeight comment on movementReflectionBox below for why this
  // number alone doesn't tell the whole story.
  const reflectionGroupCap = 3 * reflectionLinePitch * 1.2;
  // movementReflectionLabel's own footprint (sectionLabel: 10pt font ×
  // 1.2 line-height = 12pt, plus its 10pt marginBottom) — needed so the
  // enclosing box's own maxHeight (below) can't exceed what its capped
  // content actually uses.
  const reflectionLabelHeight = 22;

  return (
    <Page size="LETTER" style={[styles.activityPage, { padding: bc.cardPad + 24 }]}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={styles.activityContent}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {/* Prompt bubble — chunk 9 stage 2: no container, band-scaled
            QuestionBullet instead of an inline "1. " prefix, matching stage
            1's question blocks rather than a second bullet implementation.
            movement_activity's steps used to be a MAY STRETCH group (each
            row an equal flexGrow share of a capped height, plus the
            enclosing box itself stretching) so five steps would spread down
            the page instead of bunching at the top. Chunk 9 sweep dropped
            both layers: per-row stretch made single-line steps trail a
            large empty gap while wrapped steps trailed almost none, and
            even after fixing that, a still-stretching promptBubble just
            moved the same slack to one gap after the last step. Per chunk
            4's own usable-or-symmetric test, this space fails both — a
            child never writes between steps — so it shouldn't stretch at
            all. Steps take their natural height; leftover page space
            collects at the bottom of the page as margin instead. */}
        <View wrap={contentType === 'movement_activity' ? false : true} style={styles.promptBubble}>
          {activity.instructions.map((step, i) => (
            <View key={i} style={[styles.instructionRow, { marginBottom: 8 }]}>
              <QuestionBullet index={i} band={band} colors={colors} />
              <Text style={[styles.promptInstructionText, { fontSize: bandTable[band].bodySize }]}>{sanitizeText(step)}</Text>
            </View>
          ))}
        </View>

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} band={band} />}

        {/* Response area */}
        {contentType === 'writing_prompt' && (
          <>
            <Text minPresenceAhead={90} style={[styles.writingSpaceHeader, { color: colors.label }]}>My writing space</Text>
            <View style={[styles.answerLineGroup, { flexGrow: 1, flexBasis: 'auto', maxHeight: lineCount * bandTable[band].answerLinePitch * 1.5 }]}>
              {Array.from({ length: lineCount }, (_, i) => (
                <View key={i} style={[styles.writingLine, styles.answerLineGroupLine, { marginBottom: 0 }]} />
              ))}
            </View>
          </>
        )}

        {contentType === 'movement_activity' && (
          // Chunk 9 follow-up — restored stretch here specifically, unlike
          // the step list above: this is the one space on the page a child
          // actually writes into, so chunk 4's usable-or-symmetric test
          // calls for it to stretch, not sit fixed.
          //
          // The first attempt at this gave the BOX flexGrow with no cap of
          // its own — it claimed its full share of the page's leftover
          // space regardless of the inner group's cap, so shrinking the
          // group just grew an invisible gap between the lines and the
          // encouragement callout below instead of releasing that space as
          // page-bottom margin. A flexGrow item always renders at its full
          // computed share unless something caps IT, not just its content.
          // Fixed by capping the box itself at exactly (label + group cap)
          // — its own flexGrow can't claim more than its capped content
          // can use, so genuine excess is left unclaimed by anything in
          // this column and trails after the encouragement callout as page
          // margin, the same way it does for the natural-height step list.
          <View
            wrap={false}
            minPresenceAhead={trailingReserve}
            style={[styles.movementReflectionBox, { flexGrow: 1, flexBasis: 'auto', maxHeight: reflectionLabelHeight + reflectionGroupCap }]}
          >
            <Text minPresenceAhead={90} style={[styles.movementReflectionLabel, { color: colors.label }]}>How did it go?</Text>
            <View style={[styles.answerLineGroup, { flexGrow: 1, maxHeight: reflectionGroupCap }]}>
              {Array.from({ length: 3 }, (_, i) => (
                <View key={i} style={[styles.movementReflectionLine, styles.answerLineGroupLine, { minHeight: reflectionLinePitch }]} />
              ))}
            </View>
          </View>
        )}

        {contentType === 'coloring' && (
          <View style={[styles.drawBox, { minHeight: bandTable[band].openAreaMinHeight, flexGrow: 1.4, flexBasis: 'auto', maxHeight: 340 }]}>
            <Text style={styles.drawBoxLabel}>Draw or write here</Text>
          </View>
        )}

        <EndOfActivityCallout activity={activity} isBreak={contentType === 'movement_activity'} />
      </View>
    </Page>
  );
}

// ─── Template D — Puzzle Break (Word Search) ──────────────────────────────────

function PuzzleBreakTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
  hasParentSheet,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  hasParentSheet: boolean;
}) {
  const band = bandForGrade(childGrade);
  const bc = getBandConfig(band);
  // gridSize is intentionally NOT bandTable[band].wordSearchGrid — see the
  // comment on that field in lib/pdf-tokens.ts for why. Only cell size (the
  // visual box each letter renders in) is band-driven; the grid stays 10x10
  // for every band since that's the only size that reliably places the
  // generator's actual word lengths without silently dropping words.
  const gridSize = 10;
  const cellSize = bandTable[band].wordSearchCell;
  // Spec 6.4 / chunk 8 — see trailingGroupHeight's comment. PuzzleBreakTemplate
  // never renders a bonus challenge, is always a break (no self-assessment,
  // only shows if there's encouragement text), and its fun fact box isn't
  // part of the trailing group here (see includeFunFact).
  const trailingReserve = trailingGroupHeight(activity, band, true, false, false);

  const { grid, placed } = generateWordSearch(activity.instructions, gridSize);

  return (
    <Page size="LETTER" style={[styles.activityPage, { padding: bc.cardPad + 24 }]}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={styles.activityContent}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} band={band} />}

        {/* Word search grid — wrap={false} + minPresenceAhead so this,
            not the word list below it, is the block that moves whole when
            "Find these words:" + the chips + the callout don't fit: those
            three landing alone on a near-empty page was the chunk 7 sweep's
            K-2/6-8 finding (11.6%/19.1%/etc). The grid is what precedes that
            trailing group, so it's the anchor, not a member of the group. */}
        <View wrap={false} minPresenceAhead={trailingReserve} style={styles.wordSearchGrid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.wordSearchRow}>
              {row.map((letter, c) => (
                <View key={c} style={[styles.wordSearchCell, { width: cellSize, height: cellSize }]}>
                  <Text style={[styles.wordSearchLetter, { fontSize: bandTable[band].wordSearchCellFontSize }]}>{letter}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Word list — wrap={false} so a longer word list (6-10 words,
            generator-driven, not band-capped — see chunk 6) can't split
            mid-row across pages. Latent correctness gap, not the near-empty
            trailing page this chunk found; that block already moves whole
            with no unguarded splitting, it's just genuinely small. */}
        <Text minPresenceAhead={90} style={[styles.wordListLabel, { color: colors.label }]}>Find these words</Text>
        <View wrap={false} style={styles.wordListGrid}>
          {placed.map((word, i) => (
            <View key={i} style={[styles.wordListItem, { backgroundColor: colors.chip ?? color.creamPanel, borderColor: colors.rule }]}>
              <Text style={[styles.wordListText, { color: colors.label }]}>{word}</Text>
            </View>
          ))}
        </View>

        <EndOfActivityCallout activity={activity} isBreak={true} />
      </View>
    </Page>
  );
}

// ─── Activity page dispatcher ─────────────────────────────────────────────────

function ActivityPage({
  activity,
  childName,
  childGrade,
  mascotImageUrl,
  hasParentSheet,
}: {
  activity: PDFActivity;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  hasParentSheet: boolean;
}) {
  const contentType = resolveContentType(activity);
  const colors = accentFamily[familyForActivity(contentType)];

  const sharedProps = { activity, colors, childName, childGrade, mascotImageUrl, hasParentSheet };

  if (contentType === 'reading_passage')  return <ReadingTemplate {...sharedProps} />;
  if (contentType === 'puzzle_break')     return <PuzzleBreakTemplate {...sharedProps} />;
  if (contentType === 'writing_prompt' || contentType === 'movement_activity' || contentType === 'coloring') {
    return <OpenWorkspaceTemplate {...sharedProps} />;
  }
  return <WorksheetTemplate {...sharedProps} />;
}

// ─── Certificate page ─────────────────────────────────────────────────────────

function CertificatePage({
  childName,
  childGrade,
  title,
  createdAt,
  mascotImageUrl,
  mascotName,
  activities,
}: {
  childName: string;
  childGrade: string;
  title: string;
  createdAt: string;
  mascotImageUrl?: string | null;
  mascotName?: string | null;
  activities: PDFActivity[];
}) {
  const band = bandForGrade(childGrade);
  const hasParentSheet = activities.some((a) => !!a.answer_key);
  const totalMinutes = activities.reduce((s, a) => s + a.estimated_minutes, 0);
  const childFirstName = firstNameOnly(childName);
  const mascotSignoff = mascotName
    ? `${sanitizeText(mascotName)} is proud of you, ${childFirstName}.`
    : `We're proud of you, ${childFirstName}.`;

  return (
    <Page size="LETTER" style={styles.certificatePage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={56} />

      {/* Decorative frames */}
      <View style={styles.certFrameOuter} />
      <View style={styles.certFrameInner} />

      {/* Certificate frame content — spec section 6, MAY STRETCH weight 1,
          cap 640pt. certificatePage's own justifyContent:'center' becomes
          the fallback once this wrapper hits its cap: any height beyond
          640pt shows up as symmetric margin around the wrapper instead of
          the wrapper itself growing further. */}
      <View style={{ flexGrow: 1, flexBasis: 'auto', maxHeight: 640, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <Text style={styles.certEyebrow}>Certificate of completion</Text>

        {mascotImageUrl && (
          <Image
            src={mascotImageUrl}
            style={[styles.certMascotImage, { width: bandTable[band].certificateMascot, height: bandTable[band].certificateMascot }]}
          />
        )}

        <Text style={styles.certPresented}>This certifies that</Text>
        <Text style={styles.certChildName}>{sanitizeText(childName)}</Text>
        <Text style={styles.certBody}>has completed all activities in</Text>
        {/* Day title (props.title), not theme — the previous version used
            theme here, which reads as a shorter category name rather than
            the actual day's title. Known generator-side quirk where
            packet_title can end up equal to theme; not fixed here, this is
            a template fix (use the field the rest of the packet already
            treats as the day title, e.g. the cover page's title). */}
        <Text style={styles.certDayTitle}>{sanitizeText(title)}</Text>

        <View style={styles.certDivider} />
        <Text style={styles.certDateLine}>
          {formatPDFDate(createdAt)} · {activities.length} {activities.length === 1 ? 'activity' : 'activities'} · {totalMinutes} min
        </Text>

        {/* Signature row — two blocks side by side (grown-up + child), plus
            a separate date line beneath rather than a third column: three
            signature blocks in one row read as too tight at this width. */}
        <View style={styles.certSignatureRow}>
          <View style={styles.certSignatureBlock}>
            <View style={styles.certSignatureLine} />
            <Text style={styles.certSignatureLabel}>Grown-up signature</Text>
          </View>
          <View style={styles.certSignatureBlock}>
            <View style={styles.certSignatureLine} />
            <Text style={styles.certSignatureLabel}>Child signature</Text>
          </View>
        </View>
        <View style={styles.certSignatureDateBlock}>
          <View style={styles.certSignatureLine} />
          <Text style={styles.certSignatureLabel}>Date</Text>
        </View>

        {/* Mascot sign-off — falls back to a generic (non-mascot) line when
            mascotName is missing, rather than rendering a broken sentence. */}
        <Text style={styles.certSignoff}>{mascotSignoff}</Text>
      </View>
    </Page>
  );
}

// ─── Parent notes page ────────────────────────────────────────────────────────

function ParentNotesPage({
  childName,
  childGrade,
  theme,
  activities,
  mascotImageUrl,
  parentNotes,
}: PacketPDFProps) {
  const band = bandForGrade(childGrade);
  const hasAnswerKeys = activities.some((a) => !!a.answer_key);
  const noteBody = sanitizeText(parentNotes) || parentNote(childName, theme);
  const answerKeySentence = hasAnswerKeys
    ? ` Answer keys are on the last page — a separate parent sheet you don't need to print for ${childName}.`
    : '';
  return (
    <Page size="LETTER" style={styles.notesPage}>
      <ChildPageFooter hasParentSheet={hasAnswerKeys} inset={48} />

      {mascotImageUrl && (
        <Image src={mascotImageUrl} style={styles.mascotImageNotes} />
      )}

      <Text style={styles.notesPageTitle}>Today at a Glance</Text>
      <Text style={[styles.notesPageSubtitle, { fontSize: bandTable[band].bodySize }]}>
        {activities.length} activities  ·  {activities.reduce((s, a) => s + a.estimated_minutes, 0)} min total
      </Text>

      <Text style={styles.sectionLabel}>Activity Summary</Text>
      {/* Spec section 6 — "Parent-sheet key stack", MAY STRETCH weight 1, no
          cap. Distributes leftover height as wider gaps between rows rather
          than leaving it as a void before "A Note for You". */}
      <View style={{ flexGrow: 1, flexBasis: 'auto', justifyContent: 'space-between' }}>
        {activities.map((activity, i) => {
          const colors = familyColorsForActivity(activity);
          return (
            <View key={i} style={[styles.summaryRow, { marginBottom: 0 }]}>
              <View style={[styles.summaryColorDot, { backgroundColor: colors.label }]} />
              <Text style={[styles.summaryText, { fontSize: bandTable[band].bodySize }]}>
                <Text style={{ fontFamily: 'Fraunces', fontWeight: 700 }}>{activity.subject}: </Text>
                {activity.title}
              </Text>
              {/* Rounded up to the nearest 10 min for at-a-glance scanning —
                  never the exact figure from the underlying data (used
                  as-is in the header total above and each activity's own
                  page header). */}
              <Text style={styles.summaryDuration}>{roundUpToNearestTen(activity.estimated_minutes)} min</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 22, marginBottom: 6 }}>
        <Text style={styles.sectionLabel}>A Note for You</Text>
      </View>
      <View style={styles.parentNoteBox}>
        <Text style={styles.parentNoteText}>
          {noteBody}{answerKeySentence}
        </Text>
      </View>

      {/* Spec 7.4 PUSH OR SPLIT. Without wrap={false} here, react-pdf's
          default reflow split this block wherever it ran out of room on the
          page, once stranding 7 of 8 lines on one page and the label-less
          8th alone on an otherwise-blank next page. wrap={false} fixes the
          split, but an 8-line (~216pt) block still didn't fit in what page 2
          had left (already at 96% before this block), so it pushed whole to
          its own page at only 30% fill — legal per PUSH OR SPLIT, but still
          a near-empty sheet to print. Cut to 4 lines (~120pt) instead of
          reaching for PULL FORWARD: less content, not smarter pagination.
          Verified this fits on page 2 — see chunk 7 commit for the
          measurement. */}
      <View wrap={false}>
        <Text style={styles.observationsLabel}>My Observations</Text>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={styles.ruledLine} />
        ))}
      </View>
    </Page>
  );
}

// ─── Coloring page ────────────────────────────────────────────────────────────

function ColoringPage({
  coloringPage,
  coloringImageUrl,
  mascotImageUrl,
  childGrade,
  activities,
}: {
  coloringPage: PDFColoringPage;
  coloringImageUrl?: string | null;
  mascotImageUrl?: string | null;
  childGrade: string;
  activities: PDFActivity[];
}) {
  const band = bandForGrade(childGrade);
  const imageUrl = coloringImageUrl ?? mascotImageUrl ?? null;
  const hasParentSheet = activities.some((a) => !!a.answer_key);
  return (
    <Page size="LETTER" style={styles.coloringPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={48} />
      <Text style={styles.coloringHeaderText}>Color me!</Text>
      <Text style={styles.coloringTitle}>{sanitizeText(coloringPage.title)}</Text>
      <View style={styles.coloringBox}>
        {imageUrl ? (
          <Image src={imageUrl} style={styles.coloringBoxImage} />
        ) : (
          <Text style={styles.coloringBoxPlaceholder}>Draw your scene here!</Text>
        )}
      </View>
      <View style={styles.coloringInstructionBubble}>
        <Text style={[styles.coloringInstructionText, { fontSize: bandTable[band].bodySize }]}>{sanitizeText(coloringPage.instructions)}</Text>
      </View>
    </Page>
  );
}

// ─── Celebration / reflection page ────────────────────────────────────────────

function CelebrationPage({
  childGrade,
  theme,
  activities,
  dailyReflection,
  packetCelebration,
  mascotName,
  mascotImageUrl,
}: PacketPDFProps) {
  const band = bandForGrade(childGrade);
  const hasParentSheet = activities.some((a) => !!a.answer_key);
  return (
    <Page size="LETTER" style={styles.notesPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={48} />
      <Text style={styles.notesPageTitle}>Daily Reflection</Text>
      <Text style={styles.notesPageSubtitle}>Take a moment to think about today&apos;s learning.</Text>
      <View style={styles.dailyReflectionRule} />

      {/* Celebration message from mascot — mascot image + eyebrow/text
          column, spec 5.16. Falls back to text-only (no image) when
          mascotImageUrl is missing. */}
      {packetCelebration && (
        <View style={styles.celebrationBox}>
          <View style={styles.celebrationRow}>
            {mascotImageUrl && (
              <Image
                src={mascotImageUrl}
                style={[styles.celebrationMascotImage, { width: bandTable[band].reflectionMascot, height: bandTable[band].reflectionMascot }]}
              />
            )}
            <View style={styles.celebrationTextCol}>
              <Text style={styles.celebrationLabel}>{mascotName ? mascotName + ' says:' : 'Great work!'}</Text>
              <Text style={styles.celebrationText}>{sanitizeText(packetCelebration)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Reflection question — flattened, no border/background; the ruled
          lines below already mark it as a writing area. */}
      <View style={styles.reflectionBox}>
        <Text style={styles.reflectionLabel}>Today&apos;s Question</Text>
        <Text style={[styles.reflectionText, { fontSize: bandTable[band].calloutBodySize }]}>
          {sanitizeText(dailyReflection) || reflectionQuestion(theme)}
        </Text>
      </View>

      {/* Writing lines — spec 7.4 PUSH OR SPLIT, same fix as ParentNotesPage's
          My Observations group: ~216pt, well under the 55% threshold, so it
          must move whole rather than let react-pdf's default reflow split
          it wherever it happens to run out of room. */}
      <View wrap={false}>
        {Array.from({ length: 8 }, (_, i) => (
          <View key={i} style={styles.ruledLine} />
        ))}
      </View>

      {/* Hidden mascot hunt prompt */}
      {mascotImageUrl && mascotName && (
        <View style={styles.mascotHuntBox}>
          <Text style={[styles.mascotHuntText, { fontSize: bandTable[band].calloutBodySize }]}>
            Did you spot {sanitizeText(mascotName)} along the way? Go back and find every page where they show up.
          </Text>
        </View>
      )}
    </Page>
  );
}

// ─── Parent answer sheet ──────────────────────────────────────────────────────
// Spec 5.18 — every answer key in the packet, moved off the child-facing
// activity pages and gathered here as a single appendix at the very back of
// the document. Only renders when at least one activity has an answer_key.

function ParentAnswerSheetPage({ childName, activities }: { childName: string; activities: PDFActivity[] }) {
  const withKeys = activities.filter((a) => !!a.answer_key);
  if (withKeys.length === 0) return null;

  const childFirstName = firstNameOnly(childName);

  return (
    <Page size="LETTER" style={styles.parentSheetPage}>
      <View style={styles.parentSheetHeaderRow}>
        <View style={styles.parentSheetHeaderLeft}>
          <Text style={styles.parentSheetEyebrow}>For grown-ups only</Text>
          <Text style={styles.parentSheetTitle}>Answer key and teaching notes</Text>
        </View>
        <Text style={styles.parentSheetHeaderRight}>Parent sheet</Text>
      </View>
      <View style={styles.parentSheetRule} />

      <View style={styles.parentSheetBanner}>
        <Text style={styles.parentSheetBannerText}>
          <Text style={{ fontWeight: 700 }}>You do not need to print this page for {childFirstName}.</Text>
          {' '}Keep it on your phone or print it separately.
        </Text>
      </View>

      <View style={styles.parentSheetKeyStack}>
        {withKeys.flatMap((activity, i) => {
          const isMath = activity.subject.toLowerCase().includes('math');
          const mathSections = isMath ? parseMathAnswerKey(sanitizeText(activity.answer_key)) : null;

          const group = (
            <View key={`group-${i}`} wrap={false} style={styles.parentSheetGroup}>
              <Text style={styles.parentSheetSubject}>{sanitizeText(activity.subject)}</Text>
              {mathSections ? (
                <View style={styles.parentSheetMathStack}>
                  <Text style={styles.parentSheetAnswerBody}>
                    <Text style={styles.parentSheetAnswerLabel}>Quick calculations: </Text>
                    {mathSections.quickCalculations}
                  </Text>
                  <Text style={styles.parentSheetAnswerBody}>
                    <Text style={styles.parentSheetAnswerLabel}>Word problems: </Text>
                    {mathSections.wordProblems}
                  </Text>
                  <Text style={styles.parentSheetAnswerBody}>
                    <Text style={styles.parentSheetAnswerLabel}>Draw and solve: </Text>
                    {mathSections.drawAndSolve}
                  </Text>
                </View>
              ) : (
                <Text style={styles.parentSheetAnswerBody}>{sanitizeText(activity.answer_key)}</Text>
              )}
            </View>
          );
          if (i === 0) return [group];
          return [<View key={`div-${i}`} style={styles.parentSheetDivider} />, group];
        })}
      </View>

      <View style={styles.parentSheetFooter} fixed>
        <Text style={styles.footerText}>Made with love by Packet Day · packetday.com</Text>
        <Text style={styles.footerText}>Parent sheet · not part of the packet</Text>
      </View>
    </Page>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PacketPDF(props: PacketPDFProps) {
  const hasParentSheet = props.activities.some((a) => !!a.answer_key);
  return (
    <Document
      title={props.title}
      author="Packet Day"
      subject={`${props.theme} · ${props.childName}`}
      creator="packetday.com"
    >
      <CoverPage {...props} />
      <ParentNotesPage {...props} />
      {props.activities.map((activity, i) => (
        <ActivityPage
          key={i}
          activity={activity}
          childName={props.childName}
          childGrade={props.childGrade}
          mascotImageUrl={props.mascotImageUrl}
          hasParentSheet={hasParentSheet}
        />
      ))}
      <CertificatePage
        childName={props.childName}
        childGrade={props.childGrade}
        title={props.title}
        createdAt={props.createdAt}
        mascotImageUrl={props.mascotImageUrl}
        mascotName={props.mascotName}
        activities={props.activities}
      />
      {props.coloringPage && (
        <ColoringPage
          coloringPage={props.coloringPage}
          coloringImageUrl={props.coloringImageUrl}
          mascotImageUrl={props.mascotImageUrl}
          childGrade={props.childGrade}
          activities={props.activities}
        />
      )}
      <CelebrationPage {...props} />
      <ParentAnswerSheetPage childName={props.childName} activities={props.activities} />
    </Document>
  );
}

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
  borderW: number;    // border width
}

// Font-size fields (body, instrBody) moved to lib/pdf-tokens.ts's band table
// in Stage 3 of the PDF token rebuild — these remaining fields are layout
// values, out of scope for that migration. Line pitch now comes from
// bandTable[band].answerLinePitch (chunk 4) — see the stretch-group caps.
function getBandConfig(band: 'K-2' | '3-5' | '6-8'): BandConfig {
  const configs: Record<'K-2' | '3-5' | '6-8', BandConfig> = {
    'K-2': { cardPad: 14, cardRadius: 14, borderW: 3 },
    '3-5': { cardPad: 12, cardRadius: 10, borderW: 2 },
    '6-8': { cardPad: 10, cardRadius: 8, borderW: 1.5 },
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

function resolveContentType(activity: PDFActivity): ContentType {
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Page base ───────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: color.page,
    padding: 48,
    flexDirection: 'column',
    justifyContent: 'space-between',
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
    flex: 1,
    justifyContent: 'center',
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
  coverSubtitle: {
    ...typeStyle(typeScale.footerText),
    color: color.textSecondary,
    textAlign: 'center',
  },

  // ── Cover: activity count badge ─────────────────────────────────────────────
  activityBadge: {
    backgroundColor: color.honey,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    alignSelf: 'center',
  },
  activityBadgeText: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 12,
    color: color.page,
    letterSpacing: 0.2,
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


  // ── Activity page ───────────────────────────────────────────────────────────
  activityPage: {
    flexDirection: 'column',
    backgroundColor: color.page,
  },
  activityContent: {
    padding: 36,
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
  questionBox: {
    backgroundColor: color.page,
    borderRadius: 10,
    padding: 12,
    paddingBottom: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: color.faintDivider,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  instructionBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    marginTop: 1,
  },
  instructionBulletText: {
    ...typeStyle(typeScale.questionNumber),
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
  childPageFooter: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  readingPassageBlock: {
    backgroundColor: color.creamPanel,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    flexGrow: 1,
    flexBasis: 'auto',
  },
  readingPassageLabel: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.honeyDark,
    marginBottom: 8,
  },
  readingPassageText: {
    ...typeStyle(typeScale.readingPassage),
    color: color.textPrimary,
    fontStyle: 'italic',
  },

  // ── Open workspace (writing / movement / coloring) ───────────────────────────
  promptBubble: {
    borderWidth: 1.5,
    borderColor: color.faintDivider,
    borderRadius: 12,
    padding: 14,
    backgroundColor: color.page,
    marginBottom: 14,
  },
  promptInstructionText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    marginTop: 6,
  },
  writingSpaceHeader: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textSecondary,
    marginBottom: 12,
  },
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
  movementReflectionBox: {
    borderWidth: 1.5,
    borderColor: color.answerRule,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    backgroundColor: color.creamPanel,
  },
  movementReflectionLabel: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textSecondary,
    marginBottom: 10,
  },
  movementReflectionLine: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: color.answerRule,
    marginBottom: 22,
  },

  // ── Math structured sections ─────────────────────────────────────────────────
  mathSectionBar: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
    marginTop: 10,
  },
  mathSectionBarText: {
    ...typeStyle(typeScale.calloutEyebrow),
    color: color.page,
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
  mathWordBox: {
    backgroundColor: color.creamPanel,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: color.faintDivider,
  },
  mathWordText: {
    ...typeStyle(typeScale.instruction),
    color: color.textPrimary,
    marginBottom: 6,
  },
  mathDrawPromptBubble: {
    borderWidth: 1.5,
    borderColor: color.faintDivider,
    borderRadius: 10,
    padding: 12,
    backgroundColor: color.page,
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
    color: color.textSecondary,
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
  certHeader: {
    ...typeStyle(typeScale.sectionLabel),
    color: color.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
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
  certTheme: {
    ...typeStyle(typeScale.certificateDayTitle),
    color: color.honey,
    textAlign: 'center',
    marginBottom: 24,
  },
  certDivider: {
    width: 200,
    height: 2,
    backgroundColor: color.honey,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 24,
    alignSelf: 'center',
  },
  certDateLine: {
    ...typeStyle(typeScale.footerText),
    color: color.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
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
  reflectionBox: {
    backgroundColor: color.honeyTint,
    borderWidth: 2.5,
    borderColor: color.honey,
    borderRadius: 12,
    padding: 22,
    marginBottom: 22,
  },
  reflectionLabel: {
    ...typeStyle(typeScale.calloutEyebrow),
    color: color.honeyDark,
    marginBottom: 10,
  },
  reflectionText: {
    ...typeStyle(typeScale.calloutBody),
    color: color.textPrimary,
    fontStyle: 'italic',
  },
  celebrationBox: {
    backgroundColor: color.sageTint,
    borderWidth: 2,
    borderColor: color.sage,
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
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
  coloringHeaderText: {
    ...typeStyle(typeScale.sectionLabel),
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

      {/* Center block */}
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

        <Text style={styles.coverSubtitle}>
          {childName}&apos;s Learning Adventure
        </Text>

        {/* Activity count badge */}
        <View style={styles.activityBadge}>
          <Text style={styles.activityBadgeText}>
            {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'} · {totalMinutes} min
          </Text>
        </View>

        {/* Mission / greeting box */}
        <View style={styles.greetingBox}>
          {packetMission ? (
            <Text style={styles.greetingLabel}>Your Mission Today</Text>
          ) : null}
          <Text style={styles.greetingText}>{missionText}</Text>
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

// ─── Math sections ────────────────────────────────────────────────────────────

function MathSections({
  instructions,
  colors,
  band,
}: {
  instructions: string[];
  colors: ActivityColor;
  band: BandKey;
}) {
  let quickCalcsLabel = 'Quick Calculations';
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
      {/* Quick Calculations — 2-column grid */}
      <View style={[styles.mathSectionBar, { backgroundColor: colors.label }]}>
        <Text style={styles.mathSectionBarText}>{'[ ' + quickCalcsLabel + ' ]'}</Text>
      </View>
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
      <View style={[styles.mathSectionBar, { backgroundColor: colors.label }]}>
        <Text style={styles.mathSectionBarText}>{'[ Word Problems ]'}</Text>
      </View>
      {wordProblems.map((prob, i) => (
        <View wrap={false} key={i} style={[styles.mathWordBox, { flexGrow: 1, flexBasis: 'auto' }]}>
          <Text style={[styles.mathWordText, { fontSize: bandTable[band].bodySize }]}>{prob}</Text>
          <View style={[styles.answerLineGroup, { flexGrow: 1, marginTop: bandTable[band].answerLinePitch / 2, maxHeight: 2 * bandTable[band].answerLinePitch * 1.75 }]}>
            <View style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
            <View style={[styles.answerLineInBox, styles.answerLineGroupLine, { marginTop: 0 }]} />
          </View>
        </View>
      ))}

      {/* Draw & Solve */}
      {drawAndSolve !== '' && (
        <>
          <View style={[styles.mathSectionBar, { backgroundColor: colors.label }]}>
            <Text style={styles.mathSectionBarText}>{'[ Draw & Solve ]'}</Text>
          </View>
          <View wrap={false} style={{ flexGrow: 1.4, flexBasis: 'auto' }}>
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
    <View style={[styles.childPageFooter, { left: inset, right: inset }]} fixed>
      <Text style={styles.footerText}>Made with love by Packet Day · packetday.com</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} of ${hasParentSheet ? totalPages - 1 : totalPages}`
        }
      />
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

  return (
    <Page size="LETTER" experimentalPagination style={styles.activityPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {/* Instructions */}
        {isMath ? (
          <MathSections instructions={activity.instructions} colors={colors} band={band} />
        ) : (
          <>
            <Text minPresenceAhead={90} style={styles.instructionsLabel}>{'[ How to do it ]'}</Text>
            {activity.instructions.map((step, i) => (
              <View wrap={false} key={i} style={[styles.questionBox, { borderRadius: bc.cardRadius, borderWidth: bc.borderW, borderColor: colors.rule + '33', flexGrow: 1, flexBasis: 'auto' }]}>
                <View style={[styles.instructionRow, { marginBottom: 2 }]}>
                  <View style={[styles.instructionBullet, { backgroundColor: familyBg(colors), borderWidth: 1, borderColor: colors.label }]}>
                    <Text style={[styles.instructionBulletText, { color: colors.label }]}>{i + 1}</Text>
                  </View>
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
    <Page size="LETTER" style={styles.activityPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {passage && (
          <View style={[styles.readingPassageBlock, { borderLeftWidth: 4, borderLeftColor: colors.rule, borderRadius: bc.cardRadius }]}>
            <Text minPresenceAhead={90} style={styles.readingPassageLabel}>{'[ Read This ]'}</Text>
            <Text style={[styles.readingPassageText, { fontSize: bandTable[band].passageSize, lineHeight: bandTable[band].passageLineHeight }]}>{sanitizeText(passage)}</Text>
          </View>
        )}

        {questions.length > 0 && (
          <Text minPresenceAhead={90} style={styles.instructionsLabel}>{'[ Comprehension Questions ]'}</Text>
        )}
        {questions.map((step, i) => (
          <View wrap={false} key={i} style={[styles.questionBox, { borderRadius: bc.cardRadius, borderWidth: bc.borderW, borderColor: colors.rule + '33', flexGrow: 1, flexBasis: 'auto' }]}>
            <View style={[styles.instructionRow, { marginBottom: 2 }]}>
              <View style={[styles.instructionBullet, { backgroundColor: familyBg(colors), borderWidth: 1, borderColor: colors.label }]}>
                <Text style={[styles.instructionBulletText, { color: colors.label }]}>{i + 1}</Text>
              </View>
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

  return (
    <Page size="LETTER" style={styles.activityPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {/* Prompt bubble — for movement_activity, the numbered steps are a
            MAY STRETCH "Movement step list" (weight 1, cap = steps × 44pt);
            for every other content type the prompt text stays fixed. */}
        {contentType === 'movement_activity' ? (
          <View wrap={false} style={[styles.promptBubble, { borderRadius: bc.cardRadius, flexGrow: 1, flexBasis: 'auto' }]}>
            <View style={[styles.answerLineGroup, { flexGrow: 1, maxHeight: activity.instructions.length * 44 }]}>
              {activity.instructions.map((step, i) => (
                <Text key={i} style={[styles.promptInstructionText, { fontSize: bandTable[band].bodySize, marginTop: 0, flexGrow: 1, flexBasis: 'auto' }]}>
                  {i + 1}. {sanitizeText(step)}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.promptBubble, { borderRadius: bc.cardRadius }]}>
            {activity.instructions.map((step, i) => (
              <Text key={i} style={[styles.promptInstructionText, { fontSize: bandTable[band].bodySize }]}>
                {i + 1}. {sanitizeText(step)}
              </Text>
            ))}
          </View>
        )}

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} band={band} />}

        {/* Response area */}
        {contentType === 'writing_prompt' && (
          <>
            <Text minPresenceAhead={90} style={styles.writingSpaceHeader}>My Writing Space</Text>
            <View style={[styles.answerLineGroup, { flexGrow: 1, flexBasis: 'auto', maxHeight: lineCount * bandTable[band].answerLinePitch * 1.5 }]}>
              {Array.from({ length: lineCount }, (_, i) => (
                <View key={i} style={[styles.writingLine, styles.answerLineGroupLine, { marginBottom: 0 }]} />
              ))}
            </View>
          </>
        )}

        {contentType === 'movement_activity' && (
          <View wrap={false} style={[styles.movementReflectionBox, { flexGrow: 1, flexBasis: 'auto' }]}>
            <Text minPresenceAhead={90} style={styles.movementReflectionLabel}>How did it go?</Text>
            <View style={[styles.answerLineGroup, { flexGrow: 1, maxHeight: 3 * bandTable[band].answerLinePitch * 1.75 }]}>
              {Array.from({ length: 3 }, (_, i) => (
                <View key={i} style={[styles.movementReflectionLine, styles.answerLineGroupLine, { marginBottom: 0 }]} />
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

  const { grid, placed } = generateWordSearch(activity.instructions, gridSize);

  return (
    <Page size="LETTER" style={styles.activityPage}>
      <ChildPageFooter hasParentSheet={hasParentSheet} inset={bc.cardPad + 24} />
      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        <ActivityHeader activity={activity} colors={colors} />
        <CharacterStrip activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} band={band} />}

        {/* Word search grid */}
        <View style={styles.wordSearchGrid}>
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

        {/* Word list */}
        <Text minPresenceAhead={90} style={styles.wordListLabel}>Find these words:</Text>
        <View style={styles.wordListGrid}>
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
  theme,
  createdAt,
  mascotImageUrl,
  activities,
}: {
  childName: string;
  theme: string;
  createdAt: string;
  mascotImageUrl?: string | null;
  activities: PDFActivity[];
}) {
  const hasParentSheet = activities.some((a) => !!a.answer_key);
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
        {/* Trophy star SVG */}
        <View style={{ marginBottom: 16 }}>
          <Svg width={48} height={48} viewBox="0 0 24 24">
            <Polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={color.honey}
              stroke={color.honeyDark}
              strokeWidth="0.5"
            />
          </Svg>
        </View>

        <Text style={styles.certHeader}>Certificate of Completion</Text>
        <Text style={styles.certPresented}>This certifies that</Text>
        <Text style={styles.certChildName}>{sanitizeText(childName)}</Text>
        <Text style={styles.certBody}>has successfully completed all activities in</Text>
        <Text style={styles.certTheme}>{sanitizeText(theme)}</Text>

        <View style={styles.certDivider} />
        <Text style={styles.certDateLine}>{formatPDFDate(createdAt)}</Text>

        {/* Signature lines */}
        <View style={styles.certSignatureRow}>
          <View style={styles.certSignatureBlock}>
            <View style={styles.certSignatureLine} />
            <Text style={styles.certSignatureLabel}>Grown-up Signature</Text>
          </View>
        </View>
      </View>

      {/* Small mascot at bottom */}
      {mascotImageUrl && (
        <Image src={mascotImageUrl} style={{ position: 'absolute', bottom: 48, right: 48, width: 64, height: 64, borderRadius: 32, opacity: 0.8 }} />
      )}
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
                {activity.title} — {activity.estimated_minutes} min
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                {[0, 1, 2, 3, 4].map((j) => (
                  <View key={j} style={{ width: 10, height: 10, borderWidth: 1.5, borderColor: colors.label, borderRadius: 2, marginLeft: 5 }} />
                ))}
              </View>
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

      <Text style={styles.observationsLabel}>My Observations</Text>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={styles.ruledLine} />
      ))}
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

      {/* Celebration message from mascot */}
      {packetCelebration && (
        <View style={styles.celebrationBox}>
          <Text style={styles.celebrationLabel}>{mascotName ? mascotName + ' says:' : 'Great work!'}</Text>
          <Text style={styles.celebrationText}>{sanitizeText(packetCelebration)}</Text>
        </View>
      )}

      {/* Reflection question */}
      <View style={styles.reflectionBox}>
        <Text style={styles.reflectionLabel}>Today&apos;s Question</Text>
        <Text style={[styles.reflectionText, { fontSize: bandTable[band].calloutBodySize }]}>
          {sanitizeText(dailyReflection) || reflectionQuestion(theme)}
        </Text>
      </View>

      {/* Writing lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={styles.ruledLine} />
      ))}

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

function ParentAnswerSheetPage({ activities }: { activities: PDFActivity[] }) {
  const withKeys = activities.filter((a) => !!a.answer_key);
  if (withKeys.length === 0) return null;

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
          <Text style={{ fontWeight: 700 }}>You do not need to print this page.</Text>
          {' '}Keep it on your phone or print it separately.
        </Text>
      </View>

      <View style={styles.parentSheetKeyStack}>
        {withKeys.flatMap((activity, i) => {
          const group = (
            <View key={`group-${i}`} wrap={false} style={styles.parentSheetGroup}>
              <Text style={styles.parentSheetSubject}>{sanitizeText(activity.subject)}</Text>
              <Text style={styles.parentSheetAnswerBody}>{sanitizeText(activity.answer_key)}</Text>
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
        theme={props.theme}
        createdAt={props.createdAt}
        mascotImageUrl={props.mascotImageUrl}
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
      <ParentAnswerSheetPage activities={props.activities} />
    </Document>
  );
}

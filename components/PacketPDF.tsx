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

// ─── Font registration ─────────────────────────────────────────────────────────

Font.register({
  family: 'Nunito',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Regular.ttf'), fontWeight: 400 },
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
  ],
});

// Disable auto-hyphenation globally — titles and content should break on whole words only.
Font.registerHyphenationCallback((word) => [word]);

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  cream:    '#FFF8F0',
  charcoal: '#3A3633',
  warmGray: '#6B6460',
  border:   '#DDD5CC',
  white:    '#FFFFFF',
  sage:     '#7C9A82',
  sageDark: '#4A6B52',
  sageBg:   '#EEF5EF',
  honey:    '#E8A849',
  honeyDark:'#B07820',
  honeyBg:  '#FEF8EC',
  coral:    '#E07A5F',
  coralBg:  '#FDF1EE',
  // Legacy aliases — used in older code paths
  dark:  '#3A3633',
  muted: '#6B6460',
};

// 5-colour activity rotation — bright palette for K-5, muted for 6-8
const ACTIVITY_COLORS = [
  { bar: '#7C9A82', bg: '#EEF5EF', text: '#4A6B52' }, // sage
  { bar: '#E8A849', bg: '#FEF8EC', text: '#B07820' }, // honey
  { bar: '#E07A5F', bg: '#FDF1EE', text: '#B85A40' }, // coral
  { bar: '#7B68EE', bg: '#F4F2FF', text: '#5548CC' }, // purple
  { bar: '#5BC0EB', bg: '#EBF8FE', text: '#2A8EAF' }, // sky
];

const ACTIVITY_COLORS_MUTED = [
  { bar: '#5E7D65', bg: '#EEF4EF', text: '#3D5448' },
  { bar: '#B5892E', bg: '#FAF6EE', text: '#8A6422' },
  { bar: '#B85E47', bg: '#F8EDEA', text: '#8A4034' },
  { bar: '#5C54BE', bg: '#F0EEFB', text: '#3E3898' },
  { bar: '#3E92B0', bg: '#EBF5FA', text: '#2A7088' },
];

type ActivityColor = (typeof ACTIVITY_COLORS)[0];

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
  specialNotes?: string | null;
  mascotImageUrl?: string | null;
  mascotName?: string | null;
  mascotEmojiCluster?: string | null;
  coloringPage?: PDFColoringPage | null;
  coloringImageUrl?: string | null;
  greeting?: string | null;
  parentNotes?: string | null;
  dailyReflection?: string | null;
  packetMission?: string | null;
  packetCelebration?: string | null;
}

// ─── Grade-band helpers ───────────────────────────────────────────────────────

function getGradeBand(childGrade: string): 'K-2' | '3-5' | '6-8' {
  if (childGrade === 'Kindergarten') return 'K-2';
  const m = childGrade.match(/\d+/);
  const g = m ? parseInt(m[0], 10) : 3;
  if (g <= 2) return 'K-2';
  if (g <= 5) return '3-5';
  return '6-8';
}

interface BandConfig {
  body: number;       // body font size
  barH: number;       // activity top bar height
  cardPad: number;    // card padding
  cardRadius: number; // card border radius
  borderW: number;    // border width
  lineSpacing: number;// writing-line spacing
  mascotInBar: number;// mascot image size in activity bar
  instrBody: number;  // instruction text size
}

function getBandConfig(band: 'K-2' | '3-5' | '6-8'): BandConfig {
  const configs: Record<'K-2' | '3-5' | '6-8', BandConfig> = {
    'K-2': { body: 13, barH: 108, cardPad: 14, cardRadius: 14, borderW: 3, lineSpacing: 32, mascotInBar: 90, instrBody: 14 },
    '3-5': { body: 11.5, barH: 96, cardPad: 12, cardRadius: 10, borderW: 2, lineSpacing: 26, mascotInBar: 80, instrBody: 11.5 },
    '6-8': { body: 10.5, barH: 86, cardPad: 10, cardRadius: 8, borderW: 1.5, lineSpacing: 22, mascotInBar: 60, instrBody: 10.5 },
  };
  return configs[band];
}

function getActivityColors(index: number, band: 'K-2' | '3-5' | '6-8'): ActivityColor {
  const palette = band === '6-8' ? ACTIVITY_COLORS_MUTED : ACTIVITY_COLORS;
  return palette[index % palette.length];
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

const TWEMOJI_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/';
function getSubjectIconUrl(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('math'))                                       return TWEMOJI_BASE + '1f9ee.png';
  if (s.includes('read') || s.includes('compreh'))             return TWEMOJI_BASE + '1f4d6.png';
  if (s.includes('writ') || s.includes('journal') || s.includes('story')) return TWEMOJI_BASE + '270f.png';
  if (s.includes('sci'))                                        return TWEMOJI_BASE + '1f52c.png';
  if (s.includes('puzzle'))                                     return TWEMOJI_BASE + '1f9e9.png';
  return TWEMOJI_BASE + '1f3c6.png';
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

// ─── Hidden mascot corner positions (cycle by page index) ────────────────────

const HIDDEN_MASCOT_CORNERS = [
  { bottom: 24, right: 12 },
  { bottom: 24, left: 12 },
  { top: 112, right: 12 },
  { top: 112, left: 12 },
] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Page base ───────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: C.cream,
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
    borderColor: C.honey,
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
    borderColor: C.honey,
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
    color: C.sage,
    letterSpacing: 0.3,
  },
  coverDate: {
    fontFamily: 'Nunito',
    fontSize: 9,
    color: C.warmGray,
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
    backgroundColor: C.white,
    borderWidth: 3,
    borderColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mascotFallbackEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  mascotNameText: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 11,
    color: C.sage,
    textAlign: 'center',
  },

  // ── Cover: title ────────────────────────────────────────────────────────────
  coverTitle: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 34,
    color: C.charcoal,
    textAlign: 'center',
    lineHeight: 1.2,
    marginHorizontal: 16,
  },
  coverSubtitle: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.warmGray,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ── Cover: activity count badge ─────────────────────────────────────────────
  activityBadge: {
    backgroundColor: C.honey,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    alignSelf: 'center',
  },
  activityBadgeText: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 12,
    color: C.white,
    letterSpacing: 0.2,
  },

  // ── Cover: greeting / mission box ───────────────────────────────────────────
  greetingBox: {
    borderWidth: 2,
    borderColor: C.sage,
    borderRadius: 12,
    padding: 16,
    backgroundColor: C.sageBg,
    width: '100%',
  },
  greetingLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.sage,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 11,
    color: C.sageDark,
    lineHeight: 1.7,
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Cover: footer ───────────────────────────────────────────────────────────
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  coverFooterText: {
    fontFamily: 'Nunito',
    fontSize: 9,
    color: C.warmGray,
  },
  coverFooterDot: {
    fontSize: 9,
    color: C.border,
  },

  // ── Activity page ───────────────────────────────────────────────────────────
  activityPage: {
    flexDirection: 'column',
  },
  activityContent: {
    padding: 36,
    flex: 1,
    flexDirection: 'column',
  },

  // Activity bar elements — height/mascot size set dynamically via band config
  activityBarLeft: {
    flexDirection: 'column',
    gap: 3,
    flex: 1,
  },
  activityBarSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activityBarIcon: {
    width: 18,
    height: 18,
  },
  activityBarSubject: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  activityBarTitle: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 18,
    color: C.white,
    lineHeight: 1.2,
  },
  activityBarTime: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 10,
    color: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },

  // ── Content cards ───────────────────────────────────────────────────────────
  materialsBox: {
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: C.border,
  },
  materialsLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginRight: 8,
    paddingTop: 1,
  },
  materialsText: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.charcoal,
    lineHeight: 1.5,
    flex: 1,
  },

  descriptionBox: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  descriptionText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 11.5,
    color: C.charcoal,
    lineHeight: 1.65,
  },

  // ── Instructions ────────────────────────────────────────────────────────────
  instructionsLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  questionBox: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 12,
    paddingBottom: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
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
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 12,
  },
  instructionText: {
    fontFamily: 'Nunito',
    fontSize: 11.5,
    color: C.charcoal,
    lineHeight: 1.55,
    flex: 1,
  },
  answerLineInBox: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
    marginTop: 12,
  },

  // ── Work area ───────────────────────────────────────────────────────────────
  workLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
    marginBottom: 18,
  },

  // ── Fun fact callout (honey) ─────────────────────────────────────────────────
  // Column direction (default) — lets the box auto-size to its text content.
  // Do NOT add flexDirection:'row' or alignItems:'flex-start' here; in react-pdf
  // those prevent the cross-axis from expanding and text overflows the border.
  funFactBox: {
    backgroundColor: C.honeyBg,
    borderWidth: 1.5,
    borderColor: C.honey,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  funFactLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.honeyDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  funFactText: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.charcoal,
    lineHeight: 1.5,
  },

  // ── Bonus challenge ─────────────────────────────────────────────────────────
  bonusChallengeBox: {
    backgroundColor: C.honeyBg,
    borderWidth: 2,
    borderColor: C.honey,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  bonusChallengeHeader: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.honeyDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  bonusChallengeText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 11,
    color: C.charcoal,
    lineHeight: 1.5,
  },

  // ── Answer key ──────────────────────────────────────────────────────────────
  answerKeyBox: {
    backgroundColor: C.honeyBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: C.honey,
  },
  answerKeyHeader: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.honeyDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  answerKeyText: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.charcoal,
    lineHeight: 1.6,
  },

  // ── Star reward row ──────────────────────────────────────────────────────────
  starRewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 6,
    paddingRight: 4,
    gap: 4,
  },
  starRewardText: {
    fontFamily: 'Nunito',
    fontSize: 9,
    color: C.warmGray,
  },

  // ── Mid-page mascot encouragement ───────────────────────────────────────────
  midPageEncouragement: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  midPageMascotImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0,
  },
  midPageSpeechBubble: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    backgroundColor: C.white,
  },
  midPageSpeechText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 9.5,
    color: C.charcoal,
    lineHeight: 1.4,
  },

  // ── Hidden mascot (small, corner overlay) ───────────────────────────────────
  hiddenMascotImage: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    opacity: 0.75,
  },

  // ── Reading passage ──────────────────────────────────────────────────────────
  readingPassageBlock: {
    backgroundColor: '#FFFBF0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  readingPassageLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.honeyDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  readingPassageText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 11.5,
    lineHeight: 1.7,
    color: C.charcoal,
  },

  // ── Open workspace (writing / movement / coloring) ───────────────────────────
  promptBubble: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.white,
    marginBottom: 14,
  },
  promptBubbleText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.charcoal,
    lineHeight: 1.6,
    marginBottom: 6,
  },
  promptInstructionText: {
    fontFamily: 'Nunito',
    fontSize: 11,
    color: C.charcoal,
    lineHeight: 1.5,
    marginTop: 6,
  },
  writingSpaceHeader: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  writingLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
    marginBottom: 26,
  },
  drawBox: {
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  drawBoxLabel: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 14,
    color: '#C4C9D4',
    textAlign: 'center',
  },
  movementReflectionBox: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    backgroundColor: '#F9FAFB',
  },
  movementReflectionLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  movementReflectionLine: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
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
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 9,
    color: C.warmGray,
    marginRight: 6,
    marginTop: 2,
  },
  mathCalcEquation: {
    fontFamily: 'Nunito',
    fontSize: 11.5,
    color: C.charcoal,
    flex: 1,
  },
  mathCalcAnswerLine: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#9CA3AF',
    width: 80,
    marginTop: 8,
  },
  mathWordBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  mathWordText: {
    fontFamily: 'Nunito',
    fontSize: 11,
    color: C.charcoal,
    lineHeight: 1.55,
    marginBottom: 6,
  },
  mathDrawPromptBubble: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: C.white,
    marginBottom: 8,
  },
  mathDrawPromptText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 11,
    color: C.charcoal,
    lineHeight: 1.55,
  },
  mathDrawBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mathDrawBoxLabel: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 10,
    color: '#C4C9D4',
  },
  mathAnswerLineLabel: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.warmGray,
    marginBottom: 4,
  },
  mathAnswerLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
  },

  // ── Puzzle break (word search) ───────────────────────────────────────────────
  puzzleIntroBox: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.white,
    marginBottom: 16,
  },
  puzzleIntroText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.charcoal,
    lineHeight: 1.6,
  },
  wordSearchGrid: {
    flexDirection: 'column',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
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
    borderColor: '#E5E7EB',
  },
  wordSearchLetter: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 9,
    color: C.charcoal,
    textAlign: 'center',
  },
  wordListLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  wordListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordListItem: {
    backgroundColor: C.sageBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.sage,
  },
  wordListText: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 9.5,
    color: C.sageDark,
    letterSpacing: 0.5,
  },

  // ── Certificate page ─────────────────────────────────────────────────────────
  certificatePage: {
    backgroundColor: C.cream,
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
    borderColor: C.honey,
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
    borderColor: C.honey,
    borderRadius: 4,
    opacity: 0.35,
  },
  certStar: {
    width: 36,
    height: 36,
    marginBottom: 12,
  },
  certHeader: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 11,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  certTitle: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 28,
    color: C.charcoal,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 1.2,
  },
  certPresented: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.warmGray,
    textAlign: 'center',
    marginBottom: 4,
  },
  certChildName: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 48,
    color: C.sage,
    textAlign: 'center',
    lineHeight: 1.1,
    marginBottom: 8,
  },
  certBody: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.warmGray,
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  certTheme: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 18,
    color: C.honey,
    textAlign: 'center',
    marginBottom: 24,
  },
  certDivider: {
    width: 200,
    height: 2,
    backgroundColor: C.honey,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 24,
    alignSelf: 'center',
  },
  certDateLine: {
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.warmGray,
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
    borderBottomColor: C.charcoal,
    width: '100%',
    marginBottom: 4,
  },
  certSignatureLabel: {
    fontFamily: 'Nunito',
    fontSize: 8,
    color: C.warmGray,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // ── Notes / reflection pages ─────────────────────────────────────────────────
  notesPage: {
    backgroundColor: C.white,
    padding: 48,
    flexDirection: 'column',
  },
  notesPageTitle: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 24,
    color: C.charcoal,
    marginBottom: 4,
  },
  notesPageSubtitle: {
    fontFamily: 'Nunito',
    fontSize: 11,
    color: C.warmGray,
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
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 8,
    color: C.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    fontFamily: 'Nunito',
    fontSize: 10,
    color: C.charcoal,
    lineHeight: 1.5,
    flex: 1,
  },
  parentNoteBox: {
    backgroundColor: C.sageBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.sage,
  },
  parentNoteText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 10.5,
    color: C.sageDark,
    lineHeight: 1.7,
  },
  reflectionBox: {
    backgroundColor: C.honeyBg,
    borderWidth: 2.5,
    borderColor: C.honey,
    borderRadius: 12,
    padding: 22,
    marginBottom: 22,
  },
  reflectionLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.honeyDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reflectionText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 13,
    color: C.charcoal,
    lineHeight: 1.75,
  },
  celebrationBox: {
    backgroundColor: C.sageBg,
    borderWidth: 2,
    borderColor: C.sage,
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
  },
  celebrationLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 9,
    color: C.sage,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  celebrationText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.sageDark,
    lineHeight: 1.7,
  },
  mascotHuntBox: {
    backgroundColor: C.honeyBg,
    borderWidth: 1.5,
    borderColor: C.honey,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  mascotHuntText: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 10,
    color: C.honeyDark,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  observationsLabel: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 12,
    color: C.charcoal,
    marginBottom: 16,
  },
  ruledLine: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
    marginBottom: 26,
  },
  notesFooter: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Nunito',
    fontSize: 8.5,
    color: C.warmGray,
  },

  // ── Coloring page ────────────────────────────────────────────────────────────
  coloringPage: {
    backgroundColor: C.cream,
    padding: 48,
    flexDirection: 'column',
    alignItems: 'center',
  },
  coloringHeaderText: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 13,
    color: C.sage,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  coloringTitle: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 28,
    color: C.charcoal,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 1.25,
  },
  coloringBox: {
    borderWidth: 2.5,
    borderStyle: 'dashed' as const,
    borderColor: '#A3C4B0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
    width: '100%',
  },
  coloringBoxImage: {
    width: 420,
    height: 420,
    objectFit: 'contain',
  },
  coloringBoxPlaceholder: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 13,
    color: '#A3C4B0',
    textAlign: 'center',
    lineHeight: 1.7,
    width: 420,
    height: 420,
  },
  coloringInstructionBubble: {
    borderWidth: 2,
    borderColor: '#A3C4B0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.white,
    width: '100%',
    marginTop: 4,
  },
  coloringInstructionText: {
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    fontSize: 12,
    color: C.sageDark,
    textAlign: 'center',
    lineHeight: 1.6,
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

  return (
    <Page size="LETTER" style={styles.coverPage}>
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

      {/* Footer */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>Made with love by Packet Day</Text>
        <Text style={styles.coverFooterDot}>  ·  </Text>
        <Text style={styles.coverFooterText}>packetday.com</Text>
      </View>
    </Page>
  );
}

// ─── Activity top bar ─────────────────────────────────────────────────────────

function ActivityTopBar({
  activity,
  colors,
  mascotImageUrl,
  band,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  mascotImageUrl?: string | null;
  band: 'K-2' | '3-5' | '6-8';
}) {
  const bc = getBandConfig(band);
  const barTitleSize = band === 'K-2' ? 20 : band === '3-5' ? 18 : 15;
  const mascotSize = bc.mascotInBar;

  return (
    <View style={{ height: bc.barH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, gap: 12, backgroundColor: colors.bar }}>
      <View style={styles.activityBarLeft}>
        <View style={styles.activityBarSubjectRow}>
          <Image src={getSubjectIconUrl(activity.subject)} style={styles.activityBarIcon} />
          <Text style={styles.activityBarSubject}>{sanitizeText(activity.subject)}</Text>
        </View>
        <Text style={[styles.activityBarTitle, { fontSize: barTitleSize }]}>
          {sanitizeText(activity.title)}
        </Text>
      </View>
      <Text style={styles.activityBarTime}>{activity.estimated_minutes} min</Text>
      {mascotImageUrl && (
        <Image
          src={mascotImageUrl}
          style={{
            position: 'absolute',
            top: (bc.barH - mascotSize) / 2,
            right: 14,
            width: mascotSize,
            height: mascotSize,
            borderRadius: mascotSize / 2,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.6)',
          }}
        />
      )}
    </View>
  );
}

// ─── Hidden mascot (small, corner) ────────────────────────────────────────────

function HiddenMascot({
  mascotImageUrl,
  pageIndex,
}: {
  mascotImageUrl?: string | null;
  pageIndex: number;
}) {
  if (!mascotImageUrl) return null;
  const pos = HIDDEN_MASCOT_CORNERS[pageIndex % HIDDEN_MASCOT_CORNERS.length];
  return (
    <Image
      src={mascotImageUrl}
      style={[styles.hiddenMascotImage, pos]}
    />
  );
}

// ─── Mid-page mascot encouragement ────────────────────────────────────────────

function MidPageEncouragement({
  activity,
  colors,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  mascotImageUrl?: string | null;
}) {
  if (!mascotImageUrl) return null;
  return (
    <View wrap={false} style={[styles.midPageEncouragement, { backgroundColor: colors.bg }]}>
      <Image src={mascotImageUrl} style={styles.midPageMascotImage} />
      <View style={[styles.midPageSpeechBubble, { borderColor: colors.bar }]}>
        <Text style={styles.midPageSpeechText}>
          {activity.encouragement || 'Keep going — you are doing amazing!'}
        </Text>
      </View>
    </View>
  );
}

// ─── Star rating row ──────────────────────────────────────────────────────────

function StarRewardRow({
  colors,
  band,
}: {
  colors: ActivityColor;
  band: 'K-2' | '3-5' | '6-8';
}) {
  const label = band === '6-8' ? 'Self-assessment:' : 'How did I do today?';
  const starSize = band === 'K-2' ? 22 : band === '3-5' ? 18 : 16;
  return (
    <View wrap={false} style={styles.starRewardBox}>
      <Text style={styles.starRewardText}>{label}</Text>
      {[0, 1, 2].map((i) => (
        <StarSvg key={i} color={colors.bar} size={starSize} />
      ))}
    </View>
  );
}

// ─── Fun fact callout ─────────────────────────────────────────────────────────

function FunFactBox({ funFact }: { funFact: string }) {
  if (!funFact) return null;
  return (
    <View wrap={false} style={styles.funFactBox}>
      <Text style={styles.funFactLabel}>Did you know?</Text>
      <Text style={styles.funFactText}>{sanitizeText(funFact)}</Text>
    </View>
  );
}

// ─── Math sections ────────────────────────────────────────────────────────────

function MathSections({
  instructions,
  colors,
}: {
  instructions: string[];
  colors: ActivityColor;
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
      <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
        <Text style={styles.mathSectionBarText}>{'[ ' + quickCalcsLabel + ' ]'}</Text>
      </View>
      <View style={styles.mathCalcGrid}>
        {quickCalcs.map((prob, i) => (
          <View key={i} style={styles.mathCalcCell}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={styles.mathCalcNumber}>{i + 1}.</Text>
              <Text style={styles.mathCalcEquation}>{prob}</Text>
            </View>
            <View style={styles.mathCalcAnswerLine} />
          </View>
        ))}
      </View>

      {/* Word Problems */}
      <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
        <Text style={styles.mathSectionBarText}>{'[ Word Problems ]'}</Text>
      </View>
      {wordProblems.map((prob, i) => (
        <View wrap={false} key={i} style={styles.mathWordBox}>
          <Text style={styles.mathWordText}>{prob}</Text>
          <View style={styles.answerLineInBox} />
          <View style={styles.answerLineInBox} />
        </View>
      ))}

      {/* Draw & Solve */}
      {drawAndSolve !== '' && (
        <>
          <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
            <Text style={styles.mathSectionBarText}>{'[ Draw & Solve ]'}</Text>
          </View>
          <View wrap={false}>
            <View style={styles.mathDrawPromptBubble}>
              <Text style={styles.mathDrawPromptText}>{drawAndSolve}</Text>
            </View>
            <View style={styles.mathDrawBox}>
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

// ─── Template A — Worksheet ───────────────────────────────────────────────────

function WorksheetTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
  pageIndex,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  pageIndex: number;
}) {
  const band = getGradeBand(childGrade);
  const bc = getBandConfig(band);
  const answerLines = worksheetAnswerLines(band);
  const isMath = activity.subject.toLowerCase().includes('math');

  return (
    <Page size="LETTER" style={[styles.activityPage, { backgroundColor: colors.bg }]}>
      <ActivityTopBar activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />
      <HiddenMascot mascotImageUrl={mascotImageUrl} pageIndex={pageIndex} />

      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View wrap={false} style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>{activity.materials.join('  /  ')}</Text>
          </View>
        )}

        {/* Description */}
        <View wrap={false} style={[styles.descriptionBox, { backgroundColor: C.white, borderLeftColor: colors.bar, borderRadius: bc.cardRadius, padding: bc.cardPad }]}>
          <Text style={[styles.descriptionText, { fontSize: bc.body }]}>{sanitizeText(activity.description)}</Text>
        </View>

        {/* Instructions */}
        {isMath ? (
          <MathSections instructions={activity.instructions} colors={colors} />
        ) : (
          <>
            <Text style={styles.instructionsLabel}>{'[ How to do it ]'}</Text>
            {activity.instructions.map((step, i) => (
              <View wrap={false} key={i} style={[styles.questionBox, { borderRadius: bc.cardRadius, borderWidth: bc.borderW, borderColor: colors.bar + '33' }]}>
                <View style={[styles.instructionRow, { marginBottom: 2 }]}>
                  <View style={[styles.instructionBullet, { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.bar }]}>
                    <Text style={[styles.instructionBulletText, { color: colors.bar }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.instructionText, { fontSize: bc.instrBody }]}>{sanitizeText(step)}</Text>
                </View>
                {Array.from({ length: answerLines }, (_, j) => (
                  <View key={j} style={[styles.answerLineInBox, { marginTop: bc.lineSpacing / 2 }]} />
                ))}
              </View>
            ))}
          </>
        )}

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} />}

        {/* Mid-page encouragement */}
        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />

        {/* Bonus challenge — only for K-5 */}
        {band !== '6-8' && (
          <View wrap={false} style={styles.bonusChallengeBox}>
            <Text style={styles.bonusChallengeHeader}>Bonus Challenge</Text>
            <Text style={styles.bonusChallengeText}>{bonusChallenge(activity.subject, activity.title)}</Text>
          </View>
        )}

        {/* Star rating */}
        <StarRewardRow colors={colors} band={band} />

        {/* Answer key */}
        {activity.answer_key && (
          <View wrap={false} style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>For Grown-Ups Only</Text>
            <Text style={styles.answerKeyText}>{sanitizeText(activity.answer_key)}</Text>
          </View>
        )}
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
  pageIndex,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  pageIndex: number;
}) {
  const band = getGradeBand(childGrade);
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
    <Page size="LETTER" style={[styles.activityPage, { backgroundColor: colors.bg }]}>
      <ActivityTopBar activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />
      <HiddenMascot mascotImageUrl={mascotImageUrl} pageIndex={pageIndex} />

      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        {activity.materials && activity.materials.length > 0 && (
          <View wrap={false} style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>{activity.materials.join('  /  ')}</Text>
          </View>
        )}

        {passage && (
          <View style={[styles.readingPassageBlock, { borderLeftWidth: 4, borderLeftColor: colors.bar, borderRadius: bc.cardRadius }]}>
            <Text style={styles.readingPassageLabel}>{'[ Read This ]'}</Text>
            <Text style={[styles.readingPassageText, { fontSize: bc.body }]}>{sanitizeText(passage)}</Text>
          </View>
        )}

        {questions.length > 0 && (
          <Text style={styles.instructionsLabel}>{'[ Comprehension Questions ]'}</Text>
        )}
        {questions.map((step, i) => (
          <View wrap={false} key={i} style={[styles.questionBox, { borderRadius: bc.cardRadius, borderWidth: bc.borderW, borderColor: colors.bar + '33' }]}>
            <View style={[styles.instructionRow, { marginBottom: 2 }]}>
              <View style={[styles.instructionBullet, { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.bar }]}>
                <Text style={[styles.instructionBulletText, { color: colors.bar }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.instructionText, { fontSize: bc.instrBody }]}>{sanitizeText(step)}</Text>
            </View>
            <View style={styles.answerLineInBox} />
            <View style={styles.answerLineInBox} />
          </View>
        ))}

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} />}

        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />
        <StarRewardRow colors={colors} band={band} />

        {activity.answer_key && (
          <View wrap={false} style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>For Grown-Ups Only</Text>
            <Text style={styles.answerKeyText}>{sanitizeText(activity.answer_key)}</Text>
          </View>
        )}
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
  pageIndex,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  pageIndex: number;
}) {
  const band = getGradeBand(childGrade);
  const bc = getBandConfig(band);
  const contentType = resolveContentType(activity);
  const lineCount = writingLineCount(band);

  return (
    <Page size="LETTER" style={[styles.activityPage, { backgroundColor: colors.bg }]}>
      <ActivityTopBar activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />
      <HiddenMascot mascotImageUrl={mascotImageUrl} pageIndex={pageIndex} />

      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        {activity.materials && activity.materials.length > 0 && (
          <View wrap={false} style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>{activity.materials.join('  /  ')}</Text>
          </View>
        )}

        {/* Prompt bubble */}
        <View style={[styles.promptBubble, { borderRadius: bc.cardRadius }]}>
          <Text style={[styles.promptBubbleText, { fontSize: bc.body + 0.5 }]}>{sanitizeText(activity.description)}</Text>
          {activity.instructions.map((step, i) => (
            <Text key={i} style={[styles.promptInstructionText, { fontSize: bc.instrBody }]}>
              {i + 1}. {sanitizeText(step)}
            </Text>
          ))}
        </View>

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} />}

        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />

        {/* Response area */}
        {contentType === 'writing_prompt' && (
          <>
            <Text style={styles.writingSpaceHeader}>My Writing Space</Text>
            {Array.from({ length: lineCount }, (_, i) => (
              <View key={i} style={[styles.writingLine, { marginBottom: bc.lineSpacing }]} />
            ))}
          </>
        )}

        {contentType === 'movement_activity' && (
          <View wrap={false} style={styles.movementReflectionBox}>
            <Text style={styles.movementReflectionLabel}>How did it go?</Text>
            {Array.from({ length: 3 }, (_, i) => (
              <View key={i} style={styles.movementReflectionLine} />
            ))}
          </View>
        )}

        {contentType === 'coloring' && (
          <View style={styles.drawBox}>
            <Text style={styles.drawBoxLabel}>Draw or write here</Text>
          </View>
        )}

        <StarRewardRow colors={colors} band={band} />
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
  pageIndex,
}: {
  activity: PDFActivity;
  colors: ActivityColor;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
  pageIndex: number;
}) {
  const band = getGradeBand(childGrade);
  const bc = getBandConfig(band);
  const gridSize = band === '6-8' ? 12 : 10;
  const cellSize = band === '6-8' ? 20 : 22;

  const { grid, placed } = generateWordSearch(activity.instructions, gridSize);

  return (
    <Page size="LETTER" style={[styles.activityPage, { backgroundColor: colors.bg }]}>
      <ActivityTopBar activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} band={band} />
      <HiddenMascot mascotImageUrl={mascotImageUrl} pageIndex={pageIndex} />

      <View style={[styles.activityContent, { padding: bc.cardPad + 24 }]}>
        {/* Intro */}
        <View style={[styles.puzzleIntroBox, { borderRadius: bc.cardRadius }]}>
          <Text style={[styles.puzzleIntroText, { fontSize: bc.body + 0.5 }]}>
            {sanitizeText(activity.description)}
          </Text>
        </View>

        {/* Fun fact */}
        {activity.fun_fact && <FunFactBox funFact={activity.fun_fact} />}

        {/* Word search grid */}
        <View style={styles.wordSearchGrid}>
          {grid.map((row, r) => (
            <View key={r} style={styles.wordSearchRow}>
              {row.map((letter, c) => (
                <View key={c} style={[styles.wordSearchCell, { width: cellSize, height: cellSize }]}>
                  <Text style={styles.wordSearchLetter}>{letter}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Word list */}
        <Text style={styles.wordListLabel}>Find these words:</Text>
        <View style={styles.wordListGrid}>
          {placed.map((word, i) => (
            <View key={i} style={styles.wordListItem}>
              <Text style={styles.wordListText}>{word}</Text>
            </View>
          ))}
        </View>

        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />
        <StarRewardRow colors={colors} band={band} />
      </View>
    </Page>
  );
}

// ─── Activity page dispatcher ─────────────────────────────────────────────────

function ActivityPage({
  activity,
  index,
  childName,
  childGrade,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  index: number;
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
}) {
  const band = getGradeBand(childGrade);
  const colors = getActivityColors(index, band);
  const contentType = resolveContentType(activity);

  const sharedProps = { activity, colors, childName, childGrade, mascotImageUrl, pageIndex: index };

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
}: {
  childName: string;
  theme: string;
  createdAt: string;
  mascotImageUrl?: string | null;
}) {
  return (
    <Page size="LETTER" style={styles.certificatePage}>
      {/* Decorative frames */}
      <View style={styles.certFrameOuter} />
      <View style={styles.certFrameInner} />

      {/* Trophy star SVG */}
      <View style={{ marginBottom: 16 }}>
        <Svg width={48} height={48} viewBox="0 0 24 24">
          <Polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={C.honey}
            stroke={C.honeyDark}
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
  theme,
  activities,
  createdAt,
  mascotImageUrl,
  parentNotes,
}: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.notesPage}>
      {mascotImageUrl && (
        <Image src={mascotImageUrl} style={styles.mascotImageNotes} />
      )}

      <Text style={styles.notesPageTitle}>Today at a Glance</Text>
      <Text style={styles.notesPageSubtitle}>
        {activities.length} activities  ·  {activities.reduce((s, a) => s + a.estimated_minutes, 0)} min total
      </Text>

      <Text style={styles.sectionLabel}>Activity Summary</Text>
      {activities.map((activity, i) => {
        const band = getGradeBand('Grade 3'); // parent notes don't need band styling
        const colors = getActivityColors(i, band);
        return (
          <View key={i} style={styles.summaryRow}>
            <View style={[styles.summaryColorDot, { backgroundColor: colors.bar }]} />
            <Text style={styles.summaryText}>
              <Text style={{ fontFamily: 'Fraunces', fontWeight: 700 }}>{activity.subject}: </Text>
              {activity.title} — {activity.estimated_minutes} min
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
              {[0, 1, 2, 3, 4].map((j) => (
                <View key={j} style={{ width: 10, height: 10, borderWidth: 1.5, borderColor: colors.bar, borderRadius: 2, marginLeft: 5 }} />
              ))}
            </View>
          </View>
        );
      })}

      <View style={{ marginTop: 22, marginBottom: 6 }}>
        <Text style={styles.sectionLabel}>A Note for You</Text>
      </View>
      <View style={styles.parentNoteBox}>
        <Text style={styles.parentNoteText}>
          {sanitizeText(parentNotes) || parentNote(childName, theme)}
        </Text>
      </View>

      <Text style={styles.observationsLabel}>My Observations</Text>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={styles.ruledLine} />
      ))}

      <View style={styles.notesFooter}>
        <Text style={styles.footerText}>Made with love by Packet Day</Text>
        <Text style={styles.footerText}>packetday.com  ·  {formatPDFDate(createdAt)}</Text>
      </View>
    </Page>
  );
}

// ─── Coloring page ────────────────────────────────────────────────────────────

function ColoringPage({
  coloringPage,
  coloringImageUrl,
  mascotImageUrl,
}: {
  coloringPage: PDFColoringPage;
  coloringImageUrl?: string | null;
  mascotImageUrl?: string | null;
}) {
  const imageUrl = coloringImageUrl ?? mascotImageUrl ?? null;
  return (
    <Page size="LETTER" style={styles.coloringPage}>
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
        <Text style={styles.coloringInstructionText}>{sanitizeText(coloringPage.instructions)}</Text>
      </View>
    </Page>
  );
}

// ─── Celebration / reflection page ────────────────────────────────────────────

function CelebrationPage({
  childName,
  theme,
  createdAt,
  dailyReflection,
  packetCelebration,
  mascotName,
  mascotImageUrl,
}: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.notesPage}>
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
        <Text style={styles.reflectionText}>
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
          <Text style={styles.mascotHuntText}>
            Did you find {sanitizeText(mascotName)} hiding on every activity page? Go back and count them all!
          </Text>
        </View>
      )}

      <View style={styles.notesFooter}>
        <Text style={styles.footerText}>Made with love by Packet Day</Text>
        <Text style={styles.footerText}>packetday.com  ·  {formatPDFDate(createdAt)}</Text>
      </View>
    </Page>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PacketPDF(props: PacketPDFProps) {
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
          index={i}
          childName={props.childName}
          childGrade={props.childGrade}
          mascotImageUrl={props.mascotImageUrl}
        />
      ))}
      <CertificatePage
        childName={props.childName}
        theme={props.theme}
        createdAt={props.createdAt}
        mascotImageUrl={props.mascotImageUrl}
      />
      {props.coloringPage && (
        <ColoringPage
          coloringPage={props.coloringPage}
          coloringImageUrl={props.coloringImageUrl}
          mascotImageUrl={props.mascotImageUrl}
        />
      )}
      <CelebrationPage {...props} />
    </Document>
  );
}

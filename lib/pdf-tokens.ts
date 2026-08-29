// ─────────────────────────────────────────────────────────────────────────────
// PDF design tokens — single source of truth for every visual value used by
// the PacketPDF template (components/PacketPDF.tsx).
//
// Plain data only: no React, no @react-pdf/renderer imports. Safe to import
// from anywhere, including test scripts.
//
// NOT WIRED YET. This file exists standalone until PacketPDF.tsx is migrated
// to read from it in a later chunk.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Colors ─────────────────────────────────────────────────────────────────

export const color = {
  // Neutrals
  page: '#FFFFFF',
  textPrimary: '#3A3633',
  textSecondary: '#6B6460',
  textTertiary: '#8B837B',
  placeholder: '#B9B1A5',
  answerRule: '#E3DCD1',
  faintDivider: '#EFE9DF',
  signatureRule: '#D8D0C4',
  creamPanel: '#FBF7F0',

  // Sage
  sage: '#7C9A82',
  sageDark: '#5A7A60',
  sageRule: '#A8C5AE',
  sageTint: '#F4F7F2',
  sageChip: '#E6EDE4',

  // Honey
  honey: '#E8A849',
  honeyDark: '#C4872E',
  honeyTint: '#FDF6EA',
  honeyChip: '#FDF1DE',

  // Coral
  coral: '#E07A5F',
  coralDark: '#C25A3F',
  coralRule: '#F0A08A',
  coralChip: '#FBEFEA',
  coralTint: '#FDF7F5',
} as const;

export type ColorToken = keyof typeof color;

// ─── Accent families ────────────────────────────────────────────────────────
//
// A "family" is the accent-color set assigned to a page. The rule is based on
// OUTPUT TYPE, not subject name — see familyForActivity below.

export type AccentFamilyKey = 'academic' | 'break' | 'coloring' | 'parent';

export interface AccentFamily {
  label: string;
  rule: string;
  /** null for families that don't render a filled strip (e.g. coloring pages). */
  stripFill: string | null;
  /** null for families that don't render a chip background. */
  chip: string | null;
}

export const accentFamily: Record<AccentFamilyKey, AccentFamily> = {
  academic: {
    label: color.sage,
    rule: color.sageRule,
    stripFill: color.sageTint,
    chip: color.sageChip,
  },
  break: {
    label: color.honeyDark,
    rule: color.honey,
    stripFill: color.honeyTint,
    chip: color.honeyChip,
  },
  coloring: {
    label: color.coral,
    rule: color.coralRule,
    stripFill: null,
    chip: null,
  },
  parent: {
    label: color.coralDark,
    rule: color.coralRule,
    stripFill: color.coralTint,
    chip: color.coralChip,
  },
};

/**
 * Resolves the accent family for an activity from its ContentType (the
 * explicit output-type selector PacketActivity.content_type / PDFActivity's
 * resolved content type — see resolveContentType in components/PacketPDF.tsx).
 *
 * Explicit map over the six real ContentType values — reading_passage,
 * worksheet, and writing_prompt are written work ("academic"); puzzle_break
 * and movement_activity are non-written breaks ("break"); coloring is its
 * own family. Defaults to "academic" for anything unrecognized.
 */
export function familyForActivity(
  contentType: string | null | undefined
): 'academic' | 'break' | 'coloring' {
  switch (contentType) {
    case 'reading_passage':
    case 'worksheet':
    case 'writing_prompt':
      return 'academic';
    case 'puzzle_break':
    case 'movement_activity':
      return 'break';
    case 'coloring':
      return 'coloring';
    default:
      return 'academic';
  }
}

// ─── Typography ─────────────────────────────────────────────────────────────

export interface TypeStyle {
  fontFamily: 'Fraunces' | 'Nunito';
  fontSize: number;
  lineHeight: number;
  letterSpacing?: string;
  /**
   * Omitted when the color is resolved from the page's accentFamily at
   * render time rather than being fixed (e.g. subjectLabel, calloutEyebrow,
   * chipLabel take the family's `label` color).
   */
  color?: string;
  fontWeight: 400 | 600 | 700 | 800;
  textTransform?: 'uppercase';
}

export const type = {
  packetTitle: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 42, lineHeight: 1.02,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  mascotName: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 20, lineHeight: 1.1,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  pageTitle: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 26, lineHeight: 1.05,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  activityTitle: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 24, lineHeight: 1.05,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  continuationTitle: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 24, lineHeight: 1.05,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  subActivityTitle: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 18, lineHeight: 1.1,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  certificateName: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 44, lineHeight: 1.0,
    letterSpacing: '-0.02em', color: color.textPrimary,
  },
  certificateDayTitle: {
    fontFamily: 'Fraunces', fontWeight: 800, fontSize: 26, lineHeight: 1.1,
    color: color.sageDark,
  },
  certificateSignoff: {
    fontFamily: 'Fraunces', fontWeight: 700, fontSize: 16, lineHeight: 1.2,
    color: color.sageDark,
  },
  subjectLabel: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 10, lineHeight: 1.2,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    // color: resolved from the page's accentFamily.label
  },
  sectionLabel: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 10, lineHeight: 1.2,
    letterSpacing: '0.14em', color: color.sageDark, textTransform: 'uppercase',
  },
  calloutEyebrow: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 9, lineHeight: 1.2,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    // color: resolved from the page's accentFamily.label
  },
  durationMaterials: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 10, lineHeight: 1.3,
    color: color.textSecondary,
  },
  body: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 12, lineHeight: 1.5,
    color: color.textPrimary,
  },
  readingPassage: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 12, lineHeight: 1.62,
    color: color.textPrimary,
  },
  questionText: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 12, lineHeight: 1.5,
    color: color.textPrimary,
  },
  questionNumber: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 12, lineHeight: 1.5,
    color: color.sageDark,
  },
  questionTypePrefix: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 12, lineHeight: 1.5,
    color: color.sageDark,
  },
  instruction: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 11.5, lineHeight: 1.48,
    color: color.textPrimary,
  },
  missionBody: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 14, lineHeight: 1.6,
    color: color.textPrimary,
  },
  missionCloser: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 12.5, lineHeight: 1.4,
    color: color.sageDark,
  },
  characterStripText: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 12, lineHeight: 1.5,
    color: color.textPrimary,
  },
  scheduleTitle: {
    fontFamily: 'Nunito', fontWeight: 600, fontSize: 13, lineHeight: 1.3,
    color: color.textPrimary,
  },
  scheduleDuration: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 11, lineHeight: 1.3,
    color: color.textSecondary,
  },
  quickCalcItem: {
    fontFamily: 'Nunito', fontWeight: 600, fontSize: 13.5, lineHeight: 1.4,
    color: color.textPrimary,
  },
  chipLabel: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 11, lineHeight: 1.2,
    // color: resolved from the page's accentFamily.label
  },
  wordListChip: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 10, lineHeight: 1.2,
    letterSpacing: '0.06em', color: color.sageDark, textTransform: 'uppercase',
  },
  wordSearchCell: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 12.5, lineHeight: 1.0,
    color: color.textPrimary, textTransform: 'uppercase',
  },
  calloutBody: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 11, lineHeight: 1.45,
    color: color.textPrimary,
  },
  openAreaPlaceholder: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 9, lineHeight: 1.2,
    letterSpacing: '0.12em', color: color.placeholder, textTransform: 'uppercase',
  },
  answerLineLabel: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 10, lineHeight: 1.2,
    letterSpacing: '0.12em', color: color.sage, textTransform: 'uppercase',
  },
  continuationHint: {
    fontFamily: 'Nunito', fontWeight: 600, fontSize: 9.5, lineHeight: 1.3,
    color: color.textTertiary,
  },
  parentNoteBody: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 11, lineHeight: 1.55,
    color: color.textSecondary,
  },
  answerKeyBody: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 11, lineHeight: 1.6,
    color: color.textPrimary,
  },
  answerKeyEmphasis: {
    fontFamily: 'Nunito', fontWeight: 700, fontSize: 11, lineHeight: 1.6,
    color: color.textPrimary,
  },
  footerText: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 9, lineHeight: 1.2,
    color: color.textTertiary,
  },
  pageNumber: {
    fontFamily: 'Nunito', fontWeight: 400, fontSize: 9, lineHeight: 1.2,
    color: color.textTertiary,
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleName = keyof typeof type;

// ─── Spacing ────────────────────────────────────────────────────────────────
// Base unit: 3pt.

export const space = {
  headerToRule: 12,
  ruleToContent: 12,
  betweenSections: 12,
  betweenQuestionBlocks: 12,
  questionToAnswerLines: 4.5,
  betweenQuickCalcRows: 9,
  betweenQuickCalcColumns: 16.5,
  betweenScheduleRows: 7,
  betweenStackedCallouts: 9,
  contentToFooter: 12,
  calloutPaddingV: 9,
  calloutPaddingH: 13.5,
  panelPaddingV: 21,
  panelPaddingH: 24,
} as const;

export type SpaceToken = keyof typeof space;

// ─── Page grid ──────────────────────────────────────────────────────────────
// Page size: US Letter, 612 x 792pt, portrait.

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

export interface PageGridVariant {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentWidth: number;
  contentHeight: number;
}

export const pageGrid: Record<'standard' | 'wide' | 'certificate', PageGridVariant> = {
  standard: {
    marginTop: 38, marginBottom: 38, marginLeft: 48, marginRight: 48,
    contentWidth: 516, contentHeight: 716,
  },
  wide: {
    marginTop: 33, marginBottom: 33, marginLeft: 42, marginRight: 42,
    contentWidth: 528, contentHeight: 726,
  },
  certificate: {
    marginTop: 53, marginBottom: 53, marginLeft: 53, marginRight: 53,
    contentWidth: 506, contentHeight: 686,
  },
};

// ─── Grade bands ────────────────────────────────────────────────────────────

export type BandKey = 'K-2' | '3-5' | '6-8';

export interface BandConfig {
  bodySize: number;
  passageSize: number;
  passageLineHeight: number;
  quickCalcSize: number;
  wordSearchCellFontSize: number;
  calloutBodySize: number;
  answerLinePitch: number;
  defaultLinesPerPrompt: number;
  writingPageLines: number;
  wordSearchGrid: number;
  wordSearchCell: number;
  wordsToFind: number;
  coverMascot: number;
  stripMascot: number;
  reflectionMascot: number;
  certificateMascot: number;
  quickCalcColumns: number;
  openAreaMinHeight: number;
  passageWordCeiling: number;
  reflectionLines: number;
}

export const band: Record<BandKey, BandConfig> = {
  'K-2': {
    bodySize: 14, passageSize: 14, passageLineHeight: 1.7, quickCalcSize: 16,
    wordSearchCellFontSize: 16, calloutBodySize: 12, answerLinePitch: 34,
    defaultLinesPerPrompt: 2, writingPageLines: 9, wordSearchGrid: 8,
    wordSearchCell: 40, wordsToFind: 6, coverMascot: 202, stripMascot: 72,
    reflectionMascot: 112, certificateMascot: 120, quickCalcColumns: 1,
    openAreaMinHeight: 135, passageWordCeiling: 300, reflectionLines: 5,
  },
  '3-5': {
    bodySize: 12, passageSize: 12, passageLineHeight: 1.62, quickCalcSize: 13.5,
    wordSearchCellFontSize: 12.5, calloutBodySize: 11, answerLinePitch: 26,
    defaultLinesPerPrompt: 3, writingPageLines: 12, wordSearchGrid: 10,
    wordSearchCell: 28.5, wordsToFind: 10, coverMascot: 187, stripMascot: 63,
    reflectionMascot: 97, certificateMascot: 112, quickCalcColumns: 2,
    openAreaMinHeight: 98, passageWordCeiling: 600, reflectionLines: 8,
  },
  '6-8': {
    bodySize: 11, passageSize: 11, passageLineHeight: 1.6, quickCalcSize: 13,
    wordSearchCellFontSize: 11.5, calloutBodySize: 10.5, answerLinePitch: 22,
    defaultLinesPerPrompt: 4, writingPageLines: 15, wordSearchGrid: 12,
    wordSearchCell: 26, wordsToFind: 14, coverMascot: 158, stripMascot: 57,
    reflectionMascot: 90, certificateMascot: 105, quickCalcColumns: 2,
    openAreaMinHeight: 90, passageWordCeiling: 900, reflectionLines: 10,
  },
};

/**
 * Resolves a grade band from whatever shape `grade` happens to be.
 *
 * The live data shape (see app/api/generate-pdf/route.ts) is a display
 * string built from the DB's GradeLevel enum ("K" | "1".."8"): "Kindergarten"
 * or "Grade N". This function is written defensively to also accept the raw
 * GradeLevel value, a bare number, or a numeric string, since callers may
 * pass any of those in the future.
 */
export function bandForGrade(grade: string | number | null | undefined): BandKey {
  if (grade === null || grade === undefined) return '3-5';

  if (typeof grade === 'number') {
    if (grade <= 2) return 'K-2';
    if (grade <= 5) return '3-5';
    return '6-8';
  }

  const s = grade.trim();
  if (/^k(indergarten)?$/i.test(s)) return 'K-2';

  const m = s.match(/\d+/);
  if (!m) return '3-5';

  const g = parseInt(m[0], 10);
  if (Number.isNaN(g)) return '3-5';
  if (g <= 2) return 'K-2';
  if (g <= 5) return '3-5';
  return '6-8';
}

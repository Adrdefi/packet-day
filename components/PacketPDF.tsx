// Server-side only — do not import from client components.
// Used exclusively by app/api/generate-pdf/route.ts via createElement().

import path from 'path';
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContentType } from "@/types";

Font.register({
  family: 'Nunito',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Bold.ttf'), fontWeight: 700 },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Regular.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(process.cwd(), 'public/fonts/Nunito-Bold.ttf'), fontWeight: 700, fontStyle: 'italic' },
  ],
});

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  cream: "#FDFBF7",
  dark: "#1A1A2E",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
  sage: "#4A7C59",
  sageDark: "#2E5238",
  sageBg: "#EFF6F1",
  honey: "#D4A843",
  honeyDark: "#A67C1E",
  honeyBg: "#FDF8EC",
  coral: "#E07A5F",
  coralBg: "#FDF1EE",
};

// 5-color activity rotation
const ACTIVITY_COLORS = [
  { bar: "#4A7C59", bg: "#EFF6F1", text: "#2E5238" }, // sage
  { bar: "#D4A843", bg: "#FDF8EC", text: "#A67C1E" }, // honey
  { bar: "#E07A5F", bg: "#FDF1EE", text: "#B85A40" }, // coral
  { bar: "#7B68EE", bg: "#F4F2FF", text: "#5548CC" }, // purple
  { bar: "#5BC0EB", bg: "#EBF8FE", text: "#2A8EAF" }, // sky blue
];

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
}

export interface PDFColoringPage {
  title: string;
  scene_description: string;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip emoji and non-renderable Unicode from text before PDF rendering.
 * Nunito covers Latin + Latin-Extended but not emoji blocks.
 *
 * Removed ranges:
 *  - Surrogate pairs (UTF-16 encoding of U+1F000+ emoji)
 *  - Misc symbols / dingbats (U+2600–U+27BF)
 *  - Supplemental arrows / misc technical (U+2B00–U+2BFF)
 *  - Variation selectors (U+FE00–U+FE0F)
 *  - Zero-width characters and BOM (U+200B–U+200D, U+FEFF)
 *  - Combining enclosing keycap (U+20E3)
 *
 * Math symbols ÷ (U+00F7) and × (U+00D7) are in Latin-1 Supplement which
 * Nunito covers, but the prompt now uses "x" / "divided by" instead, so
 * this function doesn't need to remap them.
 */
function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")   // surrogate pairs (emoji U+1F000+)
    .replace(/[\u2600-\u27BF]/g, "")                    // misc symbols, dingbats
    .replace(/[\u2B00-\u2BFF]/g, "")                    // supplemental arrows / misc tech
    .replace(/[\uFE00-\uFE0F]/g, "")                    // variation selectors
    .replace(/[\u200B-\u200D\uFEFF]/g, "")              // ZWJ, ZWNJ, BOM
    .replace(/\u20E3/g, "")                             // combining enclosing keycap
    .trim();
}

/**
 * Parse the child's grade string ("Kindergarten" or "Grade N") into a
 * three-band string used for layout decisions (line counts, answer space).
 */
function getGradeBand(childGrade: string): "K-2" | "3-5" | "6-8" {
  if (childGrade === "Kindergarten") return "K-2";
  const match = childGrade.match(/\d+/);
  const g = match ? parseInt(match[0], 10) : 3;
  if (g <= 2) return "K-2";
  if (g <= 5) return "3-5";
  return "6-8";
}

/** How many ruled writing lines to render in a writing-prompt activity. */
function writingLineCount(band: "K-2" | "3-5" | "6-8"): number {
  return band === "K-2" ? 12 : band === "3-5" ? 16 : 20;
}

/** How many answer lines to render under each worksheet question. */
function worksheetAnswerLines(band: "K-2" | "3-5" | "6-8"): number {
  return band === "K-2" ? 2 : band === "3-5" ? 3 : 4;
}

/**
 * Determine the content type for an activity.
 * Uses the explicit content_type field when present (new packets).
 * Falls back to subject-keyword heuristics for old packets that predate
 * the content_type field.
 */
function resolveContentType(activity: PDFActivity): ContentType {
  if (activity.content_type) return activity.content_type;

  const s = activity.subject.toLowerCase();
  if (s.includes("reading") || s.includes("comprehension")) return "reading_passage";
  if (
    s.includes("writing") || s.includes("journal") ||
    s.includes("story") || s.includes("creative")
  ) return "writing_prompt";
  if (s.includes("art") || s.includes("coloring") || s.includes("drawing")) return "coloring";
  if (s.includes("pe") || s.includes("movement") || s.includes("exercise")) return "movement_activity";
  return "worksheet";
}

// Twemoji CDN PNG icons — rendered via react-pdf Image so emoji glyphs are not needed
const TWEMOJI_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/';
function getSubjectIconUrl(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('math'))                              return TWEMOJI_BASE + '1f9ee.png'; // abacus
  if (s.includes('read') || s.includes('compreh'))    return TWEMOJI_BASE + '1f4d6.png'; // open book
  if (s.includes('writ') || s.includes('journal') || s.includes('story')) return TWEMOJI_BASE + '270f.png';  // pencil
  if (s.includes('sci'))                              return TWEMOJI_BASE + '1f52c.png'; // microscope
  return TWEMOJI_BASE + '1f3c6.png'; // trophy — PE, art, creative, history, general
}

function formatPDFDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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
  if (s.includes("math")) return `Try making up your own math problem inspired by "${title}"! Can you solve it too?`;
  if (s.includes("read") || s.includes("writ")) return `Write 2-3 sentences about what "${title}" makes you think of. Use your best descriptive words!`;
  if (s.includes("sci")) return `What's one experiment you could do at home related to "${title}"? Describe it step by step!`;
  if (s.includes("art")) return `Draw something inspired by "${title}" using only 3 colors. See what you can create!`;
  if (s.includes("hist") || s.includes("social")) return `If you could time-travel to learn more about "${title}", where would you go? Write 2 sentences about it!`;
  return `Can you teach someone else what you learned about "${title}" today? Try explaining it in 3 sentences!`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Cover page ─────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: C.cream,
    padding: 56,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 10,
    color: C.sage,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  coverCenter: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  // Emoji cluster above mascot (shown always on cover)
  coverEmojiCluster: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: 4,
  },
  // Fallback emoji row (when no mascot image)
  themeEmojiRow: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: 4,
  },
  childAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.white,
    borderWidth: 3,
    borderColor: C.sage,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  childAvatarEmoji: {
    fontSize: 44,
    textAlign: "center",
  },
  // Mascot image — 320x320 square with contain fit
  mascotImageCover: {
    width: 320,
    height: 320,
    objectFit: "contain",
    marginBottom: 16,
    alignSelf: "center",
  },
  mascotNameText: {
    fontSize: 11,
    fontFamily: "Nunito",
    fontWeight: 700,
    color: C.sage,
    textAlign: "center",
    marginBottom: 4,
  },
  // Title banner strip
  titleBanner: {
    backgroundColor: C.sage,
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 6,
    alignItems: "center",
  },
  packetTitle: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 28,
    color: C.white,
    textAlign: "center",
    lineHeight: 1.25,
  },
  packetSubtitle: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    marginBottom: 20,
    marginTop: 6,
  },
  // Speech bubble arrow (triangle pointing up toward mascot)
  speechBubbleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: C.sage,
    alignSelf: "center",
    marginBottom: 0,
  },
  greetingBox: {
    borderWidth: 2,
    borderColor: C.sage,
    borderRadius: 12,
    padding: 18,
    backgroundColor: C.sageBg,
    width: "100%",
  },
  greetingText: {
    fontSize: 11,
    color: C.sageDark,
    lineHeight: 1.75,
    fontFamily: "Nunito",
    fontStyle: 'italic',
    textAlign: "center",
  },
  coverFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  coverFooterText: {
    fontSize: 9,
    color: C.muted,
  },
  coverFooterDot: {
    fontSize: 9,
    color: C.border,
  },

  // ── Activity page ───────────────────────────────────────────────────────────
  activityPage: {
    flexDirection: "column",
    // backgroundColor set dynamically
  },
  activityBar: {
    height: 96,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 14,
    // backgroundColor set dynamically
  },
  activityBarEmoji: {
    fontSize: 34,
    width: 42,
    textAlign: "center",
  },
  activityBarLeft: {
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  activityBarSubject: {
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Nunito",
    fontWeight: 700,
  },
  activityBarTitle: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 16,
    color: C.white,
    lineHeight: 1.3,
  },
  activityBarTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Nunito",
    fontWeight: 700,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  // Mascot in top-right corner of activity bar — 80x80
  mascotImageCorner: {
    position: "absolute",
    top: 8,
    right: 14,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  // Speech bubble below activity bar
  mascotSpeechBubble: {
    marginHorizontal: 36,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    backgroundColor: C.white,
    // borderColor set dynamically
  },
  mascotSpeechText: {
    fontSize: 11,
    color: C.dark,
    fontFamily: "Nunito",
    fontStyle: 'italic',
    textAlign: "center",
  },
  activityContent: {
    padding: 36,
    flex: 1,
    flexDirection: "column",
  },

  // Materials
  materialsBox: {
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: C.border,
  },
  materialsLabel: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginRight: 8,
    paddingTop: 1,
  },
  materialsText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
    flex: 1,
  },

  // Description box — borderLeftColor set dynamically
  descriptionBox: {
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 12,
    marginBottom: 18,
    // backgroundColor and borderLeftColor set dynamically
  },
  descriptionText: {
    fontSize: 11.5,
    color: C.dark,
    fontFamily: "Nunito",
    fontStyle: 'italic',
    lineHeight: 1.65,
  },

  // Instructions
  instructionsLabel: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  instructionRow: {
    flexDirection: "row",
    marginBottom: 9,
    alignItems: "flex-start",
  },
  // Checkbox before bullet number
  instructionCheckbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    borderRadius: 2,
    marginRight: 8,
    flexShrink: 0,
    marginTop: 4,
  },
  instructionBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
    marginTop: 0,
    // backgroundColor set dynamically
  },
  instructionBulletText: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 11,
    // color set dynamically
  },
  instructionText: {
    fontSize: 11.5,
    color: C.dark,
    lineHeight: 1.55,
    flex: 1,
  },

  // Work area — dotted lines
  workArea: {
    marginTop: 18,
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  workAreaLabel: {
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Nunito",
    fontWeight: 700,
    marginBottom: 10,
  },
  workLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: "dotted",
    borderBottomColor: "#D1D5DB",
    marginBottom: 18,
  },

  // Bonus challenge box
  bonusChallengeBox: {
    backgroundColor: C.honeyBg,
    borderWidth: 2,
    borderColor: C.honey,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  bonusChallengeHeader: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 10,
    color: C.honeyDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  bonusChallengeText: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.5,
    fontFamily: "Nunito",
    fontStyle: 'italic',
  },

  // Answer key
  answerKeyBox: {
    backgroundColor: C.honeyBg,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: C.honey,
  },
  answerKeyHeader: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 9,
    color: C.honeyDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  answerKeyText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.6,
  },

  // ── Notes page ──────────────────────────────────────────────────────────────
  notesPage: {
    backgroundColor: C.white,
    padding: 48,
    flexDirection: "column",
  },
  notesPageTitle: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 22,
    color: C.dark,
    marginBottom: 6,
  },
  notesPageSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 24,
  },
  // Mascot in top-right corner of notes page
  mascotImageNotes: {
    position: "absolute",
    top: 40,
    right: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  sectionLabel: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
    flex: 1,
  },
  summaryCheckboxes: {
    fontSize: 10,
    color: C.muted,
    marginLeft: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  parentNoteBox: {
    backgroundColor: C.sageBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  parentNoteText: {
    fontSize: 10.5,
    color: C.sageDark,
    lineHeight: 1.7,
    fontFamily: "Nunito",
    fontStyle: 'italic',
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
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 9,
    color: C.honeyDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reflectionText: {
    fontSize: 13,
    color: C.dark,
    lineHeight: 1.75,
    fontFamily: "Nunito",
    fontStyle: 'italic',
  },
  observationsLabel: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 12,
    color: C.dark,
    marginBottom: 18,
  },
  ruledLine: {
    borderBottomWidth: 1,
    borderBottomStyle: "dotted",
    borderBottomColor: "#D1D5DB",
    marginBottom: 26,
  },
  notesFooter: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8.5,
    color: C.muted,
  },

  // ── Mascot emoji cluster (cover, no-image fallback) ──────────────────────────
  mascotEmojiText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 4,
  },

  // ── Coloring page ───────────────────────────────────────────────────────────
  coloringPage: {
    backgroundColor: C.cream,
    padding: 48,
    flexDirection: "column",
    alignItems: "center",
  },
  colorMeText: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 26,
    color: C.sage,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  coloringTitle: {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: 28,
    color: C.dark,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 1.25,
  },
  coloringBox: {
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderColor: "#A3C4B0",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 12,
    width: "100%",
  },
  coloringBoxImage: {
    width: 420,
    height: 420,
    objectFit: "contain",
  },
  coloringBoxPlaceholder: {
    fontSize: 13,
    color: "#A3C4B0",
    textAlign: "center",
    fontFamily: "Nunito",
    fontStyle: 'italic',
    lineHeight: 1.7,
    width: 420,
    height: 420,
  },
  coloringInstructionBubble: {
    borderWidth: 2,
    borderColor: "#A3C4B0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.white,
    width: "100%",
    marginTop: 4,
  },
  coloringInstructionText: {
    fontSize: 12,
    color: C.sageDark,
    textAlign: "center",
    fontFamily: "Nunito",
    fontStyle: 'italic',
    lineHeight: 1.6,
  },

  // ── Question box (Templates A + B) ─────────────────────────────────────────
  questionBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    paddingBottom: 8,
    marginBottom: 10,
  },
  answerLineInBox: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted',
    borderBottomColor: '#D1D5DB',
    marginTop: 12,
  },

  // ── Reading passage block (Template B) ──────────────────────────────────────
  readingPassageBlock: {
    backgroundColor: '#FFFBF0',
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  readingPassageLabel: {
    fontSize: 8,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: '#A67C1E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  readingPassageText: {
    fontSize: 11.5,
    lineHeight: 1.7,
    color: C.dark,
    fontFamily: 'Nunito',
    fontStyle: 'italic',
  },

  // ── Open workspace (Template C) ─────────────────────────────────────────────
  promptBubble: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.white,
    marginBottom: 16,
  },
  promptBubbleText: {
    fontSize: 12,
    color: C.dark,
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    lineHeight: 1.6,
  },
  promptInstructionText: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.5,
    marginTop: 8,
  },
  writingSpaceHeader: {
    fontSize: 9,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  writingLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted',
    borderBottomColor: '#D1D5DB',
    marginBottom: 26,
  },
  drawBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 340,
  },
  drawBoxLabel: {
    fontSize: 14,
    color: '#C4C9D4',
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Math structured sections (Template A — math subject) ────────────────────
  mathSectionBar: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
    marginTop: 10,
  },
  mathSectionBarText: {
    fontSize: 8,
    fontFamily: 'Nunito',
    fontWeight: 700,
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
    fontSize: 9,
    fontFamily: 'Nunito',
    fontWeight: 700,
    color: C.muted,
    marginRight: 6,
    marginTop: 2,
  },
  mathCalcEquation: {
    fontSize: 11.5,
    color: C.dark,
    fontFamily: 'Nunito',
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
  },
  mathWordText: {
    fontSize: 11,
    color: C.dark,
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
    fontSize: 11,
    color: C.dark,
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    lineHeight: 1.55,
  },
  mathDrawBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mathDrawBoxLabel: {
    fontSize: 10,
    color: '#C4C9D4',
    fontFamily: 'Nunito',
    fontStyle: 'italic',
  },
  mathAnswerLineLabel: {
    fontSize: 10,
    color: C.muted,
    fontFamily: 'Nunito',
    marginBottom: 4,
  },
  mathAnswerLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: 'dotted',
    borderBottomColor: '#D1D5DB',
  },

  // ── Movement activity reflection box ────────────────────────────────────────
  movementReflectionBox: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    backgroundColor: '#F9FAFB',
  },
  movementReflectionLabel: {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  movementReflectionLines: {
    borderBottomWidth: 1,
    borderBottomStyle: 'dotted' as const,
    borderBottomColor: '#D1D5DB',
    marginBottom: 22,
  },

  // ── Mid-page mascot encouragement strip ─────────────────────────────────────
  midPageEncouragement: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  midPageMascotImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  midPageSpeechBubble: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    backgroundColor: C.white,
  },
  midPageSpeechText: {
    fontSize: 9.5,
    fontFamily: 'Nunito',
    fontStyle: 'italic',
    color: C.dark,
    lineHeight: 1.4,
  },

  // ── Star reward box ──────────────────────────────────────────────────────────
  starRewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 6,
    paddingRight: 4,
  },
  starRewardText: {
    fontSize: 9,
    color: C.muted,
    fontFamily: 'Nunito',
  },
  starChar: {
    fontSize: 18,
    lineHeight: 1,
    marginHorizontal: 3,
  },

  // ── Fun fact bubble (cover page) ─────────────────────────────────────────────
  funFactBox: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1.5,
    borderColor: C.honey,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginTop: 10,
  },
  funFactText: {
    fontSize: 10,
    color: C.honeyDark,
    fontFamily: 'Nunito',
    lineHeight: 1.6,
    textAlign: 'center',
  },

  // ── Subject icon in activity top bar ────────────────────────────────────────
  subjectIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },

  // ── Star reward outlined boxes ───────────────────────────────────────────────
  starBox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  starBoxText: {
    fontSize: 12,
    fontFamily: 'Nunito',
    fontWeight: 700,
    lineHeight: 1,
  },
});

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
}: PacketPDFProps) {
  const totalMinutes = activities.reduce((s, a) => s + a.estimated_minutes, 0);

  return (
    <Page size="LETTER" style={styles.coverPage}>
      {/* Top wordmark */}
      <View>
        <Text style={styles.wordmark}>Packet Day</Text>
      </View>

      {/* Center block */}
      <View style={styles.coverCenter}>
        {mascotImageUrl ? (
          <>
            {/* Mascot — 320x320 image inside 340-height container */}
            <View style={{ height: 340, alignItems: "center", justifyContent: "center" }}>
              <Image src={mascotImageUrl} style={styles.mascotImageCover} />
            </View>
            {mascotName && (
              <Text style={styles.mascotNameText}>{mascotName}</Text>
            )}
          </>
        ) : (
          <View style={styles.childAvatarCircle}>
            <Text style={styles.childAvatarEmoji}>{childEmoji}</Text>
          </View>
        )}

        {/* Title banner strip */}
        <View style={styles.titleBanner}>
          <Text style={styles.packetTitle}>{sanitizeText(title)}</Text>
        </View>

        <Text style={styles.packetSubtitle}>
          A day of learning made just for {childName}  |  {formatPDFDate(createdAt)}
        </Text>

        {/* Greeting box */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>
            {sanitizeText(greeting) || greetingMessage(childName, theme)}
          </Text>
        </View>
      </View>

      {/* Fun fact bubble */}
      <View style={styles.funFactBox}>
        <Text style={styles.funFactText}>
          {"Did you know? Today's packet has " + activities.length + " activities and " + totalMinutes + " minutes of learning made just for " + childName + "!"}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>Made with love by Packet Day</Text>
        <Text style={styles.coverFooterDot}>  |  </Text>
        <Text style={styles.coverFooterText}>packetday.com</Text>
      </View>
    </Page>
  );
}

// ─── Activity page ────────────────────────────────────────────────────────────

// Shared colored top bar + encouragement speech bubble used by all three templates
function ActivityTopBar({
  activity,
  colors,
  childName,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: (typeof ACTIVITY_COLORS)[0];
  childName: string;
  mascotImageUrl?: string | null;
}) {
  return (
    <>
      <View style={[styles.activityBar, { backgroundColor: colors.bar }]}>
        <View style={styles.activityBarLeft}>
          {/* Subject row: twemoji PNG icon + subject label */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image src={getSubjectIconUrl(activity.subject)} style={styles.subjectIcon} />
            <Text style={styles.activityBarSubject}>{activity.subject}</Text>
          </View>
          <Text style={styles.activityBarTitle}>{sanitizeText(activity.title)}</Text>
        </View>
        <Text style={styles.activityBarTime}>{activity.estimated_minutes} min</Text>
        {mascotImageUrl && (
          <Image src={mascotImageUrl} style={styles.mascotImageCorner} />
        )}
      </View>
      {mascotImageUrl && (
        <View style={[styles.mascotSpeechBubble, { borderColor: colors.bar }]}>
          <Text style={styles.mascotSpeechText}>
            {sanitizeText(activity.encouragement) || `Let's go, ${childName}! You've got this!`}
          </Text>
        </View>
      )}
    </>
  );
}

// Mid-page mascot encouragement strip — shown after instructions, before answer area
function MidPageEncouragement({
  activity,
  colors,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: (typeof ACTIVITY_COLORS)[0];
  mascotImageUrl?: string | null;
}) {
  if (!mascotImageUrl) return null;
  return (
    <View wrap={false} style={[styles.midPageEncouragement, { backgroundColor: colors.bg }]}>
      <Image src={mascotImageUrl} style={styles.midPageMascotImage} />
      <View style={[styles.midPageSpeechBubble, { borderColor: colors.bar }]}>
        <Text style={styles.midPageSpeechText}>
          {activity.encouragement || 'Keep going - you are doing amazing!'}
        </Text>
      </View>
    </View>
  );
}

// Star reward row — "How did I do today?" shown above the answer key on every page.
// Uses outlined boxes with "*" instead of unicode star glyphs (no emoji font support).
function StarRewardBox({ colors }: { colors: (typeof ACTIVITY_COLORS)[0] }) {
  return (
    <View wrap={false} style={styles.starRewardBox}>
      <Text style={styles.starRewardText}>How did I do today?</Text>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.starBox, { borderColor: colors.bar }]}>
          <Text style={[styles.starBoxText, { color: colors.bar }]}>*</Text>
        </View>
      ))}
      <Text style={styles.starRewardText}>Circle your stars!</Text>
    </View>
  );
}

// ── Math section renderer ─────────────────────────────────────────────────────
// Parses the 3 labeled sections produced by the math activity prompt and renders
// each with a distinct visual treatment.

function MathSections({
  instructions,
  colors,
}: {
  instructions: string[];
  colors: (typeof ACTIVITY_COLORS)[0];
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

    if (step.includes('QUICK CALCULATIONS')) {
      quickCalcsLabel = label;
      // Strip optional "Solve these problems:" sub-header if Claude added one
      const cleaned = rest.replace(/^solve these problems:\s*/i, '');
      // New packets use ' || ' separator; old packets used ' / '.
      // Try || first; fall back to / so old stored packets still render.
      const byPipe = cleaned.split(' || ').map((s) => s.trim()).filter(Boolean);
      quickCalcs = byPipe.length > 1 ? byPipe : cleaned.split(' / ').map((s) => s.trim()).filter(Boolean);
    } else if (step.includes('WORD PROBLEMS')) {
      const byPipe = rest.split(' || ').map((s) => s.trim()).filter(Boolean);
      wordProblems = byPipe.length > 1 ? byPipe : rest.split(' / ').map((s) => s.trim()).filter(Boolean);
    } else if (step.includes('DRAW & SOLVE')) {
      drawAndSolve = rest;
    }
  }

  return (
    <>
      {/* ── Section 1: Quick Calculations — 2-column grid ── */}
      <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
        <Text style={styles.mathSectionBarText}>{"[ " + quickCalcsLabel + " ]"}</Text>
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

      {/* ── Section 2: Word Problems — shaded boxes with answer lines ── */}
      <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
        <Text style={styles.mathSectionBarText}>{"[ Word Problems ]"}</Text>
      </View>
      {wordProblems.map((prob, i) => (
        <View wrap={false} key={i} style={styles.mathWordBox}>
          <Text style={styles.mathWordText}>{prob}</Text>
          <View style={styles.answerLineInBox} />
          <View style={styles.answerLineInBox} />
        </View>
      ))}

      {/* ── Section 3: Draw & Solve — prompt bubble + draw box + answer line ── */}
      {drawAndSolve !== '' && (
        <>
          <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
            <Text style={styles.mathSectionBarText}>{"[ Draw & Solve ]"}</Text>
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

// ── Template A — Worksheet (math, science, general) ──────────────────────────
// Math activities: structured 3-section rendering via MathSections.
// All other subjects: each instruction step in its own shaded box with 3 answer lines.

function WorksheetTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: (typeof ACTIVITY_COLORS)[0];
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
}) {
  const bulletBgStyle = [styles.instructionBullet, { backgroundColor: colors.bg + "CC" }];
  const bulletTextStyle = [styles.instructionBulletText, { color: colors.bar }];
  const band = getGradeBand(childGrade);
  const answerLines = worksheetAnswerLines(band);

  return (
    <Page size="LETTER" style={[styles.activityPage, { backgroundColor: colors.bg }]}>
      <ActivityTopBar activity={activity} colors={colors} childName={childName} mascotImageUrl={mascotImageUrl} />

      <View style={styles.activityContent}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View wrap={false} style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>{activity.materials.join("  /  ")}</Text>
          </View>
        )}

        {/* Description */}
        <View wrap={false} style={[styles.descriptionBox, { backgroundColor: C.white, borderLeftColor: colors.bar }]}>
          <Text style={styles.descriptionText}>{sanitizeText(activity.description)}</Text>
        </View>

        {/* Instructions — math gets structured sections; everything else gets shaded boxes */}
        {activity.subject.toLowerCase().includes('math') ? (
          <MathSections instructions={activity.instructions} colors={colors} />
        ) : (
          <>
            <Text style={styles.instructionsLabel}>
              {'[ How to do it ]'}
            </Text>
            {activity.instructions.map((step, i) => (
              <View wrap={false} key={i} style={styles.questionBox}>
                <View style={[styles.instructionRow, { marginBottom: 0 }]}>
                  <View style={styles.instructionCheckbox} />
                  <View style={bulletBgStyle}>
                    <Text style={bulletTextStyle}>{i + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{sanitizeText(step)}</Text>
                </View>
                {Array.from({ length: answerLines }, (_, j) => (
                  <View key={j} style={styles.answerLineInBox} />
                ))}
              </View>
            ))}
          </>
        )}

        {/* Mid-page mascot encouragement */}
        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />

        {/* Bonus challenge */}
        <View wrap={false} style={styles.bonusChallengeBox}>
          <Text style={styles.bonusChallengeHeader}>BONUS CHALLENGE</Text>
          <Text style={styles.bonusChallengeText}>
            {bonusChallenge(activity.subject, activity.title)}
          </Text>
        </View>

        {/* Star reward */}
        <StarRewardBox colors={colors} />

        {/* Answer key */}
        {activity.answer_key && (
          <View wrap={false} style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>FOR GROWN-UPS ONLY</Text>
            <Text style={styles.answerKeyText}>{sanitizeText(activity.answer_key)}</Text>
          </View>
        )}
      </View>
    </Page>
  );
}

// ── Template B — Reading Passage ──────────────────────────────────────────────
// Passage in a cream-tinted block with activity-color left border.
// Comprehension questions each get their own shaded box with 2 answer lines.

function ReadingTemplate({
  activity,
  colors,
  childName,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: (typeof ACTIVITY_COLORS)[0];
  childName: string;
  mascotImageUrl?: string | null;
}) {
  const bulletBgStyle = [styles.instructionBullet, { backgroundColor: colors.bg + "CC" }];
  const bulletTextStyle = [styles.instructionBulletText, { color: colors.bar }];

  // Prefer the explicit passage field (new packets).
  // Fall back to the length-heuristic for old packets that embedded the
  // passage as the longest instruction entry.
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
      <ActivityTopBar activity={activity} colors={colors} childName={childName} mascotImageUrl={mascotImageUrl} />

      <View style={styles.activityContent}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View wrap={false} style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>{activity.materials.join("  /  ")}</Text>
          </View>
        )}

        {/* Reading passage — cream bg + activity-color left border */}
        {passage && (
          <View style={[styles.readingPassageBlock, { borderLeftWidth: 4, borderLeftColor: colors.bar }]}>
            <Text style={styles.readingPassageLabel}>{"[ Read This ]"}</Text>
            <Text style={styles.readingPassageText}>{sanitizeText(passage)}</Text>
          </View>
        )}

        {/* Comprehension questions — each in a shaded box with 2 answer lines */}
        {questions.length > 0 && (
          <Text style={styles.instructionsLabel}>{"[ Comprehension Questions ]"}</Text>
        )}
        {questions.map((step, i) => (
          <View wrap={false} key={i} style={styles.questionBox}>
            <View style={[styles.instructionRow, { marginBottom: 0 }]}>
              <View style={styles.instructionCheckbox} />
              <View style={bulletBgStyle}>
                <Text style={bulletTextStyle}>{i + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{sanitizeText(step)}</Text>
            </View>
            <View style={styles.answerLineInBox} />
            <View style={styles.answerLineInBox} />
          </View>
        ))}

        {/* Mid-page mascot encouragement */}
        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />

        {/* Star reward */}
        <StarRewardBox colors={colors} />

        {/* Answer key */}
        {activity.answer_key && (
          <View wrap={false} style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>FOR GROWN-UPS ONLY</Text>
            <Text style={styles.answerKeyText}>{sanitizeText(activity.answer_key)}</Text>
          </View>
        )}
      </View>
    </Page>
  );
}

// ── Template C — Open Workspace (writing, movement, coloring) ────────────────
// Response area is determined by content_type:
//   writing_prompt  → ruled writing lines (grade-appropriate count)
//   movement_activity → small "How did it go?" reflection box
//   coloring        → large open draw box

function OpenWorkspaceTemplate({
  activity,
  colors,
  childName,
  childGrade,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: (typeof ACTIVITY_COLORS)[0];
  childName: string;
  childGrade: string;
  mascotImageUrl?: string | null;
}) {
  const contentType = resolveContentType(activity);
  const band = getGradeBand(childGrade);
  const lineCount = writingLineCount(band);

  return (
    <Page size="LETTER" style={[styles.activityPage, { backgroundColor: colors.bg }]}>
      <ActivityTopBar activity={activity} colors={colors} childName={childName} mascotImageUrl={mascotImageUrl} />

      <View style={styles.activityContent}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View wrap={false} style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>{activity.materials.join("  /  ")}</Text>
          </View>
        )}

        {/* Prompt bubble — description + instruction steps */}
        <View style={styles.promptBubble}>
          <Text style={styles.promptBubbleText}>{sanitizeText(activity.description)}</Text>
          {activity.instructions.map((step, i) => (
            <Text key={i} style={styles.promptInstructionText}>
              {i + 1}. {sanitizeText(step)}
            </Text>
          ))}
        </View>

        {/* Mid-page mascot encouragement */}
        <MidPageEncouragement activity={activity} colors={colors} mascotImageUrl={mascotImageUrl} />

        {/* Response area — routed by content_type */}
        {contentType === "writing_prompt" && (
          <>
            <Text style={styles.writingSpaceHeader}>My Writing Space</Text>
            {Array.from({ length: lineCount }, (_, i) => (
              <View key={i} style={styles.writingLine} />
            ))}
          </>
        )}

        {contentType === "movement_activity" && (
          <View wrap={false} style={styles.movementReflectionBox}>
            <Text style={styles.movementReflectionLabel}>How did it go?</Text>
            {Array.from({ length: 3 }, (_, i) => (
              <View key={i} style={styles.movementReflectionLines} />
            ))}
          </View>
        )}

        {contentType === "coloring" && (
          <View style={styles.drawBox}>
            <Text style={styles.drawBoxLabel}>Draw or write here</Text>
          </View>
        )}

        {/* Star reward */}
        <StarRewardBox colors={colors} />
      </View>
    </Page>
  );
}

// ── Dispatcher — picks the right template based on content_type ───────────────

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
  const colors = ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];
  const contentType = resolveContentType(activity);

  if (contentType === "reading_passage") {
    return (
      <ReadingTemplate
        activity={activity}
        colors={colors}
        childName={childName}
        mascotImageUrl={mascotImageUrl}
      />
    );
  }
  if (
    contentType === "writing_prompt" ||
    contentType === "movement_activity" ||
    contentType === "coloring"
  ) {
    return (
      <OpenWorkspaceTemplate
        activity={activity}
        colors={colors}
        childName={childName}
        childGrade={childGrade}
        mascotImageUrl={mascotImageUrl}
      />
    );
  }
  // "worksheet" — math, science, history
  return (
    <WorksheetTemplate
      activity={activity}
      colors={colors}
      childName={childName}
      childGrade={childGrade}
      mascotImageUrl={mascotImageUrl}
    />
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
      {/* Mascot — 120x120 top-right corner */}
      {mascotImageUrl && (
        <Image src={mascotImageUrl} style={styles.mascotImageNotes} />
      )}

      <Text style={styles.notesPageTitle}>Today's Packet at a Glance</Text>
      <Text style={styles.notesPageSubtitle}>
        {activities.length} activities  |  {" "}
        {activities.reduce((s, a) => s + a.estimated_minutes, 0)} min total
      </Text>

      {/* Activity summary with color dots + star checkboxes */}
      <Text style={styles.sectionLabel}>Activity Summary</Text>
      {activities.map((activity, i) => {
        const colors = ACTIVITY_COLORS[i % ACTIVITY_COLORS.length];
        return (
          <View key={i} style={styles.summaryRow}>
            <View
              style={[styles.summaryColorDot, { backgroundColor: colors.bar }]}
            />
            <Text style={styles.summaryText}>
              <Text style={{ fontFamily: "Nunito", fontWeight: 700 }}>
                {activity.subject}:{" "}
              </Text>
              {activity.title} - {activity.estimated_minutes} min
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}>
              {[0, 1, 2, 3, 4].map((j) => (
                <View
                  key={j}
                  style={{
                    width: 10,
                    height: 10,
                    borderWidth: 1.5,
                    borderColor: colors.bar,
                    borderRadius: 2,
                    marginLeft: 6,
                  }}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* Parent note */}
      <View style={{ marginTop: 24, marginBottom: 6 }}>
        <Text style={styles.sectionLabel}>A Note for You</Text>
      </View>
      <View style={styles.parentNoteBox}>
        <Text style={styles.parentNoteText}>
          {sanitizeText(parentNotes) || parentNote(childName, theme)}
        </Text>
      </View>

      {/* Observation lines */}
      <Text style={styles.observationsLabel}>My Observations</Text>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={styles.ruledLine} />
      ))}

      {/* Footer */}
      <View style={styles.notesFooter}>
        <Text style={styles.footerText}>Made with love by Packet Day</Text>
        <Text style={styles.footerText}>
          packetday.com  |  {formatPDFDate(createdAt)}
        </Text>
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
      {/* "Color me!" heading */}
      <Text style={styles.colorMeText}>Color me!</Text>

      {/* Title */}
      <Text style={styles.coloringTitle}>{coloringPage.title}</Text>

      {/* Coloring area */}
      <View style={styles.coloringBox}>
        {imageUrl ? (
          <Image src={imageUrl} style={styles.coloringBoxImage} />
        ) : (
          <Text style={styles.coloringBoxPlaceholder}>
            Draw your scene here!
          </Text>
        )}
      </View>

      {/* Instructions as speech bubble at bottom */}
      <View style={styles.coloringInstructionBubble}>
        <Text style={styles.coloringInstructionText}>
          {coloringPage.instructions}
        </Text>
      </View>
    </Page>
  );
}

// ─── Reflection page ─────────────────────────────────────────────────────────

function ReflectionPage({ childName, theme, createdAt, dailyReflection }: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.notesPage}>
      <Text style={styles.notesPageTitle}>Daily Reflection</Text>
      <Text style={styles.notesPageSubtitle}>
        Take a moment to think about today's learning.
      </Text>

      <View style={styles.reflectionBox}>
        <Text style={styles.reflectionLabel}>Daily Reflection Question</Text>
        <Text style={styles.reflectionText}>
          {sanitizeText(dailyReflection) || reflectionQuestion(theme)}
        </Text>
      </View>

      {/* Writing lines */}
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} style={styles.ruledLine} />
      ))}

      <View style={styles.notesFooter}>
        <Text style={styles.footerText}>Made with love by Packet Day</Text>
        <Text style={styles.footerText}>
          packetday.com  |  {formatPDFDate(createdAt)}
        </Text>
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
      subject={`${props.theme} • ${props.childName}`}
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
      {props.coloringPage && (
        <ColoringPage
          coloringPage={props.coloringPage}
          coloringImageUrl={props.coloringImageUrl}
          mascotImageUrl={props.mascotImageUrl}
        />
      )}
      <ReflectionPage {...props} />
    </Document>
  );
}

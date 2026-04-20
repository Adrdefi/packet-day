// Server-side only — do not import from client components.
// Used exclusively by app/api/generate-pdf/route.ts via createElement().

import path from 'path';
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripNonAscii(text: string): string {
  return text.replace(/[^\x00-\x7F]/g, '');
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
}: PacketPDFProps) {
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
          <Text style={styles.packetTitle}>{title}</Text>
        </View>

        <Text style={styles.packetSubtitle}>
          A day of learning made just for {childName}  |  {formatPDFDate(createdAt)}
        </Text>

        {/* Greeting box */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>
            {greeting || greetingMessage(childName, theme)}
          </Text>
        </View>
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
        <Text style={styles.activityBarEmoji}>{""}</Text>
        <View style={styles.activityBarLeft}>
          <Text style={styles.activityBarSubject}>{activity.subject}</Text>
          <Text style={styles.activityBarTitle}>{activity.title}</Text>
        </View>
        <Text style={styles.activityBarTime}>{activity.estimated_minutes} min</Text>
        {mascotImageUrl && (
          <Image src={mascotImageUrl} style={styles.mascotImageCorner} />
        )}
      </View>
      {mascotImageUrl && (
        <View style={[styles.mascotSpeechBubble, { borderColor: colors.bar }]}>
          <Text style={styles.mascotSpeechText}>
            {activity.encouragement || `Let's go, ${childName}! You've got this!`}
          </Text>
        </View>
      )}
    </>
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
      quickCalcs = cleaned.split(' / ').map((s) => s.trim()).filter(Boolean);
    } else if (step.includes('WORD PROBLEMS')) {
      wordProblems = rest.split(' / ').map((s) => s.trim()).filter(Boolean);
    } else if (step.includes('DRAW & SOLVE')) {
      drawAndSolve = rest;
    }
  }

  return (
    <>
      {/* ── Section 1: Quick Calculations — 2-column grid ── */}
      <View style={[styles.mathSectionBar, { backgroundColor: colors.bar }]}>
        <Text style={styles.mathSectionBarText}>{quickCalcsLabel}</Text>
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
        <Text style={styles.mathSectionBarText}>Word Problems</Text>
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
            <Text style={styles.mathSectionBarText}>Draw & Solve</Text>
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
  mascotImageUrl,
}: {
  activity: PDFActivity;
  colors: (typeof ACTIVITY_COLORS)[0];
  childName: string;
  mascotImageUrl?: string | null;
}) {
  const bulletBgStyle = [styles.instructionBullet, { backgroundColor: colors.bg + "CC" }];
  const bulletTextStyle = [styles.instructionBulletText, { color: colors.bar }];

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
          <Text style={styles.descriptionText}>{activity.description}</Text>
        </View>

        {/* Instructions — math gets structured sections; everything else gets shaded boxes */}
        {activity.subject.toLowerCase().includes('math') ? (
          <MathSections instructions={activity.instructions} colors={colors} />
        ) : (
          <>
            <Text style={styles.instructionsLabel}>How to do it</Text>
            {activity.instructions.map((step, i) => (
              <View wrap={false} key={i} style={styles.questionBox}>
                <View style={[styles.instructionRow, { marginBottom: 0 }]}>
                  <View style={styles.instructionCheckbox} />
                  <View style={bulletBgStyle}>
                    <Text style={bulletTextStyle}>{i + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
                <View style={styles.answerLineInBox} />
                <View style={styles.answerLineInBox} />
                <View style={styles.answerLineInBox} />
              </View>
            ))}
          </>
        )}

        {/* Bonus challenge */}
        <View wrap={false} style={styles.bonusChallengeBox}>
          <Text style={styles.bonusChallengeHeader}>BONUS CHALLENGE</Text>
          <Text style={styles.bonusChallengeText}>
            {bonusChallenge(activity.subject, activity.title)}
          </Text>
        </View>

        {/* Answer key */}
        {activity.answer_key && (
          <View wrap={false} style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>FOR GROWN-UPS ONLY</Text>
            <Text style={styles.answerKeyText}>{activity.answer_key}</Text>
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

  const passageIndex = activity.instructions.findIndex((s) => s.length > 200);
  const passage = passageIndex !== -1 ? activity.instructions[passageIndex] : null;
  const questions = activity.instructions.filter((_, i) => i !== passageIndex);

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
          <View wrap={false} style={[styles.readingPassageBlock, { borderLeftWidth: 4, borderLeftColor: colors.bar }]}>
            <Text style={styles.readingPassageLabel}>Read This</Text>
            <Text style={styles.readingPassageText}>{passage}</Text>
          </View>
        )}

        {/* Comprehension questions — each in a shaded box with 2 answer lines */}
        {questions.length > 0 && (
          <Text style={styles.instructionsLabel}>Comprehension Questions</Text>
        )}
        {questions.map((step, i) => (
          <View wrap={false} key={i} style={styles.questionBox}>
            <View style={[styles.instructionRow, { marginBottom: 0 }]}>
              <View style={styles.instructionCheckbox} />
              <View style={bulletBgStyle}>
                <Text style={bulletTextStyle}>{i + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{stripNonAscii(step)}</Text>
            </View>
            <View style={styles.answerLineInBox} />
            <View style={styles.answerLineInBox} />
          </View>
        ))}

        {/* Answer key */}
        {activity.answer_key && (
          <View wrap={false} style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>FOR GROWN-UPS ONLY</Text>
            <Text style={styles.answerKeyText}>{activity.answer_key}</Text>
          </View>
        )}
      </View>
    </Page>
  );
}

// ── Template C — Open Workspace (writing, art, PE, creative) ─────────────────
// Prompt bubble with description + instructions, then maximum open space:
// ruled writing lines for writing/journal/story, or a large draw box for art/PE.

function OpenWorkspaceTemplate({
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
  const subject = activity.subject.toLowerCase();
  const isWriting =
    subject.includes("writing") ||
    subject.includes("journal") ||
    subject.includes("story") ||
    subject.includes("creative");

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
          <Text style={styles.promptBubbleText}>{activity.description}</Text>
          {activity.instructions.map((step, i) => (
            <Text key={i} style={styles.promptInstructionText}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        {/* Writing space: ruled lines for writing, large draw box for art/PE */}
        {isWriting ? (
          <>
            <Text style={styles.writingSpaceHeader}>My Writing Space</Text>
            {Array.from({ length: 16 }, (_, i) => (
              <View key={i} style={styles.writingLine} />
            ))}
          </>
        ) : (
          <View style={styles.drawBox}>
            <Text style={styles.drawBoxLabel}>Draw or write here</Text>
          </View>
        )}
      </View>
    </Page>
  );
}

// ── Dispatcher — picks the right template based on subject ───────────────────

function ActivityPage({
  activity,
  index,
  childName,
  mascotImageUrl,
}: {
  activity: PDFActivity;
  index: number;
  childName: string;
  mascotImageUrl?: string | null;
}) {
  const colors = ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];
  const subject = activity.subject.toLowerCase();

  const isReading =
    subject.includes("reading") || subject.includes("comprehension");
  const isCreative =
    subject.includes("writing") ||
    subject.includes("art") ||
    subject.includes("pe") ||
    subject.includes("creative") ||
    subject.includes("journal") ||
    subject.includes("story");

  if (isReading) {
    return (
      <ReadingTemplate
        activity={activity}
        colors={colors}
        childName={childName}
        mascotImageUrl={mascotImageUrl}
      />
    );
  }
  if (isCreative) {
    return (
      <OpenWorkspaceTemplate
        activity={activity}
        colors={colors}
        childName={childName}
        mascotImageUrl={mascotImageUrl}
      />
    );
  }
  return (
    <WorksheetTemplate
      activity={activity}
      colors={colors}
      childName={childName}
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
          {parentNote(childName, theme)}
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

function ReflectionPage({ childName, theme, createdAt }: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.notesPage}>
      <Text style={styles.notesPageTitle}>Daily Reflection</Text>
      <Text style={styles.notesPageSubtitle}>
        Take a moment to think about today's learning.
      </Text>

      <View style={styles.reflectionBox}>
        <Text style={styles.reflectionLabel}>Daily Reflection Question</Text>
        <Text style={styles.reflectionText}>
          {reflectionQuestion(theme)}
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

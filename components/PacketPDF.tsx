// Server-side only — do not import from client components.
// Used exclusively by app/api/generate-pdf/route.ts via createElement().

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.sage,
    letterSpacing: 2,
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
  // Mascot image — 300x300 square with contain fit
  mascotImageCover: {
    width: 300,
    height: 300,
    objectFit: "contain",
    marginBottom: 16,
    alignSelf: "center",
  },
  mascotNameText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
    fontSize: 32,
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
    fontFamily: "Helvetica-Oblique",
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
    fontFamily: "Helvetica-Bold",
  },
  activityBarTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: C.white,
    lineHeight: 1.3,
  },
  activityBarTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Oblique",
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.65,
  },

  // Instructions
  instructionsLabel: {
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
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
    flex: 1,
    marginTop: 18,
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  workAreaLabel: {
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  workLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: "dotted",
    borderBottomColor: "#D1D5DB",
    marginBottom: 36,
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Oblique",
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Oblique",
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
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Oblique",
  },
  observationsLabel: {
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    color: C.sage,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  coloringTitle: {
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Oblique",
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
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.6,
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
            {/* Mascot — 300x300 square, contain fit */}
            <Image src={mascotImageUrl} style={styles.mascotImageCover} />
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
            {greetingMessage(childName, theme)}
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
  const workLines = activity.answer_key ? 3 : 5;

  const pageStyle = [styles.activityPage, { backgroundColor: colors.bg }];
  const barStyle = [styles.activityBar, { backgroundColor: colors.bar }];
  const descBoxStyle = [
    styles.descriptionBox,
    { backgroundColor: C.white, borderLeftColor: colors.bar },
  ];
  const bulletBgStyle = [
    styles.instructionBullet,
    { backgroundColor: colors.bg + "CC" },
  ];
  const bulletTextStyle = [
    styles.instructionBulletText,
    { color: colors.bar },
  ];

  return (
    <Page size="LETTER" style={pageStyle}>
      {/* Colored top bar */}
      <View style={barStyle}>
        <Text style={styles.activityBarEmoji}>{""}</Text>
        <View style={styles.activityBarLeft}>
          <Text style={styles.activityBarSubject}>{activity.subject}</Text>
          <Text style={styles.activityBarTitle}>{activity.title}</Text>
        </View>
        <Text style={styles.activityBarTime}>
          {activity.estimated_minutes} min
        </Text>
        {/* Mascot — 80x80 circle in top-right of bar */}
        {mascotImageUrl && (
          <Image src={mascotImageUrl} style={styles.mascotImageCorner} />
        )}
      </View>

      {/* Mascot speech bubble */}
      {mascotImageUrl && (
        <View style={[styles.mascotSpeechBubble, { borderColor: colors.bar }]}>
          <Text style={styles.mascotSpeechText}>
            Let's go, {childName}! You've got this!
          </Text>
        </View>
      )}

      {/* Content area */}
      <View style={styles.activityContent}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>
              {activity.materials.join("  /  ")}
            </Text>
          </View>
        )}

        {/* Description */}
        <View style={descBoxStyle}>
          <Text style={styles.descriptionText}>{activity.description}</Text>
        </View>

        {/* Instructions */}
        <Text style={styles.instructionsLabel}>How to do it</Text>
        {activity.instructions.map((step, i) => (
          <View key={i} style={styles.instructionRow}>
            {/* Checkbox */}
            <View style={styles.instructionCheckbox} />
            {/* Numbered bullet */}
            <View style={bulletBgStyle}>
              <Text style={bulletTextStyle}>{i + 1}</Text>
            </View>
            <Text style={styles.instructionText}>{step}</Text>
          </View>
        ))}

        {/* Work area — dotted lines */}
        <View style={styles.workArea}>
          <Text style={styles.workAreaLabel}>Write your answer here:</Text>
          {Array.from({ length: workLines }, (_, i) => (
            <View key={i} style={styles.workLine} />
          ))}
        </View>

        {/* Bonus challenge */}
        <View style={styles.bonusChallengeBox}>
          <Text style={styles.bonusChallengeHeader}>BONUS CHALLENGE</Text>
          <Text style={styles.bonusChallengeText}>
            {bonusChallenge(activity.subject, activity.title)}
          </Text>
        </View>

        {/* Answer key */}
        {activity.answer_key && (
          <View style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>
              FOR GROWN-UPS ONLY
            </Text>
            <Text style={styles.answerKeyText}>{activity.answer_key}</Text>
          </View>
        )}
      </View>
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
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {activity.subject}:{" "}
              </Text>
              {activity.title} - {activity.estimated_minutes} min
            </Text>
            <Text style={styles.summaryCheckboxes}>[ ] [ ] [ ] [ ] [ ]</Text>
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

      {/* Reflection question */}
      <View style={styles.reflectionBox}>
        <Text style={styles.reflectionLabel}>Daily Reflection Question</Text>
        <Text style={styles.reflectionText}>
          {reflectionQuestion(theme)}
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
  mascotImageUrl,
}: {
  coloringPage: PDFColoringPage;
  mascotImageUrl?: string | null;
}) {
  return (
    <Page size="LETTER" style={styles.coloringPage}>
      {/* "Color me!" heading */}
      <Text style={styles.colorMeText}>Color me!</Text>

      {/* Title */}
      <Text style={styles.coloringTitle}>{coloringPage.title}</Text>

      {/* Coloring area — mascot fills most of the page */}
      <View style={styles.coloringBox}>
        {mascotImageUrl ? (
          <Image src={mascotImageUrl} style={styles.coloringBoxImage} />
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
      {props.activities.map((activity, i) => (
        <ActivityPage
          key={i}
          activity={activity}
          index={i}
          childName={props.childName}
          mascotImageUrl={props.mascotImageUrl}
        />
      ))}
      <ParentNotesPage {...props} />
      {props.coloringPage && (
        <ColoringPage
          coloringPage={props.coloringPage}
          mascotImageUrl={props.mascotImageUrl}
        />
      )}
    </Document>
  );
}

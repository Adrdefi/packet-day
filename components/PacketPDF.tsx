// Server-side only — do not import from client components.
// Used exclusively by app/api/generate-pdf/route.ts via createElement().

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// ─── Brand colors ─────────────────────────────────────────────────────────────

const C = {
  sage: "#4A7C59",
  sageDark: "#2E5238",
  sageBg: "#EFF6F1",
  honey: "#D4A843",
  honeyDark: "#A67C1E",
  honeyBg: "#FDF8EC",
  coral: "#E07A5F",
  coralBg: "#FDF1EE",
  cream: "#FDFBF7",
  dark: "#1A1A2E",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
  lightGray: "#F9FAFB",
};

const BAR_COLORS = [C.sage, C.honey, C.coral] as const;

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

export interface PacketPDFProps {
  childName: string;
  childEmoji: string;
  childGrade: string;
  theme: string;
  title: string;
  activities: PDFActivity[];
  createdAt: string;
  specialNotes?: string | null;
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
    `Every activity was made just for ${childName} — dive in whenever you're ready.`
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Pages ──────────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: C.cream,
    padding: 56,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  activityPage: {
    backgroundColor: C.white,
    flexDirection: "column",
  },
  notesPage: {
    backgroundColor: C.white,
    padding: 48,
    flexDirection: "column",
  },

  // ── Cover: top wordmark ────────────────────────────────────────────────────
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.sage,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── Cover: center block ────────────────────────────────────────────────────
  coverCenter: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  emojiText: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 20,
  },
  packetTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    color: C.dark,
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 1.35,
  },
  packetSubtitle: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginBottom: 32,
  },
  greetingBox: {
    borderWidth: 1.5,
    borderColor: C.sage,
    borderRadius: 10,
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

  // ── Cover: bottom ──────────────────────────────────────────────────────────
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

  // ── Activity: colored top bar ──────────────────────────────────────────────
  activityBar: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    justifyContent: "space-between",
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
    fontSize: 15,
    color: C.white,
  },
  activityBarTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Helvetica-Bold",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  // ── Activity: content area ─────────────────────────────────────────────────
  activityContent: {
    padding: 28,
    flex: 1,
    flexDirection: "column",
  },

  // Materials
  materialsBox: {
    backgroundColor: C.lightGray,
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
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

  // Description / intro box
  descriptionBox: {
    backgroundColor: C.sageBg,
    borderLeftWidth: 3,
    borderLeftColor: C.sage,
    borderRadius: 4,
    padding: 12,
    marginBottom: 18,
  },
  descriptionText: {
    fontSize: 10.5,
    color: C.sageDark,
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
  instructionBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.sageBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
    marginTop: 1,
  },
  instructionBulletText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.sage,
  },
  instructionText: {
    fontSize: 10.5,
    color: C.dark,
    lineHeight: 1.55,
    flex: 1,
  },

  // Work area
  workArea: {
    flex: 1,
    marginTop: 18,
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  workLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginBottom: 22,
  },

  // Answer key
  answerKeyBox: {
    backgroundColor: C.lightGray,
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  answerKeyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  answerKeyLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  answerKeyText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.6,
  },

  // ── Notes page ─────────────────────────────────────────────────────────────
  notesPageTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: C.dark,
    marginBottom: 6,
  },
  notesPageSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 24,
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
    marginBottom: 7,
  },
  summaryBullet: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.sage,
    marginRight: 8,
    marginTop: 1,
  },
  summaryText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
    flex: 1,
  },
  parentNoteBox: {
    backgroundColor: C.sageBg,
    borderRadius: 8,
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
    borderWidth: 1.5,
    borderColor: C.honey,
    borderRadius: 8,
    padding: 16,
    marginBottom: 22,
  },
  reflectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.honeyDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  reflectionText: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.7,
    fontFamily: "Helvetica-Oblique",
  },
  observationsLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: C.dark,
    marginBottom: 18,
  },
  ruledLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: C.border,
    marginBottom: 24,
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
});

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({
  childName,
  childEmoji,
  title,
  theme,
  createdAt,
}: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.coverPage}>
      {/* Top wordmark */}
      <View>
        <Text style={styles.wordmark}>Packet Day</Text>
      </View>

      {/* Center block */}
      <View style={styles.coverCenter}>
        <Text style={styles.emojiText}>{childEmoji}</Text>

        <Text style={styles.packetTitle}>{title}</Text>

        <Text style={styles.packetSubtitle}>
          A day of learning made just for {childName} •{" "}
          {formatPDFDate(createdAt)}
        </Text>

        {/* AI greeting box */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>
            {greetingMessage(childName, theme)}
          </Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>📦 Packet Day</Text>
        <Text style={styles.coverFooterDot}>  •  </Text>
        <Text style={styles.coverFooterText}>packetday.com</Text>
      </View>
    </Page>
  );
}

// ─── Activity page ────────────────────────────────────────────────────────────

function ActivityPage({
  activity,
  index,
}: {
  activity: PDFActivity;
  index: number;
}) {
  const barColor = BAR_COLORS[index % BAR_COLORS.length];
  const workLines = activity.answer_key ? 4 : 6;

  return (
    <Page size="LETTER" style={styles.activityPage}>
      {/* Colored top bar */}
      <View style={[styles.activityBar, { backgroundColor: barColor }]}>
        <View style={styles.activityBarLeft}>
          <Text style={styles.activityBarSubject}>{activity.subject}</Text>
          <Text style={styles.activityBarTitle}>{activity.title}</Text>
        </View>
        <Text style={styles.activityBarTime}>
          ⏱ {activity.estimated_minutes} min
        </Text>
      </View>

      {/* Content area */}
      <View style={styles.activityContent}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>Materials:</Text>
            <Text style={styles.materialsText}>
              {activity.materials.join("  ·  ")}
            </Text>
          </View>
        )}

        {/* Description / intro */}
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{activity.description}</Text>
        </View>

        {/* Instructions */}
        <Text style={styles.instructionsLabel}>How to do it</Text>
        {activity.instructions.map((step, i) => (
          <View key={i} style={styles.instructionRow}>
            <View style={styles.instructionBullet}>
              <Text style={styles.instructionBulletText}>{i + 1}</Text>
            </View>
            <Text style={styles.instructionText}>{step}</Text>
          </View>
        ))}

        {/* Work area — ruled lines for writing */}
        <View style={styles.workArea}>
          {Array.from({ length: workLines }, (_, i) => (
            <View key={i} style={styles.workLine} />
          ))}
        </View>

        {/* Answer key */}
        {activity.answer_key && (
          <View style={styles.answerKeyBox}>
            <View style={styles.answerKeyHeader}>
              <Text style={styles.answerKeyLabel}>
                🔒  Answer Key — Parents Only
              </Text>
            </View>
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
}: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.notesPage}>
      <Text style={styles.notesPageTitle}>Today's Packet at a Glance</Text>
      <Text style={styles.notesPageSubtitle}>
        {activities.length} activities •{" "}
        {activities.reduce((s, a) => s + a.estimated_minutes, 0)} min total
      </Text>

      {/* Activity summary */}
      <Text style={styles.sectionLabel}>Activity Summary</Text>
      {activities.map((activity, i) => (
        <View key={i} style={styles.summaryRow}>
          <Text style={styles.summaryBullet}>•</Text>
          <Text style={styles.summaryText}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {activity.subject}:{" "}
            </Text>
            {activity.title} — {activity.estimated_minutes} min
          </Text>
        </View>
      ))}

      {/* Parent note */}
      <View style={{ marginTop: 22, marginBottom: 6 }}>
        <Text style={styles.sectionLabel}>A Note for You</Text>
      </View>
      <View style={styles.parentNoteBox}>
        <Text style={styles.parentNoteText}>
          {parentNote(childName, theme)}
        </Text>
      </View>

      {/* Reflection question */}
      <View style={styles.reflectionBox}>
        <Text style={styles.reflectionLabel}>
          Daily Reflection Question
        </Text>
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
        <Text style={styles.footerText}>
          Made with love by Packet Day
        </Text>
        <Text style={styles.footerText}>
          packetday.com  •  {formatPDFDate(createdAt)}
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
        <ActivityPage key={i} activity={activity} index={i} />
      ))}
      <ParentNotesPage {...props} />
    </Document>
  );
}

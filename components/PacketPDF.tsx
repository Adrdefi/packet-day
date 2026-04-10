// Server-side only — do not import from client components.
// Used exclusively by app/api/generate-pdf/route.ts via createElement().

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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

function subjectEmoji(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("math")) return "🔢";
  if (s.includes("read")) return "📚";
  if (s.includes("writ")) return "✏️";
  if (s.includes("sci")) return "🔬";
  if (s.includes("hist") || s.includes("social")) return "🌍";
  if (s.includes("art")) return "🎨";
  if (s.includes("music")) return "🎵";
  if (s.includes("pe") || s.includes("physical") || s.includes("movement")) return "⚽";
  if (s.includes("creative")) return "💡";
  if (s.includes("nature") || s.includes("outdoor")) return "🌿";
  if (s.includes("independent") || s.includes("afternoon")) return "⭐";
  return "📖";
}

function themeEmojis(theme: string): string {
  const t = theme.toLowerCase();
  if (t.includes("dino") || t.includes("prehistoric") || t.includes("megalodon")) return "🦕  🌋  🦖  🌿  🦴";
  if (t.includes("space") || t.includes("planet") || t.includes("astro")) return "🚀  🌙  ⭐  🪐  🌌";
  if (t.includes("ocean") || t.includes("sea") || t.includes("shark") || t.includes("underwater")) return "🌊  🦈  🐙  🐠  🐋";
  if (t.includes("minecraft")) return "⛏️  🟫  🌲  💎  🗡️";
  if (t.includes("volcano")) return "🌋  🔥  🪨  💥  🌡️";
  if (t.includes("bug") || t.includes("insect") || t.includes("bee")) return "🐝  🦋  🐛  🌺  🍃";
  if (t.includes("castle") || t.includes("knight") || t.includes("medieval")) return "🏰  ⚔️  🛡️  👑  🐉";
  if (t.includes("bak") || t.includes("cook") || t.includes("food")) return "🍰  🧁  🥧  🥄  🍪";
  if (t.includes("art") || t.includes("paint")) return "🎨  🖌️  ✏️  🖼️  🌈";
  if (t.includes("music") || t.includes("song")) return "🎵  🎸  🥁  🎹  🎤";
  if (t.includes("animal") || t.includes("wildlife") || t.includes("jungle")) return "🦁  🐘  🦒  🐼  🦓";
  if (t.includes("egypt") || t.includes("pyramid") || t.includes("ancient")) return "🏺  🐫  👁️  🌙  🗝️";
  if (t.includes("robot") || t.includes("tech") || t.includes("code")) return "🤖  💻  ⚙️  🔧  🚀";
  if (t.includes("sport") || t.includes("soccer") || t.includes("baseball")) return "⚽  🏆  🎯  💪  🥇";
  if (t.includes("fairy") || t.includes("magic") || t.includes("unicorn")) return "🦄  🌟  🧚  ✨  🌈";
  return "⭐  📚  ✏️  🌟  🎉";
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
  themeEmojiRow: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 20,
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
  packetTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    color: C.dark,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 1.35,
  },
  packetSubtitle: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    marginBottom: 28,
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
    height: 80,
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
  activityContent: {
    padding: 28,
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
    fontSize: 10.5,
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
  instructionBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
    marginTop: 1,
    // backgroundColor set dynamically
  },
  instructionBulletText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    // color set dynamically
  },
  instructionText: {
    fontSize: 10.5,
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
  workLine: {
    borderBottomWidth: 1.5,
    borderBottomStyle: "dotted",
    borderBottomColor: "#D1D5DB",
    marginBottom: 26,
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
    borderWidth: 2,
    borderColor: C.honey,
    borderRadius: 10,
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
        {/* Theme emoji collage */}
        <Text style={styles.themeEmojiRow}>{themeEmojis(theme)}</Text>

        {/* Child avatar circle */}
        <View style={styles.childAvatarCircle}>
          <Text style={styles.childAvatarEmoji}>{childEmoji}</Text>
        </View>

        <Text style={styles.packetTitle}>{title}</Text>

        <Text style={styles.packetSubtitle}>
          A day of learning made just for {childName}  •  {formatPDFDate(createdAt)}
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
  const colors = ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];
  const workLines = activity.answer_key ? 4 : 6;

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
        <Text style={styles.activityBarEmoji}>{subjectEmoji(activity.subject)}</Text>
        <View style={styles.activityBarLeft}>
          <Text style={styles.activityBarSubject}>{activity.subject}</Text>
          <Text style={styles.activityBarTitle}>{activity.title}</Text>
        </View>
        <Text style={styles.activityBarTime}>
          {activity.estimated_minutes} min
        </Text>
      </View>

      {/* Content area */}
      <View style={styles.activityContent}>
        {/* Materials */}
        {activity.materials && activity.materials.length > 0 && (
          <View style={styles.materialsBox}>
            <Text style={styles.materialsLabel}>You'll need:</Text>
            <Text style={styles.materialsText}>
              {activity.materials.join("  ·  ")}
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
            <View style={bulletBgStyle}>
              <Text style={bulletTextStyle}>{i + 1}</Text>
            </View>
            <Text style={styles.instructionText}>{step}</Text>
          </View>
        ))}

        {/* Work area — dotted lines */}
        <View style={styles.workArea}>
          {Array.from({ length: workLines }, (_, i) => (
            <View key={i} style={styles.workLine} />
          ))}
        </View>

        {/* Answer key */}
        {activity.answer_key && (
          <View style={styles.answerKeyBox}>
            <Text style={styles.answerKeyHeader}>
              🔒  For Grown-Ups Only!
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
}: PacketPDFProps) {
  return (
    <Page size="LETTER" style={styles.notesPage}>
      <Text style={styles.notesPageTitle}>Today's Packet at a Glance</Text>
      <Text style={styles.notesPageSubtitle}>
        {activities.length} activities  •  {" "}
        {activities.reduce((s, a) => s + a.estimated_minutes, 0)} min total
      </Text>

      {/* Activity summary with color dots */}
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
              {activity.title} — {activity.estimated_minutes} min
            </Text>
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
